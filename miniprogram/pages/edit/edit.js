const app = getApp()
const store = require('../../utils/store')
const { getCategories } = require('../../utils/categories')
const { today } = require('../../utils/format')

const QUICK_AMOUNTS = ['10', '20', '50', '100', '200', '500']

Page({
  data: {
    id: '',
    isEdit: false,
    type: 'expense',
    amount: '',
    category: '',
    categories: [],
    date: '',
    note: '',
    quickAmounts: QUICK_AMOUNTS,
    initialized: false
  },

  onShow() {
    const editing = app.globalData.editingBill
    if (editing) {
      const categories = getCategories(editing.type)
      this.setData({
        id: editing.id,
        isEdit: true,
        type: editing.type,
        amount: String(Number(editing.amount).toFixed(2)),
        category: editing.category,
        categories: categories,
        date: editing.date,
        note: editing.note || '',
        initialized: true
      })
      app.globalData.editingBill = null
      return
    }

    if (!this.data.initialized) {
      this.resetForm()
    }
  },

  resetForm() {
    const categories = getCategories(this.data.type)
    this.setData({
      id: '',
      isEdit: false,
      amount: '',
      category: categories[0].name,
      categories: categories,
      date: today(),
      note: '',
      initialized: true
    })
  },

  onType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) {
      return
    }
    const categories = getCategories(type)
    this.setData({
      type: type,
      categories: categories,
      category: categories[0].name
    })
  },

  onAmount(e) {
    const value = e.detail.value
    // 限制两位小数
    const fixed = value.replace(/^(\d*\.\d{2})\d+$/, '$1')
    this.setData({ amount: fixed })
  },

  onQuickAmount(e) {
    const value = e.currentTarget.dataset.value
    const current = Number(this.data.amount) || 0
    const next = current + Number(value)
    this.setData({ amount: next.toFixed(2) })
  },

  onCategory(e) {
    this.setData({ category: e.currentTarget.dataset.name })
  },

  onDate(e) {
    this.setData({ date: e.detail.value })
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
  },

  onSave() {
    const amount = Number(this.data.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }

    const payload = {
      type: this.data.type,
      amount: Number(amount.toFixed(2)),
      category: this.data.category,
      date: this.data.date,
      note: this.data.note.trim()
    }

    if (this.data.isEdit) {
      store.updateBill(Object.assign({ id: this.data.id }, payload))
    } else {
      store.addBill(payload)
    }

    wx.showToast({
      title: this.data.isEdit ? '已更新' : '已记账',
      icon: 'success'
    })

    this.resetForm()
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 500)
  },

  onDelete() {
    wx.showModal({
      title: '删除这笔账？',
      content: '删除后不可恢复',
      confirmColor: '#ef5b6b',
      success: (res) => {
        if (res.confirm) {
          store.removeBill(this.data.id)
          this.resetForm()
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' })
          }, 500)
        }
      }
    })
  },

  onReset() {
    this.resetForm()
  }
})
