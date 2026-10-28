import type { Bill } from '../types'
import { daysInMonth } from './format'

export interface OverspendInfo {
  expense: number
  budget: number
  over: number
  /** 支出 / 预算 */
  ratio: number
  /** 单日支出超过「日均预算」的天数 */
  overDays: number
  maxDayExpense: number
  topCategory: { name: string; value: number; share: number } | null
}

/** 计算某个月相对预算的超支情况，未超支或未设置预算返回 null */
export function computeOverspend(bills: Bill[], budget: number, month: string): OverspendInfo | null {
  if (!Number.isFinite(budget) || budget <= 0) {
    return null
  }

  let expense = 0
  const dayTotals = new Map<string, number>()
  const categoryTotals = new Map<string, number>()

  bills.forEach((bill) => {
    if (bill.type !== 'expense' || bill.date.slice(0, 7) !== month) {
      return
    }
    expense += bill.amount
    dayTotals.set(bill.date, (dayTotals.get(bill.date) ?? 0) + bill.amount)
    categoryTotals.set(bill.category, (categoryTotals.get(bill.category) ?? 0) + bill.amount)
  })

  if (expense <= budget) {
    return null
  }

  const dailyBudget = budget / daysInMonth(month)
  const overDays = Array.from(dayTotals.values()).filter((total) => total > dailyBudget).length
  const maxDayExpense = Array.from(dayTotals.values()).reduce((max, total) => Math.max(max, total), 0)

  const top = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]

  return {
    expense,
    budget,
    over: expense - budget,
    ratio: expense / budget,
    overDays,
    maxDayExpense,
    topCategory: top
      ? {
          name: top[0],
          value: Math.round(top[1] * 100) / 100,
          share: Math.round((top[1] / expense) * 1000) / 10
        }
      : null
  }
}
