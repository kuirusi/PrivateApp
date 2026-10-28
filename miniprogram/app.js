const store = require('./utils/store')

App({
  globalData: {
    // 列表页点击某笔账单时暂存于此，供 tab 页「记一笔」读取
    editingBill: null
  },

  onLaunch() {
    store.init()
  }
})
