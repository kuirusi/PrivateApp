import { useMemo, useState } from 'react'
import { getCategory } from '../lib/categories'
import { computeOverspend } from '../lib/budget'
import { daysInMonth, money, nowMonth, percent, shiftMonth, shortMonthLabel, yuan } from '../lib/format'
import { useStore } from '../lib/store'
import BarChart, { type BarGroup } from './BarChart'
import Donut from './Donut'
import MonthSwitcher from './MonthSwitcher'

export default function StatsView() {
  const { bills, settings } = useStore()
  const [month, setMonth] = useState(nowMonth())

  const monthBills = useMemo(() => bills.filter((bill) => bill.date.slice(0, 7) === month), [bills, month])

  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    const categoryMap = new Map<string, number>()
    const dayMap = new Map<string, number>()

    monthBills.forEach((bill) => {
      if (bill.type === 'income') {
        income += bill.amount
        return
      }
      expense += bill.amount
      categoryMap.set(bill.category, (categoryMap.get(bill.category) ?? 0) + bill.amount)
      dayMap.set(bill.date, (dayMap.get(bill.date) ?? 0) + bill.amount)
    })

    const categoryList = Array.from(categoryMap.entries())
      .map(([name, value]) => {
        const category = getCategory('expense', name)
        return {
          label: name,
          value: Math.round(value * 100) / 100,
          color: category.color,
          icon: category.icon,
          share: percent(value, expense)
        }
      })
      .sort((a, b) => b.value - a.value)

    const maxDayExpense = Array.from(dayMap.values()).reduce((max, value) => Math.max(max, value), 0)
    const activeDays = dayMap.size

    return {
      income,
      expense,
      balance: income - expense,
      categoryList,
      avgExpense: activeDays > 0 ? expense / activeDays : 0,
      maxDayExpense
    }
  }, [monthBills])

  const overspend = useMemo(
    () => computeOverspend(bills, settings.budget, month),
    [bills, settings.budget, month]
  )

  const daysLeft = useMemo(() => {
    if (month !== nowMonth()) {
      return 0
    }
    const lastDay = daysInMonth(month)
    return Math.max(lastDay - new Date().getDate(), 0)
  }, [month])

  const trend = useMemo<BarGroup[]>(() => {
    const groups: BarGroup[] = []
    for (let offset = 5; offset >= 0; offset -= 1) {
      const target = shiftMonth(month, -offset)
      const list = bills.filter((bill) => bill.date.slice(0, 7) === target)
      const group = list.reduce(
        (acc, bill) => {
          if (bill.type === 'income') {
            acc.income += bill.amount
          } else {
            acc.expense += bill.amount
          }
          return acc
        },
        { label: shortMonthLabel(target), income: 0, expense: 0 }
      )
      groups.push(group)
    }
    return groups
  }, [bills, month])

  const isEmpty = monthBills.length === 0
  const percentUsed = overspend ? Math.round(overspend.ratio * 100) : 0

  return (
    <div className={`view ${overspend ? 'view--danger' : ''}`}>
      <div className="view__top">
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {overspend ? (
        <div className="danger-bar" role="status">
          <span className="danger-bar__label">🚨 超支</span>
          <span className="danger-bar__text">
            已超出预算 ¥{money(overspend.over)} · 用掉 {percentUsed}%
          </span>
          <span className="danger-bar__label">🚨</span>
        </div>
      ) : null}

      <div className={`card summary ${overspend ? 'summary--danger' : ''}`}>
        <div className="summary__col">
          <span className="summary__label">收入</span>
          <span className="summary__value text-income">{yuan(stats.income)}</span>
        </div>
        <div className="summary__col summary__col--mid">
          <span className="summary__label">结余</span>
          <span className="summary__value">{yuan(stats.balance)}</span>
        </div>
        <div className="summary__col summary__col--right">
          <span className="summary__label">支出</span>
          <span className="summary__value text-expense">{yuan(stats.expense)}</span>
        </div>
        <div className="summary__extra">
          <span>日均支出 ¥{money(stats.avgExpense)}</span>
          <span>单日最高 ¥{money(stats.maxDayExpense)}</span>
        </div>
      </div>

      {overspend ? (
        <div className="card danger-card">
          <div className="card__head">
            <h2 className="card__title">超支解剖</h2>
            <span className="danger-card__badge">DANGER</span>
          </div>

          <div className="gauge">
            <div className="gauge__head">
              <span className="gauge__label">预算使用率</span>
              <span className="gauge__value">
                {percentUsed}%
                {percentUsed > 100 ? <em className="gauge__delta">+{percentUsed - 100}%</em> : null}
              </span>
            </div>
            <div className="gauge__track">
              <div className="gauge__fill" style={{ width: `${Math.min(100, percentUsed)}%` }} />
              {percentUsed > 100 ? <div className="gauge__burst" /> : null}
            </div>
            <div className="gauge__scale">
              <span>¥0</span>
              <span>预算 ¥{money(overspend.budget)}</span>
            </div>
          </div>

          <div className="danger-grid">
            <div className="danger-cell">
              <span className="danger-cell__label">超支金额</span>
              <span className="danger-cell__value danger-cell__value--alert">¥{money(overspend.over)}</span>
            </div>
            <div className="danger-cell">
              <span className="danger-cell__label">超标天数</span>
              <span className="danger-cell__value">{overspend.overDays} 天</span>
            </div>
            <div className="danger-cell">
              <span className="danger-cell__label">最大单日</span>
              <span className="danger-cell__value">¥{money(overspend.maxDayExpense)}</span>
            </div>
          </div>

          {overspend.topCategory ? (
            <p className="danger-culprit">
              🔥 头号元凶：<b>{overspend.topCategory.name}</b> ¥{money(overspend.topCategory.value)}
              <span className="danger-culprit__share"> 占支出 {overspend.topCategory.share}%</span>
            </p>
          ) : null}

          <p className="danger-line">
            {daysLeft > 0
              ? `距月底还有 ${daysLeft} 天，超支的部分只能靠后面硬省了`
              : '这个月的账已经封盘，超支没法挽回了'}
          </p>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="empty">
          <div className="empty__icon">📊</div>
          <p className="empty__title">这个月还没有数据</p>
          <p className="empty__desc">记账之后这里会自动生成图表</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card__head">
              <h2 className="card__title">支出结构</h2>
              <span className="card__sub">{overspend ? '超支月账单' : '按分类占比'}</span>
            </div>
            <div className="donut-row">
              <Donut
                data={stats.categoryList.map((item) => ({ label: item.label, value: item.value, color: item.color }))}
                size={148}
                thickness={20}
                centerLabel="总支出"
                centerValue={stats.expense}
              />
              <ul className="legend">
                {stats.categoryList.slice(0, 6).map((item) => (
                  <li className="legend__item" key={item.label}>
                    <span className="legend__dot" style={{ background: item.color }} />
                    <span className="legend__name">
                      {item.icon} {item.label}
                    </span>
                    <span className="legend__share">{item.share}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title">近 6 个月趋势</h2>
              <div className="bars-legend">
                <span className="bars-legend__item">
                  <i style={{ background: '#ef5b6b' }} />
                  支出
                </span>
                <span className="bars-legend__item">
                  <i style={{ background: '#1fa97a' }} />
                  收入
                </span>
              </div>
            </div>
            <BarChart groups={trend} highlightIndex={overspend ? trend.length - 1 : undefined} />
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title">支出排行</h2>
              <span className="card__sub">
                {overspend ? '红色为超支月主力' : `共 ${stats.categoryList.length} 个分类`}
              </span>
            </div>
            <ul className="rank">
              {stats.categoryList.map((item, index) => (
                <li className={`rank__item ${overspend && index === 0 ? 'rank__item--culprit' : ''}`} key={item.label}>
                  <span className="rank__index">{index + 1}</span>
                  <span className="rank__name">
                    {item.icon} {item.label}
                    {overspend && index === 0 ? <em className="rank__badge">元凶</em> : null}
                  </span>
                  <span className="rank__track">
                    <span
                      className="rank__bar"
                      style={{ width: `${Math.max(item.share, 2)}%`, background: item.color }}
                    />
                  </span>
                  <span className="rank__amount">¥{money(item.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
