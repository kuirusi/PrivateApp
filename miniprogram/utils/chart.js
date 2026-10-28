/**
 * 极简 canvas 2d 绘图工具（饼图 / 柱状图）
 * data: [{ label, value, color }]
 */

function getDpr() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    return info.pixelRatio || 1
  } catch (e) {
    return 1
  }
}

function initCanvas(page, id) {
  return new Promise(function (resolve, reject) {
    const query = wx.createSelectorQuery()
    if (page) {
      query.in(page)
    }
    query
      .select('#' + id)
      .fields({ node: true, size: true })
      .exec(function (res) {
        const item = res && res[0]
        if (!item || !item.node || !item.width) {
          reject(new Error('canvas 未就绪: ' + id))
          return
        }
        const canvas = item.node
        const ctx = canvas.getContext('2d')
        const dpr = getDpr()
        canvas.width = item.width * dpr
        canvas.height = item.height * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, item.width, item.height)
        resolve({ ctx: ctx, width: item.width, height: item.height })
      })
  })
}

/** 带重试的绘制入口，避免页面首次渲染时 canvas 尚未布局 */
function render(page, id, drawFn) {
  let retry = 0
  const run = function () {
    initCanvas(page, id)
      .then(function (ctxInfo) {
        drawFn(ctxInfo.ctx, ctxInfo.width, ctxInfo.height)
      })
      .catch(function () {
        if (retry < 4) {
          retry += 1
          setTimeout(run, 80)
        }
      })
  }
  run()
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y, x + w, y + radius, radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x, y + h, x, y + h - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
  ctx.fill()
}

/** 环形饼图 */
function drawDonut(ctx, width, height, data) {
  const list = (data || []).filter(function (it) {
    return it.value > 0
  })
  if (!list.length) {
    ctx.fillStyle = '#e9ecf5'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9aa0b5'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('暂无数据', width / 2, height / 2)
    return
  }

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - 8
  const inner = radius * 0.6
  const total = list.reduce(function (sum, it) {
    return sum + it.value
  }, 0)

  let start = -Math.PI / 2
  list.forEach(function (item) {
    const angle = (item.value / total) * Math.PI * 2
    const end = start + angle
    const mid = start + angle / 2
    // 扇形向外偏移 1.5px 形成间隙
    const ox = Math.cos(mid) * 1.5
    const oy = Math.sin(mid) * 1.5
    ctx.save()
    ctx.translate(ox, oy)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, start, end)
    ctx.arc(cx, cy, inner, end, start, true)
    ctx.closePath()
    ctx.fillStyle = item.color
    ctx.fill()
    ctx.restore()
    start = end
  })
}

/** 分组双柱图，groups: [{ label, income, expense }] */
function drawBars(ctx, width, height, groups) {
  const pad = { top: 26, right: 8, bottom: 26, left: 8 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const list = groups || []
  if (!list.length) {
    return
  }

  const maxValue = list.reduce(function (max, g) {
    return Math.max(max, g.income, g.expense)
  }, 0)
  const max = Math.max(1, maxValue) * 1.15

  // 网格线
  ctx.strokeStyle = '#eef0f6'
  ctx.lineWidth = 1
  for (let i = 0; i <= 2; i++) {
    const y = pad.top + (chartH / 2) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(width - pad.right, y)
    ctx.stroke()
  }

  const step = chartW / list.length
  const barW = Math.min(16, step / 3)

  const drawBar = function (cx, value, color) {
    const h = (value / max) * chartH
    if (h <= 0) {
      return
    }
    ctx.fillStyle = color
    roundRect(ctx, cx - barW / 2, pad.top + chartH - h, barW, h, barW / 2)
  }

  list.forEach(function (g, i) {
    const cx = pad.left + step * i + step / 2
    drawBar(cx - barW * 0.65, g.expense, '#ef5b6b')
    drawBar(cx + barW * 0.65, g.income, '#22b07d')

    ctx.fillStyle = '#9aa0b5'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(g.label, cx, pad.top + chartH + 8)
  })
}

module.exports = {
  initCanvas,
  render,
  drawDonut,
  drawBars
}
