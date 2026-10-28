import { useEffect, useState } from 'react'
import { money } from '../lib/format'
import { playAlarm } from '../lib/alarm'
import { randomTaunt } from '../lib/taunt'
import type { OverspendInfo } from '../lib/budget'

interface Props {
  info: OverspendInfo
  sound: boolean
  flash: boolean
  onClose: () => void
  onOpenStats: () => void
}

export default function OverspendAlert({ info, sound, flash, onClose, onOpenStats }: Props) {
  const [taunt] = useState(() => randomTaunt())

  useEffect(() => {
    playAlarm(sound)
    // 仅在弹窗打开时触发一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const percent = Math.round(info.ratio * 100)

  return (
    <div className="alert" role="alertdialog" aria-modal="true" aria-label="预算超支警告">
      <div className="alert__stripes" />
      {flash ? <div className="alert__flash" /> : null}
      <div className="alert__glow" />

      <div className="alert__content">
        <div className="alert__emoji" aria-hidden="true">
          😱
        </div>
        <p className="alert__eyebrow">🚨 预 算 超 支 🚨</p>
        <h2 className="alert__title">钱花超啦！！！</h2>

        <div className="alert__amount">
          <span className="alert__currency">¥</span>
          {money(info.over)}
        </div>
        <p className="alert__caption">
          预算已用掉 {percent}%{info.overDays > 0 ? ` · ${info.overDays} 天单日超标` : ''}
        </p>
        <p className="alert__taunt">“{taunt}”</p>

        <div className="alert__stats">
          <div className="alert__stat">
            <span className="alert__stat-label">月预算</span>
            <span className="alert__stat-value">¥{money(info.budget)}</span>
          </div>
          <div className="alert__stat">
            <span className="alert__stat-label">已支出</span>
            <span className="alert__stat-value">¥{money(info.expense)}</span>
          </div>
          <div className="alert__stat">
            <span className="alert__stat-label">超支</span>
            <span className="alert__stat-value">+{percent - 100}%</span>
          </div>
        </div>

        <div className="alert__actions">
          <button type="button" className="alert__btn alert__btn--ghost" onClick={onOpenStats}>
            去看账单
          </button>
          <button type="button" className="alert__btn" onClick={onClose}>
            我认了
          </button>
        </div>
        <p className="alert__tip">后续每一笔都会被盯紧 · 提醒方式可在「我的」调整</p>
      </div>
    </div>
  )
}
