/**
 * 无头业务测试
 * 运行： node test/run.js
 */
const fs = require('fs')
const path = require('path')
const h = require('./harness')

const { eq, ok, near, wait, suite, run, state } = h
const store = require(path.join(h.ROOT, 'utils/store'))
const format = require(path.join(h.ROOT, 'utils/format'))
const categories = require(path.join(h.ROOT, 'utils/categories'))
const chart = require(path.join(h.ROOT, 'utils/chart'))

function freshApp() {
  h.resetAll()
  return h.loadApp()
}

function dateOf(month, day) {
  return month + '-' + (day < 10 ? '0' + day : '' + day)
}

function makeCtx() {
  const ctx = {
    fills: [],
    texts: [],
    arcs: 0,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    strokeStyle: ''
  }
  const noop = function () {}
  ctx.beginPath = noop
  ctx.closePath = noop
  ctx.moveTo = noop
  ctx.lineTo = noop
  ctx.arcTo = noop
  ctx.save = noop
  ctx.restore = noop
  ctx.translate = noop
  ctx.stroke = noop
  ctx.clearRect = noop
  ctx.scale = noop
  ctx.arc = function () {
    ctx.arcs += 1
  }
  ctx.fill = function () {
    ctx.fills.push(ctx.fillStyle)
  }
  ctx.fillText = function (text) {
    ctx.texts.push(text)
  }
  return ctx
}

/* ------------------------------ 存储层 ------------------------------ */

suite('工具层 · store', async function (t) {
  await t('init 初始化空账单与默认设置', function () {
    freshApp()
    eq(store.getBills(), [])
    eq(store.getSettings(), { budget: 0 })
  })

  await t('addBill 自动生成 id 与 createdAt', function () {
    freshApp()
    const bill = store.addBill({
      type: 'expense',
      amount: 10,
      category: '餐饮',
      date: '2026-10-01',
      note: '午饭'
    })
    ok(bill.id, 'id')
    ok(bill.createdAt > 0, 'createdAt')
    eq(store.getBills().length, 1)
  })

  await t('updateBill 按 id 合并字段', function () {
    freshApp()
    const bill = store.addBill({
      type: 'expense',
      amount: 10,
      category: '餐饮',
      date: '2026-10-01',
      note: ''
    })
    store.updateBill({ id: bill.id, amount: 66, note: '改过' })
    const saved = store.getBillById(bill.id)
    eq(saved.amount, 66)
    eq(saved.note, '改过')
    eq(saved.category, '餐饮')
    eq(store.getBills().length, 1)
  })

  await t('removeBill 按 id 删除', function () {
    freshApp()
    const a = store.addBill({ type: 'expense', amount: 1, category: '餐饮', date: '2026-10-01' })
    const b = store.addBill({ type: 'expense', amount: 2, category: '餐饮', date: '2026-10-02' })
    store.removeBill(a.id)
    eq(store.getBills().length, 1)
    eq(store.getBills()[0].id, b.id)
  })

  await t('getBillsByMonth 过滤月份并按日期倒序', function () {
    freshApp()
    store.addBill({ type: 'expense', amount: 1, category: '餐饮', date: '2026-09-30' })
    store.addBill({ type: 'expense', amount: 2, category: '餐饮', date: '2026-10-01' })
    store.addBill({ type: 'income', amount: 3, category: '工资', date: '2026-10-20' })
    const list = store.getBillsByMonth('2026-10')
    eq(list.length, 2)
    eq(list[0].date, '2026-10-20')
    eq(list[1].date, '2026-10-01')
  })

  await t('saveSettings 局部更新不影响其它字段', function () {
    freshApp()
    store.saveSettings({ budget: 3000 })
    eq(store.getSettings().budget, 3000)
    store.saveSettings({ budget: 500 })
    eq(store.getSettings().budget, 500)
  })
})

/* ------------------------------ 格式化 ------------------------------ */

