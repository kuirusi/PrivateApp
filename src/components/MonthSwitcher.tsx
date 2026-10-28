import { useEffect, useState } from 'react'
import { monthLabel, nowMonth, pad, shiftMonth } from '../lib/format'

interface Props {
  month: string
  onChange: (month: string) => void
  variant?: 'light' | 'plain'
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

export default function MonthSwitcher({ month, onChange, variant = 'plain' }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(month.split('-')[0]))

  useEffect(() => {
    setYear(Number(month.split('-')[0]))
  }, [month])

  const select = (value: number) => {
    onChange(`${year}-${pad(value)}`)
    setOpen(false)
  }

  return (
    <div className={`month month--${variant}`}>
      <button type="button" className="month__nav" onClick={() => onChange(shiftMonth(month, -1))} aria-label="上个月">
        ‹
      </button>
      <button type="button" className="month__label" onClick={() => setOpen(true)}>
        {monthLabel(month)}
        <span className="month__caret">▾</span>
      </button>
      <button type="button" className="month__nav" onClick={() => onChange(shiftMonth(month, 1))} aria-label="下个月">
        ›
      </button>

      {open ? (
        <div className="picker">
          <div className="picker__mask" onClick={() => setOpen(false)} />
          <div className="picker__panel">
            <div className="picker__head">
              <button type="button" className="picker__nav" onClick={() => setYear(year - 1)} aria-label="上一年">
                ‹
              </button>
              <span className="picker__year">{year} 年</span>
              <button type="button" className="picker__nav" onClick={() => setYear(year + 1)} aria-label="下一年">
                ›
              </button>
            </div>
            <div className="picker__grid">
              {MONTHS.map((value) => {
                const value2 = `${year}-${pad(value)}`
                return (
                  <button
                    type="button"
                    key={value}
                    className={`picker__cell ${value2 === month ? 'picker__cell--active' : ''}`}
                    onClick={() => select(value)}
                  >
                    {value} 月
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="picker__today"
              onClick={() => {
                onChange(nowMonth())
                setOpen(false)
              }}
            >
              回到本月
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
