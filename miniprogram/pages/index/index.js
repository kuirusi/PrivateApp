const app = getApp()
const store = require('../../utils/store')
const { getCategory } = require('../../utils/categories')
const { nowMonth, money, monthLabel, dayLabel, shiftMonth } = require('../../utils/format')

Page({
  data: {
    month: '',
    monthLabel: '',
    incomeText: '0.00',
    expenseText: '0.00',
    balanceText: '0.00',
    budget: 0,
    budgetText: '0.00',
    remainText: '0.00',
    percent: 0,
    overBudget: false,
    groups: [],
    total: 0,
    empty: false
  },

  onLoad() {
    this.setData({ month: nowMonth() })
    this.load()
  },

  onShow() {
    if (this.data.month) {
      this.load()
    }
  },

  load() {
    const settings = store.getSettings()
    const month = this.data.month
    const bills = store.getBillsByMonth(month)

    let income = 0
    let expense = 0
    const map = {}

    bills.forEach(function (bill) {
      const amount = Number(bill.amount) || 0
      if (bill.type === 'income') {
        income += amount
      } else {
        expense += amount
      }
      if (!map[bill.date]) {
        map[bill.date] = { date: bill.date, income: 0, expense: 0, items: [] }
      }
      const group = map[bill.date]
      if (bill.type === 'income') {
        group.income += amount
      } else {
        group.expense += amount
      }
      const cat = getCategory(bill.type, bill.category)
      group.items.push({
        id: bill.id,
        category: bill.category,
        note: bill.note,
        icon: cat.icon,
        color: cat.color,
        type: bill.type,
        amountText: money(amount)
      })
    })

    const groups = Object.keys(map)
      .sort(function (a, b) {
        return a < b ? 1 : -1
      })
      .map(function (date) {
        const g = map[date]
        return {
          date: date,
          label: dayLabel(date),
          incomeText: money(g.income),
          expenseText: money(g.expense),
          items: g.items
        }
      })

    const budget = Number(settings.budget) || 0
    const remain = budget - expense
    const percent = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0

    this.setData({
      monthLabel: monthLabel(month),
      incomeText: money(income),
      expenseText: money(expense),
      balanceText: money(income - expense),
      budget: budget,
      budgetText: money(budget),
      remainText: money(remain),
      percent: percent,
      overBudget: budget > 0 && remain < 0,
      groups: groups,
      total: bills.length,
      empty: bills.length === 0
    })
  },

  onMonthChange(e) {
    this.setData({ month: e.detail.value.slice(0, 7) }, () => this.load())
  },

  prevMonth() {
    this.setData({ month: shiftMonth(this.data.month, -1) }, () => this.load())
  },

  nextMonth() {
    this.setData({ month: shiftMonth(this.data.month, 1) }, () => this.load())
  },

  onEdit(e) {
    // 长按后手指离开可能同时触发 tap，这里做一次拦截
    if (this._longPressed) {
      this._longPressed = false
      return
    }
    const id = e.currentTarget.dataset.id
    const bill = store.getBillById(id)
    if (!bill) {
      return
    }
    app.globalData.editingBill = bill
    wx.switchTab({ url: '/pages/edit/edit' })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    this._longPressed = true
    clearTimeout(this._longPressTimer)
    this._longPressTimer = setTimeout(() => {
      this._longPressed = false
    }, 1000)
    wx.showModal({
      title: '删除这笔账？',
      content: '删除后不可恢复',
      confirmColor: '#ef5b6b',
      success: (res) => {
        if (res.confirm) {
          store.removeBill(id)
          this.load()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  goEdit() {
    app.globalData.editingBill = null
    wx.switchTab({ url: '/pages/edit/edit' })
  }
})