suite('工具层 · format', async function (t) {
  await t('money 千分位 + 两位小数', function () {
    eq(format.money(1234.5), '1,234.50')
    eq(format.money(-1234.567), '-1,234.57')
    eq(format.money(0), '0.00')
    eq(format.money('88'), '88.00')
    eq(format.money(null), '0.00')
  })

  await t('shiftMonth 处理跨年', function () {
    eq(format.shiftMonth('2026-01', -1), '2025-12')
    eq(format.shiftMonth('2026-12', 1), '2027-01')
    eq(format.shiftMonth('2026-10', 0), '2026-10')
  })

  await t('月份文案', function () {
    eq(format.monthLabel('2026-03'), '2026年3月')
    eq(format.shortMonthLabel('2026-12'), '12月')
  })

  await t('dayLabel 今天/昨天/普通日期', function () {
    eq(format.dayLabel(format.today()), '今天')
    eq(format.dayLabel('2020-01-01'), '1月1日 周三')
    eq(format.dayLabel('2020-03-08'), '3月8日 周日')
  })
})

/* ------------------------------ 分类 ------------------------------ */

suite('工具层 · categories', async function (t) {
  await t('支出 10 类 / 收入 6 类，均带图标与颜色', function () {
    const expense = categories.getCategories('expense')
    const income = categories.getCategories('income')
    eq(expense.length, 10)
    eq(income.length, 6)
    ok(expense[0].icon && expense[0].color, '支出分类字段')
    ok(income[0].icon && income[0].color, '收入分类字段')
  })

  await t('getCategory 命中与未知分类兜底', function () {
    eq(categories.getCategory('expense', '餐饮').icon, '🍜')
    const unknown = categories.getCategory('expense', '神秘分类')
    eq(unknown.name, '神秘分类')
    ok(unknown.icon, '未知分类应有兜底图标')
  })
})

/* ------------------------------ 图表绘制 ------------------------------ */

suite('工具层 · chart', async function (t) {
  await t('drawDonut 每个分类绘制一个扇形', function () {
    const ctx = makeCtx()
    chart.drawDonut(ctx, 300, 300, [
      { label: '餐饮', value: 60, color: '#ff0000' },
      { label: '交通', value: 40, color: '#00ff00' }
    ])
    eq(ctx.fills.length, 2)
    eq(ctx.fills[0], '#ff0000')
    eq(ctx.fills[1], '#00ff00')
    eq(ctx.arcs, 4)
  })

  await t('drawDonut 无数据时绘制占位文案', function () {
    const ctx = makeCtx()
    chart.drawDonut(ctx, 300, 300, [])
    eq(ctx.fills.length, 1)
    eq(ctx.texts[0], '暂无数据')
  })

  await t('drawBars 收入/支出双柱 + 月份标签', function () {
    const ctx = makeCtx()
    chart.drawBars(ctx, 300, 200, [{ label: '10月', income: 100, expense: 50 }])
    eq(ctx.fills.length, 2)
    eq(ctx.texts[0], '10月')
  })

  await t('drawBars 金额为 0 的柱不绘制', function () {
    const ctx = makeCtx()
    chart.drawBars(ctx, 300, 200, [{ label: '10月', income: 0, expense: 50 }])
    eq(ctx.fills.length, 1)
  })
})

/* ------------------------------ 明细页 ------------------------------ */

