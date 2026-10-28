const BILL_KEY = 'bills'
const SETTINGS_KEY = 'settings'

const DEFAULT_SETTINGS = {
  budget: 0
}

function init() {
  if (!wx.getStorageSync(BILL_KEY)) {
    wx.setStorageSync(BILL_KEY, [])
  }
  if (!wx.getStorageSync(SETTINGS_KEY)) {
    wx.setStorageSync(SETTINGS_KEY, DEFAULT_SETTINGS)
  }
}

function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, wx.getStorageSync(SETTINGS_KEY) || {})
}

function saveSettings(patch) {
  const next = Object.assign(getSettings(), patch || {})
  wx.setStorageSync(SETTINGS_KEY, next)
  return next
}

function getBills() {
  try {
    const list = wx.getStorageSync(BILL_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveBills(list) {
  wx.setStorageSync(BILL_KEY, list)
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function addBill(bill) {
  const list = getBills()
  const item = Object.assign({ id: genId(), createdAt: Date.now() }, bill)
  list.push(item)
  saveBills(list)
  return item
}

function updateBill(bill) {
  const list = getBills()
  const index = list.findIndex(function (it) {
    return it.id === bill.id
  })
  if (index > -1) {
    list[index] = Object.assign({}, list[index], bill)
    saveBills(list)
    return list[index]
  }
  return null
}

function removeBill(id) {
  const list = getBills().filter(function (it) {
    return it.id !== id
  })
  saveBills(list)
}

function clearBills() {
  saveBills([])
}

function getBillById(id) {
  return getBills().find(function (it) {
    return it.id === id
  })
}

/** 按月份筛选，返回按日期倒序排列的账单 */
function getBillsByMonth(month) {
  return getBills()
    .filter(function (it) {
      return String(it.date).slice(0, 7) === month
    })
    .sort(function (a, b) {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1
      }
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
}

module.exports = {
  init,
  getSettings,
  saveSettings,
  getBills,
  saveBills,
  addBill,
  updateBill,
  removeBill,
  clearBills,
  getBillById,
  getBillsByMonth
}
