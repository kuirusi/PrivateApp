import { Capacitor } from '@capacitor/core'

/** 状态栏配色：hero = 明细页蓝色头部，light = 统计/我的浅色页，alert = 超支警报 */
export type StatusBarTone = 'hero' | 'light' | 'alert'

const TONES: Record<StatusBarTone, { color: string; darkIcons: boolean }> = {
  hero: { color: '#4b6ef5', darkIcons: false },
  light: { color: '#f4f6fb', darkIcons: true },
  alert: { color: '#ff5064', darkIcons: false }
}

/**
 * 让原生状态栏颜色跟随当前页面，避免顶部出现一条与界面割裂的色带。
 * Web 端与插件不可用时静默跳过，主题里配置的颜色仍然兜底。
 */
export async function syncStatusBar(tone: StatusBarTone): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  const { color, darkIcons } = TONES[tone]

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Style.Light 表示浅色背景配深色图标，Style.Dark 反之
    await StatusBar.setStyle({ style: darkIcons ? Style.Light : Style.Dark })
    // iOS 的状态栏背景由 WebView 内容决定（页面已用 env(safe-area-inset-top) 铺满），
    // setBackgroundColor 仅 Android 支持，调用会被拒绝
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color })
    }
  } catch {
    /* 插件不可用时忽略 */
  }
}
