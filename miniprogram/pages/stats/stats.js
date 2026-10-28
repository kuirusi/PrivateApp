const store = require('../../utils/store')
const { getCategory } = require('../../utils/categories')
const chart = require('../../utils/chart')
const { nowMonth, money, monthLabel, shortMonthLabel, shiftMonth } = require('../../utils/format')

Page({
  data: {
    month: '',
    monthLabel: '',
    incomeText: '0.00',
    expenseText: '0.00',
    balanceText: '0.00',
    avgText: '0.00',
    maxText: '0.00',
    pieList: [],
    pieTotalText: '0.00',
    monthsLabel: '',
    empty: false
  },

  onLoad() {
    this.setData({ month: nowMonth() })
  },

  onShow() {
    if (this.data.month) {
      this.load()
    }
  },

  load() {
    const month = this.data.month
    const bills = store.getBillsByMonth(month)

    let income = 0
    let expense = 0
    const catMap = {}

    bills.forEach(function (bill) {
      const amount = Number(bill.amount) || 0
      if (bill.type === 'income') {
        income += amount
      } else {
        expense += amount
        catMap[bill.category] = (catMap[bill.category] || 0) + amount
      }
    })

    const pieData = Object.keys(catMap)
      .map((name) => ({
        label: name,
        value: Number(catMap[name].toFixed(2)),
        icon: getCategory('expense', name).icon,
        color: getCategory('expense', name).color
      }))
      .sort(function (a, b) {
        return b.value - a.value
      })

    const pieTotal = this.data.dirType === 'income' ? income : expense
    const pieList = pieData.map(function (item) {
      return Object.assign({}, item, {
        amountText: money(item.value),
        percent: pieTotal > 0 ? Math.round((item.value / pieTotal) * 1000) / 10 : 0
      })
    })

    // 单日最高支出
    const dayMap = {}
    bills.forEach(function (bill) {
      if (bill.type !== 'expense') {
        return
      }
      const amount = Number(bill.amount) || 0
      dayMap[bill.date] = (dayMap[bill.date] || 0) + amount
    })
    const maxValue = Object.keys(dayMap).reduce(function (max, d) {
      return Math.max(max, dayMap[d])
    }, 0)

    const days = Object.keys(dayMap).length
    const avg = days > 0 ? expense / days : 0

    const months = this.buildMonthTrend(month)
    this._trend = months.map(function (m) {
      const label = shortMonthLabel(m)
      const list = store.getBillsByMonth(m)
      let inc = 0
      let exp = 0
      list.forEach(function (b) {
        const amount = Number(b.amount) || 0
        if (b.type === 'income') {
          inc += amount
        } else {
          exp += amount
        }
      })
      return { label: label, income: Number(inc.toFixed(2)), expense: Number(exp.toFixed(2)) }
    })

    this.setData(
      {
        monthLabel: monthLabel(month),
        incomeText: money(income),
        expenseText: money(expense),
        balanceText: money(income - expense),
        avgText: money(avg),
        maxText: money(maxValue),
        pieTotalText: money(pieTotal),
        pieList: pieList,
        monthsLabel: months.map((m) => shortMonthLabel(m)).join(' / '),
        empty: bills.length === 0
      },
      () => {
        this.drawPie()
        this.drawTrend()
      }
    )
  },

  buildMonthTrend(month) {
    const list = []
    for (let i = 5; i >= 0; i--) {
      list.push(shiftMonth(month, -i))
    }
    return list
  },

  drawPie() {
    chart.render(this, 'pieCanvas', (ctx, w, h) => {
      const data = this.data.pieList.map(function (item) {
        return { label: item.label, value: item.value, color: item.color }
      })
      chart.drawDonut(ctx, w, h, data)
    })
  },

  drawTrend() {
    chart.render(this, 'trendCanvas', (ctx, w, h) => {
      chart.drawBars(ctx, w, h, this._trend || [])
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
  }
})