suite('页面 · 明细 index', async function (t) {
  function seedCurrentMonth() {
    const month = format.nowMonth()
    store.addBill({ type: 'expense', amount: 100.5, category: '餐饮', date: dateOf(month, 1) })
    store.addBill({ type: 'expense', amount: 49.5, category: '交通', date: dateOf(month, 15) })
    store.addBill({ type: 'income', amount: 1000, category: '工资', date: dateOf(month, 15) })
    return month
  }

  await t('按日分组并统计本月收支与结余', function () {
    freshApp()
    const month = seedCurrentMonth()
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    eq(page.data.month, month)
    eq(page.data.expenseText, '150.00')
    eq(page.data.incomeText, '1,000.00')
    eq(page.data.balanceText, '850.00')
    eq(page.data.total, 3)
    eq(page.data.groups.length, 2)
    eq(page.data.groups[0].date, dateOf(month, 15))
    eq(page.data.groups[0].items.length, 2)
    eq(page.data.groups[1].items[0].amountText, '100.50')
    eq(page.data.empty, false)
  })

  await t('无数据月份显示空态', function () {
    freshApp()
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    eq(page.data.empty, true)
    eq(page.data.groups.length, 0)
  })

  await t('预算进度：未超支', function () {
    freshApp()
    seedCurrentMonth()
    store.saveSettings({ budget: 200 })
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    eq(page.data.percent, 75)
    eq(page.data.remainText, '50.00')
    eq(page.data.overBudget, false)
  })

  await t('预算进度：超支时进度封顶 100%', function () {
    freshApp()
    seedCurrentMonth()
    store.saveSettings({ budget: 100 })
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    eq(page.data.percent, 100)
    eq(page.data.remainText, '-50.00')
    eq(page.data.overBudget, true)
  })

  await t('点击账单进入编辑态并跳转', function () {
    freshApp()
    seedCurrentMonth()
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    const id = page.data.groups[0].items[0].id
    page.onEdit({ currentTarget: { dataset: { id: id } } })
    eq(h.getApp().globalData.editingBill.id, id)
    eq(state.switchTabs[state.switchTabs.length - 1], '/pages/edit/edit')
  })

  await t('长按删除确认后移除账单', function () {
    freshApp()
    seedCurrentMonth()
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    const id = page.data.groups[0].items[0].id
    state.modalReplies.push({ confirm: true })
    page.onDelete({ currentTarget: { dataset: { id: id } } })
    eq(store.getBills().length, 2)
    eq(state.toasts[state.toasts.length - 1], '已删除')
  })

  await t('切换上/下月与月份选择器', function () {
    freshApp()
    const page = h.loadPage('pages/index/index.js')
    page.onLoad()
    const current = page.data.month
    page.prevMonth()
    eq(page.data.month, format.shiftMonth(current, -1))
    page.nextMonth()
    eq(page.data.month, current)
    page.onMonthChange({ detail: { value: '2025-03-01' } })
    eq(page.data.month, '2025-03')
  })
})

/* ------------------------------ 记账页 ------------------------------ */

suite('页面 · 记账 edit', async function (t) {
  await t('默认状态：支出 / 今天 / 首个分类', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    eq(page.data.type, 'expense')
    eq(page.data.date, format.today())
    eq(page.data.category, '餐饮')
    eq(page.data.categories.length, 10)
    eq(page.data.isEdit, false)
  })

  await t('金额为 0 时拦截并提示', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.onSave()
    eq(state.toasts[state.toasts.length - 1], '请输入金额')
    eq(store.getBills().length, 0)
  })

  await t('保存新增账单并跳回明细', async function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.onCategory({ currentTarget: { dataset: { name: '交通' } } })
    page.setData({ amount: '25.5', note: ' 打车 ' })
    page.onSave()
    const bills = store.getBills()
    eq(bills.length, 1)
    eq(bills[0].amount, 25.5)
    eq(bills[0].category, '交通')
    eq(bills[0].note, '打车')
    eq(bills[0].type, 'expense')
    eq(page.data.amount, '', '保存后应重置表单')
    await wait(600)
    eq(state.switchTabs[state.switchTabs.length - 1], '/pages/index/index')
  })

  await t('从列表进入编辑：回填并更新原账单', function () {
    const app = freshApp()
    const bill = store.addBill({
      type: 'expense',
      amount: 88,
      category: '购物',
      date: '2026-10-02',
      note: '鞋'
    })
    app.globalData.editingBill = store.getBillById(bill.id)
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    eq(page.data.isEdit, true)
    eq(page.data.amount, '88.00')
    eq(page.data.category, '购物')
    eq(page.data.note, '鞋')
    eq(app.globalData.editingBill, null)

    page.setData({ amount: '99' })
    page.onSave()
    eq(store.getBills().length, 1)
    eq(store.getBills()[0].amount, 99)
  })

  await t('编辑态删除账单', function () {
    const app = freshApp()
    const bill = store.addBill({
      type: 'expense',
      amount: 12,
      category: '餐饮',
      date: '2026-10-03',
      note: ''
    })
    app.globalData.editingBill = bill
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    state.modalReplies.push({ confirm: true })
    page.onDelete()
    eq(store.getBills().length, 0)
    eq(page.data.isEdit, false)
  })

  await t('切换收入类型时重置分类集合', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.onType({ currentTarget: { dataset: { type: 'income' } } })
    eq(page.data.type, 'income')
    eq(page.data.categories.length, 6)
    eq(page.data.category, '工资')
    page.onType({ currentTarget: { dataset: { type: 'expense' } } })
    eq(page.data.category, '餐饮')
  })

  await t('输入金额最多两位小数', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.onAmount({ detail: { value: '12.3456' } })
    eq(page.data.amount, '12.34')
    page.onAmount({ detail: { value: '7' } })
    eq(page.data.amount, '7')
  })

  await t('快捷金额累加', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.setData({ amount: '10' })
    page.onQuickAmount({ currentTarget: { dataset: { value: '20' } } })
    eq(page.data.amount, '30.00')
    page.onQuickAmount({ currentTarget: { dataset: { value: '50' } } })
    eq(page.data.amount, '80.00')
  })

  await t('清空重填恢复默认表单', function () {
    freshApp()
    const page = h.loadPage('pages/edit/edit.js')
    page.onShow()
    page.setData({ amount: '99', note: '备注' })
    page.onReset()
    eq(page.data.amount, '')
    eq(page.data.note, '')
    eq(page.data.date, format.today())
  })
})

