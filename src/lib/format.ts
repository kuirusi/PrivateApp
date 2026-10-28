export function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export function dateToString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function today(): string {
  return dateToString(new Date())
}

export function nowMonth(): string {
  return today().slice(0, 7)
}

/** 1234.5 -> 1,234.50 */
export function money(value: number): string {
  const amount = Number(value) || 0
  const [int, decimal] = Math.abs(amount).toFixed(2).split('.')
  return `${amount < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimal}`
}

/** 带符号金额：负数显示为 -¥1,234.00 */
export function yuan(value: number): string {
  const amount = Number(value) || 0
  return amount < 0 ? `-¥${money(Math.abs(amount))}` : `¥${money(amount)}`
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-')
  return `${year}年${Number(m)}月`
}

export function shortMonthLabel(month: string): string {
  return `${Number(month.split('-')[1])}月`
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 2026-10-28 -> 今天 / 昨天 / 10月28日 周三 */
export function dayLabel(dateStr: string): string {
  const current = today()
  if (dateStr === current) {
    return '今天'
  }
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === dateToString(yesterday)) {
    return '昨天'
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `${month}月${day}日 ${WEEK[date.getDay()]}`
}

/** 2026-01 减 1 个月 -> 2025-12 */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}

export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function percent(part: number, total: number): number {
  if (!total) {
    return 0
  }
  return Math.round((part / total) * 1000) / 10
}
