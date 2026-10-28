const store = require('../../utils/store')
const { getCategories } = require('../../utils/categories')
const { today, money, pad } = require('../../utils/format')

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(list) {
  return list[randInt(0, list.length - 1)]
}

Page({
  data: {
    budget: '',
    totalCount: 0,
    monthCount: 0,
    firstDate: '暂无',
    lastDate: '暂无',
    expenseText: '0.00',
    incomeText: '0.00'
  },

  onShow() {
    this.load()
  },

  load() {
    const settings = store.getSettings()
    const bills = store.getBills()
    let income = 0
    let expense = 0
    bills.forEach(function (b) {
      const amount = Number(b.amount) || 0
      if (b.type === 'income') {
        income += amount
      } else {
        expense += amount
      }
    })

    const dates = bills
      .map(function (b) {
        return b.date
      })
      .sort()

    const months = {}
    bills.forEach(function (b) {
      months[String(b.date).slice(0, 7)] = true
    })

    this.setData({
      budget: Number(settings.budget) > 0 ? String(settings.budget) : '',
      totalCount: bills.length,
      monthCount: Object.keys(months).length,
      firstDate: dates.length ? dates[0] : '暂无',
      lastDate: dates.length ? dates[dates.length - 1] : '暂无',
      incomeText: money(income),
      expenseText: money(expense)
    })
  },

  onBudgetInput(e) {
    this.setData({ budget: e.detail.value })
  },

  onSaveBudget() {
    const value = Number(this.data.budget)
    if (isNaN(value) || value < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    store.saveSettings({ budget: Number(value.toFixed(2)) })
    wx.showToast({ title: '已保存', icon: 'success' })
    this.load()
  },

  /** 生成最近 3 个月的示例账目，方便查看图表效果 */
  onSeed() {
    wx.showModal({
      title: '生成示例数据',
      content: '将在最近 3 个月随机生成约 60 笔账目，会追加在现有数据之后',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        const expenseCats = getCategories('expense')
        const incomeCats = getCategories('income')
        const now = new Date()
        const list = store.getBills()

        const push = function (date, type, category, amount, note) {
          list.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            type: type,
            amount: Number(amount.toFixed(2)),
            category: category.name,
            date: date,
            note: note,
            createdAt: Date.now() + randInt(0, 999)
          })
        }

        for (let i = 0; i < 90; i++) {
          const d = new Date(now.getTime() - i * 86400000)
          const dateStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())

          if (d.getDate() === 10) {
            push(dateStr, 'income', incomeCats[0], randInt(8000, 15000), '月薪到账')
          }
          if (d.getDate() === randInt(1, 28)) {
            const c = pick(incomeCats)
            if (Math.random() > 0.6) {
              push(dateStr, 'income', c, Number((Math.random() * 800 + 50).toFixed(2)), '额外收入')
            }
          }
          const count = randInt(1, 3)
          for (let j = 0; j < count; j++) {
            const c = pick(expenseCats)
            push(dateStr, 'expense', c, Number((Math.random() * 260 + 8).toFixed(2)), '')
          }
        }

        store.saveBills(list)
        wx.showToast({ title: '已生成示例数据', icon: 'success' })
        this.load()
      }
    })
  },

  onExport() {
    const bills = store.getBills()
    if (!bills.length) {
      wx.showToast({ title: '暂无数据可导出', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: JSON.stringify(bills),
      success() {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },

  onImport() {
    wx.showModal({
      title: '导入数据',
      content: '粘贴此前导出的 JSON 数据\n（导入将覆盖现有全部账目）',
      editable: true,
      placeholderText: '[{"type":"expense","amount":10,...}]',
      success: (res) => {
        if (!res.confirm || !res.content) {
          return
        }
        try {
          const list = JSON.parse(res.content)
          if (!Array.isArray(list)) {
            throw new Error('格式错误')
          }
          const normalized = list.map(function (item) {
            return {
              id: item.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              type: item.type === 'income' ? 'income' : 'expense',
              amount: Number(item.amount) || 0,
              category: item.category || '其他',
              date: item.date || today(),
              note: item.note || '',
              createdAt: item.createdAt || Date.now()
            }
          })
          store.saveBills(normalized)
          wx.showToast({ title: '导入成功', icon: 'success' })
          this.load()
        } catch (e) {
          wx.showToast({ title: '数据格式不正确', icon: 'none' })
        }
      }
    })
  },

  onClear() {
    wx.showModal({
      title: '清空所有账目',
      content: '此操作不可恢复，建议先导出备份',
      confirmColor: '#ef5b6b',
      success: (res) => {
        if (res.confirm) {
          store.clearBills()
          wx.showToast({ title: '已清空', icon: 'success' })
          this.load()
        }
      }
    })
  }
})
