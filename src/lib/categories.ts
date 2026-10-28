export const CATEGORY_COLORS = [
  '#4b6ef5',
  '#1fa97a',
  '#f5a524',
  '#ef5b6b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#64748b'
]

const EXPENSE = [
  { name: '餐饮', icon: '🍜' },
  { name: '交通', icon: '🚌' },
  { name: '购物', icon: '🛍️' },
  { name: '居住', icon: '🏠' },
  { name: '娱乐', icon: '🎮' },
  { name: '医疗', icon: '💊' },
  { name: '学习', icon: '📚' },
  { name: '通讯', icon: '📱' },
  { name: '人情', icon: '🎁' },
  { name: '其他', icon: '📦' }
]

const INCOME = [
  { name: '工资', icon: '💰' },
  { name: '兼职', icon: '💼' },
  { name: '红包', icon: '🧧' },
  { name: '理财', icon: '📈' },
  { name: '报销', icon: '🧾' },
  { name: '其他', icon: '✨' }
]

import type { BillType, Category } from '../types'

export function getCategories(type: BillType): Category[] {
  const source = type === 'income' ? INCOME : EXPENSE
  return source.map((item, index) => ({
    name: item.name,
    icon: item.icon,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  }))
}

export function getCategory(type: BillType, name: string): Category {
  const found = getCategories(type).find((item) => item.name === name)
  return found ?? { name: name || '其他', icon: '📦', color: CATEGORY_COLORS[9] }
}
