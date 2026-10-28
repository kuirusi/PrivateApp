/**
 * 微信小程序无头测试环境
 * 用 Node 模拟 wx / Page / App / getApp，直接执行真实页面代码与业务逻辑
 */
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const storage = new Map()
const state = {
  toasts: [],
  modals: [],
  modalReplies: [],
  clipboard: '',
  switchTabs: [],
  canvases: [],
  launchCount: 0
}

function createFakeCtx() {
  const calls = []
  return {
    calls,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: '',
    textBaseline: '',
    scale() {
      calls.push(['scale'].concat([].slice.call(arguments)))
    },
    clearRect() {
      calls.push(['clearRect'])
    },
    beginPath() {
      calls.push(['beginPath'])
    },
    closePath() {
      calls.push(['closePath'])
    },
    moveTo() {
      calls.push(['moveTo'])
    },
    lineTo() {
      calls.push(['lineTo'])
    },
    arc() {
      calls.push(['arc'])
    },
    arcTo() {
      calls.push(['arcTo'])
    },
    save() {
      calls.push(['save'])
    },
    restore() {
      calls.push(['restore'])
    },
    translate() {
      calls.push(['translate'])
    },
    stroke() {
      calls.push(['stroke'])
    },
    fill() {
      calls.push(['fill', this.fillStyle])
    },
    fillText(text, x, y) {
      calls.push(['fillText', text, x, y])
    },
    measureText(text) {
      return { width: String(text).length * 6 }
    }
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

global.wx = {
  getStorageSync(key) {
    return storage.has(key) ? clone(storage.get(key)) : ''
  },
  setStorageSync(key, value) {
    storage.set(key, clone(value))
  },
  removeStorageSync(key) {
    storage.delete(key)
  },
  showToast(options) {
    state.toasts.push(options && options.title)
  },
  showModal(options) {
    state.modals.push(options && options.title)
    const reply = state.modalReplies.length ? state.modalReplies.shift() : { confirm: true }
    if (options && typeof options.success === 'function') {
      options.success(reply)
    }
  },
  setClipboardData(options) {
    state.clipboard = options && options.data
    if (options && typeof options.success === 'function') {
      options.success()
    }
  },
  switchTab(options) {
    state.switchTabs.push(options && options.url)
  },
  navigateTo(options) {
    state.switchTabs.push(options && options.url)
  },
  getWindowInfo() {
    return { pixelRatio: 2, windowWidth: 375, windowHeight: 667 }
  },
  createSelectorQuery() {
    const query = {
      in() {
        return query
      },
      select(selector) {
        query._selector = selector
        return query
      },
      fields() {
        return query
      },
      exec(callback) {
        const ctx = createFakeCtx()
        const node = {
          width: 0,
          height: 0,
          getContext() {
            return ctx
          }
        }
        state.canvases.push({ selector: query._selector, canvas: node, ctx: ctx })
        callback([
          {
            node: node,
            width: 300,
            height: 300
          }
        ])
      }
    }
    return query
  }
}

let appInstance = null
let pageCapture = null

global.App = function (config) {
  appInstance = Object.assign({ globalData: {} }, config)
  state.launchCount += 1
  if (typeof appInstance.onLaunch === 'function') {
    appInstance.onLaunch.call(appInstance)
  }
  return appInstance
}

global.getApp = function () {
  return appInstance
}

global.Page = function (config) {
  pageCapture = config
}

global.Component = function () {}

/** 加载 app.js，触发 onLaunch（初始化 storage） */
function loadApp() {
  appInstance = null
  const file = path.join(ROOT, 'app.js')
  delete require.cache[require.resolve(file)]
  require(file)
  return appInstance
}

/** 加载某个页面，返回带 data/setData 的实例 */
function loadPage(relPath) {
  const file = path.join(ROOT, relPath)
  delete require.cache[require.resolve(file)]
  pageCapture = null
  require(file)
  if (!pageCapture) {
    throw new Error('未调用 Page(): ' + relPath)
  }
  const config = pageCapture
  const page = {}
  Object.keys(config).forEach(function (key) {
    page[key] = config[key]
  })
  page.data = clone(config.data || {})
  page.setData = function (patch, callback) {
    Object.keys(patch || {}).forEach(function (key) {
      page.data[key] = patch[key]
    })
    if (typeof callback === 'function') {
      callback()
    }
  }
  return page
}

function resetAll() {
  storage.clear()
  state.toasts = []
  state.modals = []
  state.modalReplies = []
  state.clipboard = ''
  state.switchTabs = []
  state.canvases = []
  state.launchCount = 0
  if (appInstance) {
    appInstance.globalData = { editingBill: null }
  }
}

/** 断言工具 */
function eq(actual, expected, label) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) {
    throw new Error((label ? label + ' ' : '') + '期望 ' + b + '，实际 ' + a)
  }
}

function ok(value, label) {
  if (!value) {
    throw new Error((label || '断言') + ' 失败')
  }
}

function near(actual, expected, eps, label) {
  if (Math.abs(Number(actual) - Number(expected)) > (eps === undefined ? 0.01 : eps)) {
    throw new Error((label ? label + ' ' : '') + '期望约 ' + expected + '，实际 ' + actual)
  }
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms === undefined ? 20 : ms)
  })
}

const suites = []

function suite(name, fn) {
  suites.push({ name: name, fn: fn })
}

async function run() {
  let pass = 0
  let fail = 0
  const detail = []

  for (const item of suites) {
    console.log('\n' + item.name)
    const t = async function (name, fn) {
      try {
        await fn()
        pass += 1
        console.log('  [PASS] ' + name)
      } catch (e) {
        fail += 1
        detail.push({ suite: item.name, name: name, message: e.message })
        console.log('  [FAIL] ' + name + '\n         -> ' + e.message)
      }
    }
    await item.fn(t)
  }

  console.log('\n----------------------------------------')
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项')
  if (fail > 0) {
    detail.forEach(function (d) {
      console.log('  * ' + d.suite + ' / ' + d.name + ': ' + d.message)
    })
  }
  console.log('----------------------------------------')
  return fail === 0
}

module.exports = {
  ROOT,
  state,
  storage,
  getApp: function () {
    return appInstance
  },
  loadApp,
  loadPage,
  resetAll,
  eq,
  ok,
  near,
  wait,
  suite,
  run,
  clone
}