/* ------------------------------ 统计页 ------------------------------ */

suite('页面 · 统计 stats', async function (t) {
  await t('汇总、分类占比、近 6 月趋势', async function () {
    freshApp()
    const month = format.nowMonth()
    store.addBill({ type: 'expense', amount: 100, category: '餐饮', date: dateOf(month, 1) })
    store.addBill({ type: 'expense', amount: 300, category: '交通', date: dateOf(month, 2) })
    store.addBill({ type: 'income', amount: 1000, category: '工资', date: dateOf(month, 10) })

    const page = h.loadPage('pages/stats/stats.js')
    page.onLoad()
    page.onShow()

    eq(page.data.expenseText, '400.00')
    eq(page.data.incomeText, '1,000.00')
    eq(page.data.balanceText, '600.00')
    eq(page.data.pieTotalText, '400.00')
    eq(page.data.maxText, '300.00')
    eq(page.data.avgText, '200.00')

    eq(page.data.pieList.length, 2)
    eq(page.data.pieList[0].label, '交通')
    eq(page.data.pieList[0].percent, 75)
    eq(page.data.pieList[1].percent, 25)

    eq(page.data.monthsLabel.split(' / ').length, 6)
    eq(page.data.monthsLabel.split(' / ')[5], format.shortMonthLabel(month))
    eq(page.data.empty, false)

    await wait(40)
    eq(state.canvases.length, 2)
    const pieFills = state.canvases[0].ctx.calls.filter(function (c) {
      return c[0] === 'fill'
    })
    eq(pieFills.length, 2)
    ok(
      pieFills.some(function (c) {
        return c[1] === categories.getCategory('expense', '交通').color
      }),
      '饼图应使用分类颜色'
    )
  })

  await t('无数据月份显示空态', function () {
    freshApp()
    const page = h.loadPage('pages/stats/stats.js')
    page.onLoad()
    page.onShow()
    eq(page.data.empty, true)
    eq(page.data.expenseText, '0.00')
  })

  await t('切换月份重新统计', function () {
    freshApp()
    const month = format.nowMonth()
    store.addBill({ type: 'expense', amount: 50, category: '餐饮', date: dateOf(month, 3) })
    const page = h.loadPage('pages/stats/stats.js')
    page.onLoad()
    page.onShow()
    eq(page.data.expenseText, '50.00')
    page.prevMonth()
    eq(page.data.month, format.shiftMonth(month, -1))
    eq(page.data.expenseText, '0.00')
    page.nextMonth()
    eq(page.data.expenseText, '50.00')
  })
})

