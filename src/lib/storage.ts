import type { AlertMode, Bill, Settings } from '../types'
import { createId, today } from './format'

const BILL_KEY = 'qz.bills.v1'
const SETTINGS_KEY = 'qz.settings.v1'

/** 默认每天提醒一次：不漏报，也不至于每次冷启动都全屏打断 */
const DEFAULT_SETTINGS: Settings = { budget: 0, sound: true, flash: true, alertMode: 'daily' }

const ALERT_MODES: AlertMode[] = ['always', 'daily', 'off']

/** 归一化提醒频率，并兼容旧版本只有 alwaysAlert 布尔开关的配置 */
function normalizeAlertMode(value: unknown, legacyAlwaysAlert: unknown): AlertMode {
  const matched = ALERT_MODES.find((mode) => mode === value)
  if (matched) {
    return matched
  }
  if (legacyAlwaysAlert === true) {
    return 'always'
  }
  if (legacyAlwaysAlert === false) {
    return 'daily'
  }
  return DEFAULT_SETTINGS.alertMode
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 存储不可用时静默降级为内存态 */
  }
}

export function loadSettings(): Settings {
  const raw = readRaw(SETTINGS_KEY)
  if (!raw) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings> & { alwaysAlert?: unknown }
    const budget = Number(parsed?.budget)
    return {
      budget: Number.isFinite(budget) && budget > 0 ? budget : 0,
      sound: parsed?.sound !== false,
      flash: parsed?.flash !== false,
      alertMode: normalizeAlertMode(parsed?.alertMode, parsed?.alwaysAlert)
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  writeRaw(SETTINGS_KEY, settings)
}

/** 容错解析：脏数据直接丢弃，字段类型统一归一化 */
export function normalizeBill(raw: unknown): Bill | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const item = raw as Record<string, unknown>
  const amount = Number(item.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }
  const date =
    typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today()

  const tag = typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : undefined

  return {
    id: typeof item.id === 'string' && item.id ? item.id : createId(),
    type: item.type === 'income' ? 'income' : 'expense',
    amount: Math.round(amount * 100) / 100,
    category: typeof item.category === 'string' && item.category ? item.category : '其他',
    ...(tag ? { tag } : {}),
    date,
    note: typeof item.note === 'string' ? item.note : '',
    createdAt: Number(item.createdAt) || Date.now()
  }
}

export function loadBills(): Bill[] {
  const raw = readRaw(BILL_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.map(normalizeBill).filter((bill): bill is Bill => bill !== null)
  } catch {
    return []
  }
}

export function saveBills(bills: Bill[]): void {
  writeRaw(BILL_KEY, bills)
}
