const CATEGORY_COLORS = [
  '#4b6ef5',
  '#22b07d',
  '#f5a524',
  '#ef5b6b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#64748b'
]

const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = [
  { name: '工资', icon: '💰' },
  { name: '兼职', icon: '💼' },
  { name: '红包', icon: '🧧' },
  { name: '理财', icon: '📈' },
  { name: '报销', icon: '🧾' },
  { name: '其他', icon: '✨' }
]

function getCategories(type) {
  const source = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return source.map(function (item, index) {
    return {
      name: item.name,
      icon: item.icon,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }
  })
}

function getCategory(type, name) {
  const list = getCategories(type)
  const found = list.find(function (item) {
    return item.name === name
  })
  return found || { name: name || '其他', icon: '📦', color: CATEGORY_COLORS[9] }
}

module.exports = {
  CATEGORY_COLORS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategories,
  getCategory
}
