function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function dateToString(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function today() {
  return dateToString(new Date())
}

function nowMonth() {
  return today().slice(0, 7)
}

/** 数字格式化：1234.5 -> 1,234.50 */
function money(value) {
  const n = Number(value) || 0
  const parts = Math.abs(n).toFixed(2).split('.')
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + int + '.' + parts[1]
}

function monthLabel(month) {
  const arr = String(month).split('-')
  return arr[0] + '年' + Number(arr[1]) + '月'
}

function shortMonthLabel(month) {
  return Number(String(month).split('-')[1]) + '月'
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 2026-10-28 -> 今天 / 昨天 / 10月28日 周三 */
function dayLabel(dateStr) {
  const todayStr = today()
  if (dateStr === todayStr) {
    return '今天'
  }
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (dateStr === dateToString(y)) {
    return '昨天'
  }
  const parts = String(dateStr).split('-')
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return Number(parts[1]) + '月' + Number(parts[2]) + '日 ' + WEEK[d.getDay()]
}

/** 月份加减：2026-01 - 1 => 2025-12 */
function shiftMonth(month, delta) {
  const arr = String(month).split('-')
  const d = new Date(Number(arr[0]), Number(arr[1]) - 1 + delta, 1)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1)
}

module.exports = {
  pad,
  today,
  nowMonth,
  money,
  monthLabel,
  shortMonthLabel,
  dayLabel,
  shiftMonth
}
