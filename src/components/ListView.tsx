import { useMemo, useState } from 'react'
import type { Bill } from '../types'
import { getCategory } from '../lib/categories'
import { dayLabel, money, nowMonth, yuan } from '../lib/format'
import { useStore } from '../lib/store'
import MonthSwitcher from './MonthSwitcher'
import type { OverspendInfo } from '../lib/budget'

interface Props {
  onEdit: (bill: Bill) => void
  onCreate: () => void
  overspend: OverspendInfo | null
}

export default function ListView({ onEdit, onCreate, overspend }: Props) {
  const { bills, settings } = useStore()
  const [month, setMonth] = useState(nowMonth())

  const monthBills = useMemo(() => bills.filter((bill) => bill.date.slice(0, 7) === month), [bills, month])

  const summary = useMemo(
    () =>
      monthBills.reduce(
        (acc, bill) => {
          if (bill.type === 'income') {
            acc.income += bill.amount
          } else {
            acc.expense += bill.amount
          }
          return acc
        },
        { income: 0, expense: 0 }
      ),
    [monthBills]
  )

  const groups = useMemo(() => {
    const map = new Map<string, Bill[]>()
    monthBills.forEach((bill) => {
      const list = map.get(bill.date)
      if (list) {
        list.push(bill)
      } else {
        map.set(bill.date, [bill])
      }
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items: [...items].sort((x, y) => y.createdAt - x.createdAt)
      }))
  }, [monthBills])

  const budget = settings.budget
  const remain = budget - summary.expense
  const over = budget > 0 && remain < 0
  const progress = budget > 0 ? Math.min(100, (summary.expense / budget) * 100) : 0

  return (
    <div className="view">
      <header className={`hero ${overspend ? 'hero--over' : ''}`}>
        <MonthSwitcher month={month} onChange={setMonth} variant="light" />
        <p className="hero__label">本月支出</p>
        <p className="hero__amount">
          <span className="hero__symbol">¥</span>
          {money(summary.expense)}
        </p>
        <p className="hero__meta">
          <span>收入 ¥{money(summary.income)}</span>
          <span className="hero__dot" />
          <span>结余 {yuan(summary.income - summary.expense)}</span>
        </p>

        {budget > 0 ? (
          <div className="budget">
            <div className="budget__row">
              <span>月预算 ¥{money(budget)}</span>
              <span className={over ? 'budget__warn' : ''}>{over ? `超支 ¥${money(Math.abs(remain))}` : `剩余 ¥${money(remain)}`}</span>
            </div>
            <div className="budget__track">
              <div className={`budget__bar ${over ? 'budget__bar--over' : ''}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="budget budget--empty">未设置预算，可在「我的」中开启月度预算</p>
        )}
      </header>

      {overspend ? (
        <div className="warn" role="status">
          <span className="warn__siren">🚨</span>
          <span className="warn__text">
            本月已超支 <b>¥{money(overspend.over)}</b>
            <span className="warn__sub">
              {' '}
              预算的 {Math.round(overspend.ratio * 100)}%
              {overspend.overDays > 0 ? ` · ${overspend.overDays} 天超标` : ''}
            </span>
          </span>
          <span className="warn__siren">🚨</span>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">🧾</div>
          <p className="empty__title">本月还没有记录</p>
          <p className="empty__desc">花 3 秒记下第一笔，月底看得清清楚楚</p>
          <button type="button" className="btn btn--primary empty__btn" onClick={onCreate}>
            记一笔
          </button>
        </div>
      ) : (
        <div className="groups">
          {groups.map((group) => {
            const dayIncome = group.items.reduce((sum, bill) => sum + (bill.type === 'income' ? bill.amount : 0), 0)
            const dayExpense = group.items.reduce((sum, bill) => sum + (bill.type === 'expense' ? bill.amount : 0), 0)
            return (
              <section className="group" key={group.date}>
                <div className="group__head">
                  <span className="group__date">{dayLabel(group.date)}</span>
                  <span className="group__sum">
                    收 {money(dayIncome)} · 支 {money(dayExpense)}
                  </span>
                </div>
                <div className="card group__card">
                  {group.items.map((bill) => {
                    const category = getCategory(bill.type, bill.category)
                    return (
                      <button type="button" className="row" key={bill.id} onClick={() => onEdit(bill)}>
                        <span className="row__icon" style={{ background: `${category.color}1f`, color: category.color }}>
                          {category.icon}
                        </span>
                        <span className="row__main">
                          <span className="row__cat">{bill.category}</span>
                          {bill.note ? <span className="row__note">{bill.note}</span> : null}
                        </span>
                        <span className={`row__amount ${bill.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {bill.type === 'income' ? '+' : '-'}
                          {money(bill.amount)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
          <p className="list-foot">共 {monthBills.length} 笔 · 点击账单可修改</p>
        </div>
      )}
    </div>
  )
}