/* ------------------------------ 我的页 ------------------------------ */

suite('页面 · 我的 mine', async function (t) {
  await t('保存月度预算', function () {
    freshApp()
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    page.onBudgetInput({ detail: { value: '1200' } })
    page.onSaveBudget()
    eq(store.getSettings().budget, 1200)
    eq(page.data.budget, '1200')
  })

  await t('非法预算金额被拦截', function () {
    freshApp()
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    page.onBudgetInput({ detail: { value: 'abc' } })
    page.onSaveBudget()
    eq(store.getSettings().budget, 0)
    eq(state.toasts[state.toasts.length - 1], '请输入有效金额')
  })

  await t('生成示例数据并刷新总览', function () {
    freshApp()
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    state.modalReplies.push({ confirm: true })
    page.onSeed()
    ok(store.getBills().length >= 90, '示例数据应不少于 90 笔，实际 ' + store.getBills().length)
    eq(page.data.totalCount, store.getBills().length)
    ok(page.data.monthCount >= 3, '应覆盖至少 3 个月')
  })

  await t('导出数据写入剪贴板', function () {
    freshApp()
    store.addBill({ type: 'expense', amount: 9.9, category: '餐饮', date: dateOf(format.nowMonth(), 5) })
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    page.onExport()
    const parsed = JSON.parse(state.clipboard)
    eq(parsed.length, 1)
    eq(parsed[0].amount, 9.9)
  })

  await t('导入数据覆盖原账目并做字段归一化', function () {
    freshApp()
    store.addBill({ type: 'expense', amount: 1, category: '餐饮', date: '2026-10-01' })
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()

    const payload = JSON.stringify([
      { type: 'income', amount: '500', category: '工资', date: '2026-09-10' },
      { type: 'bad', amount: 20 }
    ])
    state.modalReplies.push({ confirm: true, content: payload })
    page.onImport()

    const bills = store.getBills()
    eq(bills.length, 2)
    eq(bills[0].type, 'income')
    eq(bills[0].amount, 500)
    eq(bills[0].note, '')
    eq(bills[1].type, 'expense')
    eq(bills[1].category, '其他')
    eq(bills[1].date, format.today())
    eq(state.toasts[state.toasts.length - 1], '导入成功')
  })

  await t('导入非法 JSON 给出提示且不破坏原数据', function () {
    freshApp()
    store.addBill({ type: 'expense', amount: 1, category: '餐饮', date: '2026-10-01' })
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    state.modalReplies.push({ confirm: true, content: 'not-json' })
    page.onImport()
    eq(state.toasts[state.toasts.length - 1], '数据格式不正确')
    eq(store.getBills().length, 1)
  })

  await t('清空所有账目', function () {
    freshApp()
    store.addBill({ type: 'expense', amount: 1, category: '餐饮', date: '2026-10-01' })
    const page = h.loadPage('pages/mine/mine.js')
    page.onShow()
    state.modalReplies.push({ confirm: true })
    page.onClear()
    eq(store.getBills().length, 0)
    eq(page.data.totalCount, 0)
  })
})

/* ------------------------------ 工程文件 ------------------------------ */

function walkFiles(dir, ext) {
  const out = []
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === 'test' || entry.name === 'node_modules' || entry.name.charAt(0) === '.') {
      return
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push.apply(out, walkFiles(full, ext))
    } else if (entry.name.slice(-ext.length) === ext) {
      out.push(full)
    }
  })
  return out
}

const VOID_TAGS = ['input', 'image', 'icon', 'progress', 'slider', 'switch', 'radio', 'checkbox']

function checkWxml(file) {
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  const stack = []
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
  let match
  while ((match = tagRe.exec(text))) {
    const closing = match[1] === '/'
    const tag = match[2]
    const selfClose = match[4] === '/'
    if (VOID_TAGS.indexOf(tag) > -1 || selfClose) {
      continue
    }
    if (closing) {
      const open = stack.pop()
      if (open !== tag) {
        return '标签不匹配：期望 </' + open + '>，实际 </' + tag + '>'
      }
    } else {
      stack.push(tag)
    }
  }
  if (stack.length) {
    return '存在未闭合标签：<' + stack.join('>, <') + '>'
  }
  return ''
}

