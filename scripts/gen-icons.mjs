/**
 * 生成 App 图标：Web (PWA) + Android 启动图标 / 启动页 Logo
 * 纯 Node 实现，无第三方依赖
 * 运行：node scripts/gen-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = process.cwd()
const PUBLIC_DIR = path.resolve(ROOT, 'public')
const ANDROID_RES = path.resolve(ROOT, 'android/app/src/main/res')

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = -1
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function encodePng(width, height, pixels) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value)

function roundedRectSdf(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius)
  const qy = Math.abs(py - cy) - (halfH - radius)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - radius
}

/** 三根白色柱子的几何参数 */
function barGeometry(size, scale = 1) {
  const barWidth = size * 0.115 * scale
  const gap = size * 0.068 * scale
  const totalWidth = barWidth * 3 + gap * 2
  const startX = size / 2 - totalWidth / 2 + barWidth / 2
  const baseY = size / 2 + size * 0.16 * scale
  const heights = [size * 0.2 * scale, size * 0.31 * scale, size * 0.25 * scale]
  return { barWidth, gap, startX, baseY, heights }
}

/** 圆角渐变底 + 白色柱子 */
function renderIcon(size, padding = 0.06) {
  const pixels = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const halfW = size / 2 - size * padding
  const halfH = size / 2 - size * padding
  const radius = halfW * 0.62
  const bars = barGeometry(size, 1)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (2 * size)
      let r = Math.round(75 + (150 - 75) * t)
      let g = Math.round(110 + (120 - 110) * t)
      let b = Math.round(245 + (255 - 245) * t)
      const bgDistance = roundedRectSdf(x + 0.5, y + 0.5, cx, cy, halfW, halfH, radius)
      const alpha = clamp01(0.5 - bgDistance)

      for (let i = 0; i < 3; i += 1) {
        const barCx = bars.startX + i * (bars.barWidth + bars.gap)
        const barH = bars.heights[i]
        const barCy = bars.baseY - barH / 2
        const barDistance = roundedRectSdf(x + 0.5, y + 0.5, barCx, barCy, bars.barWidth / 2, barH / 2, bars.barWidth / 2)
        const coverage = clamp01(0.5 - barDistance)
        if (coverage > 0) {
          r = Math.round(r * (1 - coverage) + 255 * coverage)
          g = Math.round(g * (1 - coverage) + 255 * coverage)
          b = Math.round(b * (1 - coverage) + 255 * coverage)
        }
      }

      const index = (y * size + x) * 4
      pixels[index] = r
      pixels[index + 1] = g
      pixels[index + 2] = b
      pixels[index + 3] = Math.round(alpha * 255)
    }
  }

  return encodePng(size, size, pixels)
}

/** 透明底 + 白色柱子（Android 自适应图标前景） */
function renderForeground(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const bars = barGeometry(size, 1)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let alpha = 0
      for (let i = 0; i < 3; i += 1) {
        const barCx = bars.startX + i * (bars.barWidth + bars.gap)
        const barH = bars.heights[i]
        const barCy = bars.baseY - barH / 2
        const barDistance = roundedRectSdf(x + 0.5, y + 0.5, barCx, barCy, bars.barWidth / 2, barH / 2, bars.barWidth / 2)
        alpha = Math.max(alpha, clamp01(0.5 - barDistance))
      }
      const index = (y * size + x) * 4
      pixels[index] = 255
      pixels[index + 1] = 255
      pixels[index + 2] = 255
      pixels[index + 3] = Math.round(alpha * 255)
    }
  }

  return encodePng(size, size, pixels)
}

/** iOS 图标不允许带透明通道，铺满整块渐变底、不做圆角 */
function renderOpaqueIcon(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const bars = barGeometry(size, 1)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (2 * size)
      let r = Math.round(75 + (150 - 75) * t)
      let g = Math.round(110 + (120 - 110) * t)
      let b = Math.round(245 + (255 - 245) * t)

      for (let i = 0; i < 3; i += 1) {
        const barCx = bars.startX + i * (bars.barWidth + bars.gap)
        const barH = bars.heights[i]
        const barCy = bars.baseY - barH / 2
        const barDistance = roundedRectSdf(x + 0.5, y + 0.5, barCx, barCy, bars.barWidth / 2, barH / 2, bars.barWidth / 2)
        const coverage = clamp01(0.5 - barDistance)
        if (coverage > 0) {
          r = Math.round(r * (1 - coverage) + 255 * coverage)
          g = Math.round(g * (1 - coverage) + 255 * coverage)
          b = Math.round(b * (1 - coverage) + 255 * coverage)
        }
      }

      const index = (y * size + x) * 4
      pixels[index] = r
      pixels[index + 1] = g
      pixels[index + 2] = b
      pixels[index + 3] = 255
    }
  }

  return encodePng(size, size, pixels)
}

function write(file, buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buffer)
  console.log('生成 ' + path.relative(ROOT, file) + ' (' + buffer.length + ' bytes)')
}

/* ---------- PWA / 网页图标 ---------- */
const publicTargets = [
  { file: 'icon-192.png', size: 192, padding: 0.06 },
  { file: 'icon-512.png', size: 512, padding: 0.06 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.17 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.02 },
  { file: 'favicon-32.png', size: 32, padding: 0.04 }
]

publicTargets.forEach((target) => {
  write(path.join(PUBLIC_DIR, target.file), renderIcon(target.size, target.padding))
})

/* ---------- Android 图标 ---------- */
if (fs.existsSync(ANDROID_RES)) {
  const densities = [
    { dir: 'mipmap-mdpi', scale: 1 },
    { dir: 'mipmap-hdpi', scale: 1.5 },
    { dir: 'mipmap-xhdpi', scale: 2 },
    { dir: 'mipmap-xxhdpi', scale: 3 },
    { dir: 'mipmap-xxxhdpi', scale: 4 }
  ]

  densities.forEach(({ dir, scale }) => {
    const legacySize = Math.round(48 * scale)
    const foregroundSize = Math.round(108 * scale)
    const base = path.join(ANDROID_RES, dir)
    write(path.join(base, 'ic_launcher.png'), renderIcon(legacySize, 0.02))
    write(path.join(base, 'ic_launcher_round.png'), renderIcon(legacySize, 0.02))
    write(path.join(base, 'ic_launcher_foreground.png'), renderForeground(foregroundSize))
  })

  write(path.join(ANDROID_RES, 'drawable-nodpi', 'launch_logo.png'), renderIcon(320, 0.06))
} else {
  console.log('未检测到 android 目录，跳过 Android 图标生成')
}

/* ---------- iOS 图标 ---------- */
const IOS_APPICON = path.resolve(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
if (fs.existsSync(IOS_APPICON)) {
  write(path.join(IOS_APPICON, 'AppIcon-512@2x.png'), renderOpaqueIcon(1024))
} else {
  console.log('未检测到 ios 目录，跳过 iOS 图标生成')
}
