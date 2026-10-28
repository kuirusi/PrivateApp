import { useEffect, useMemo, useRef, useState } from 'react'
import type { AlertMode } from '../types'
import { money, today } from '../lib/format'
import { actions, useStore } from '../lib/store'
import { confirmAction } from './Confirm'
import { toast } from './Toast'

const ALERT_MODE_OPTIONS: { value: AlertMode; label: string; hint: string }[] = [
  { value: 'always', label: '每次打开', hint: '每次打开 App 都全屏提醒一次，打扰最强' },
  { value: 'daily', label: '每天一次', hint: '每天首次打开 App 提醒一次，当天之后不再打扰' },
  { value: 'off', label: '不提醒', hint: '不再主动弹全屏警报，仅在首页保留超支横幅' }
]

interface SettingSwitchProps {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}

function SettingSwitch({ label, value, onChange }: SettingSwitchProps) {
  return (
    <div className="menu">
      <span>{label}</span>
      <button
        type="button"
        className={`switch ${value ? 'switch--on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={label}
      >
        <span className="switch__dot" />
      </button>
    </div>
  )
}

function isNativeApp(): boolean {
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.())
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const copied = document.execCommand('copy')
      area.remove()
      return copied
    } catch {
      return false
    }
  }
}

export default function MeView() {
  const { bills, settings } = useStore()
  const [budget, setBudget] = useState(settings.budget > 0 ? String(settings.budget) : '')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBudget(settings.budget > 0 ? String(settings.budget) : '')
  }, [settings.budget])

  const overview = useMemo(() => {
    let income = 0
    let expense = 0
    const months = new Set<string>()
    const dates: string[] = []
    bills.forEach((bill) => {
      if (bill.type === 'income') {
        income += bill.amount
      } else {
        expense += bill.amount
      }
      months.add(bill.date.slice(0, 7))
      dates.push(bill.date)
    })
    dates.sort()
    return {
      income,
      expense,
      months: months.size,
      first: dates[0] ?? '暂无',
      last: dates[dates.length - 1] ?? '暂无'
    }
  }, [bills])

  const saveBudget = () => {
    const value = Number(budget)
    if (!Number.isFinite(value) || value < 0) {
      toast('请输入有效金额')
      return
    }
    actions.setBudget(value)
    toast(value > 0 ? '预算已保存' : '已关闭预算')
  }

  const exportData = async () => {
    if (!bills.length) {
      toast('暂无可导出的数据')
      return
    }
    const payload = {
      app: 'qingjizhang',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      bills
    }
    const text = JSON.stringify(payload, null, 2)

    if (isNativeApp()) {
      const copied = await copyText(text)
      toast(copied ? '备份数据已复制到剪贴板' : '复制失败，请重试')
      return
    }

    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `轻记账备份-${today()}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('备份文件已导出')
  }

  const pickFile = () => {
    fileRef.current?.click()
  }

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const list = Array.isArray(parsed) ? parsed : (parsed as { bills?: unknown }).bills
      if (!Array.isArray(list)) {
        throw new Error('bad format')
      }
      const confirmed = await confirmAction({
        title: '导入备份？',
        message: `将覆盖当前 ${bills.length} 笔账目，共导入 ${list.length} 条数据`,
        confirmText: '导入',
        danger: true
      })
      if (!confirmed) {
        return
      }
      const count = actions.importBills(list)
      toast(`已导入 ${count} 笔账目`)
    } catch {
      toast('文件格式不正确')
    }
  }

  const clearAll = async () => {
    if (!bills.length) {
      toast('当前没有数据')
      return
    }
    const confirmed = await confirmAction({
      title: '清空所有账目？',
      message: `共 ${bills.length} 笔，删除后不可恢复，建议先导出备份`,
      confirmText: '清空',
      danger: true
    })
    if (!confirmed) {
      return
    }
    actions.clearBills()
    toast('已清空')
  }

  const alertModeOption =
    ALERT_MODE_OPTIONS.find((option) => option.value === settings.alertMode) ?? ALERT_MODE_OPTIONS[1]
  // off 时连「越线 / 继续消费」也不打断，所以提示里不再附加那句立即警报
  const alertHint =
    settings.alertMode === 'off' ? alertModeOption.hint : `${alertModeOption.hint}；超支瞬间或超支后继续消费仍会立即警报`

  return (
    <div className="view">
      <div className="view__top">
        <h1 className="view__title">我的</h1>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">月度预算</h2>
          <span className="card__sub">超出会在首页提醒</span>
        </div>
        <div className="budget-input">
          <span className="budget-input__cny">¥</span>
          <input
            className="budget-input__field"
            inputMode="decimal"
            placeholder="设置本月支出预算"
            value={budget}
            onChange={(event) => setBudget(event.target.value.replace(/[^\d.]/g, ''))}
          />
          <button type="button" className="btn btn--small btn--primary" onClick={saveBudget}>
            保存
          </button>
        </div>
        <p className="hint">填 0 或不填表示不启用预算</p>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">超支提醒</h2>
          <span className="card__sub">
            {settings.alertMode === 'off' ? '超出预算只在首页提示' : '超出预算会全屏警报'}
          </span>
        </div>
        <SettingSwitch
          label="🔔 警报音效与震动"
          value={settings.sound}
          onChange={(next) => actions.updateSettings({ sound: next })}
        />
        <SettingSwitch
          label="💡 警报页面频闪"
          value={settings.flash}
          onChange={(next) => actions.updateSettings({ flash: next })}
        />
        <div className="menu menu--stack">
          <span>📣 超支提醒频率</span>
          <div className="seg seg--wide" role="group" aria-label="超支提醒频率">
            {ALERT_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`seg__item ${settings.alertMode === option.value ? 'seg__item--active' : ''}`}
                onClick={() => actions.updateSettings({ alertMode: option.value })}
                aria-pressed={settings.alertMode === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">{alertHint}</p>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">数据总览</h2>
          <span className="card__sub">全部时间</span>
        </div>
        <div className="overview">
          <div className="overview__item">
            <span className="overview__value">{bills.length}</span>
            <span className="overview__label">累计笔数</span>
          </div>
          <div className="overview__item">
            <span className="overview__value">{overview.months}</span>
            <span className="overview__label">记账月份</span>
          </div>
          <div className="overview__item">
            <span className="overview__value text-income">¥{money(overview.income)}</span>
            <span className="overview__label">累计收入</span>
          </div>
          <div className="overview__item">
            <span className="overview__value text-expense">¥{money(overview.expense)}</span>
            <span className="overview__label">累计支出</span>
          </div>
        </div>
        <p className="hint">
          最早 {overview.first} · 最近 {overview.last}
        </p>
      </div>

      <div className="card card--list">
        <div className="card__head card__head--inset">
          <h2 className="card__title">数据管理</h2>
        </div>
        <button type="button" className="menu" onClick={exportData}>
          <span>📤 导出备份文件</span>
          <span className="menu__arrow">›</span>
        </button>
        <button type="button" className="menu" onClick={pickFile}>
          <span>📥 从备份文件导入</span>
          <span className="menu__arrow">›</span>
        </button>
        <button type="button" className="menu menu--danger" onClick={clearAll}>
          <span>🗑️ 清空所有账目</span>
          <span className="menu__arrow">›</span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden-input" onChange={importFile} />
      </div>

      <p className="foot-note">数据保存在本机浏览器 / App 存储中，卸载或清理数据会丢失，建议定期导出备份</p>
    </div>
  )
}