suite('工程 · 配置与模板', async function (t) {
  await t('所有 json 文件格式合法', function () {
    const files = walkFiles(h.ROOT, '.json')
    ok(files.length >= 5, 'json 文件数量异常')
    files.forEach(function (file) {
      try {
        JSON.parse(fs.readFileSync(file, 'utf8'))
      } catch (e) {
        throw new Error(path.relative(h.ROOT, file) + ' 解析失败: ' + e.message)
      }
    })
  })

  await t('app.json 页面四件套齐全，tabBar 页面已注册', function () {
    const appJson = JSON.parse(fs.readFileSync(path.join(h.ROOT, 'app.json'), 'utf8'))
    appJson.pages.forEach(function (page) {
      ;['js', 'json', 'wxml', 'wxss'].forEach(function (ext) {
        const file = path.join(h.ROOT, page + '.' + ext)
        ok(fs.existsSync(file), page + '.' + ext + ' 缺失')
      })
    })
    appJson.tabBar.list.forEach(function (item) {
      ok(appJson.pages.indexOf(item.pagePath) > -1, 'tabBar 页面未在 pages 中注册: ' + item.pagePath)
    })
    eq(appJson.tabBar.list.length <= 5, true, 'tabBar 最多 5 项')
  })

  await t('所有 wxml 标签闭合正确', function () {
    const files = walkFiles(h.ROOT, '.wxml')
    ok(files.length >= 4, 'wxml 文件数量异常')
    files.forEach(function (file) {
      const error = checkWxml(file)
      if (error) {
        throw new Error(path.relative(h.ROOT, file) + ' → ' + error)
      }
    })
  })

  await t('wxml 中绑定的事件处理函数都存在', function () {
    const appJson = JSON.parse(fs.readFileSync(path.join(h.ROOT, 'app.json'), 'utf8'))
    const missing = []
    appJson.pages.forEach(function (pagePath) {
      freshApp()
      const page = h.loadPage(pagePath + '.js')
      const wxml = fs.readFileSync(path.join(h.ROOT, pagePath + '.wxml'), 'utf8')
      const re = /(?:bind|catch)[:]?([a-zA-Z]+)="([^"{}]+)"/g
      let m
      while ((m = re.exec(wxml))) {
        const handler = m[2].trim()
        if (typeof page[handler] !== 'function') {
          missing.push(pagePath + ' → ' + handler)
        }
      }
    })
    eq(missing, [])
  })

  await t('页面 data 字段与 wxml 引用的变量基本对齐（无未定义渲染变量）', function () {
    const appJson = JSON.parse(fs.readFileSync(path.join(h.ROOT, 'app.json'), 'utf8'))
    const problems = []
    appJson.pages.forEach(function (pagePath) {
      freshApp()
      const page = h.loadPage(pagePath + '.js')
      const wxml = fs.readFileSync(path.join(h.ROOT, pagePath + '.wxml'), 'utf8')
      const re = /\{\{([^}]+)\}\}/g
      let m
      const ignored = ['item', 'index', 'bill', 'cat', 'true', 'false', 'null', 'undefined']
      while ((m = re.exec(wxml))) {
        const expr = m[1]
        const idents = expr.match(/(^|[^.\w'"])([a-zA-Z_$][\w$]*)/g) || []
        idents.forEach(function (raw) {
          const name = raw.replace(/^[^a-zA-Z_$]+/, '')
          if (!name || ignored.indexOf(name) > -1) {
            return
          }
          if (['true', 'false', 'length', 'trim'].indexOf(name) > -1) {
            return
          }
          if (!(name in page.data) && typeof page[name] !== 'function') {
            problems.push(pagePath + ' → ' + name)
          }
        })
      }
    })
    eq(problems, [])
  })
})

run()
  .then(function (success) {
    process.exit(success ? 0 : 1)
  })
  .catch(function (e) {
    console.error(e)
    process.exit(1)
  })
