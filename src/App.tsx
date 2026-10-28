import { useEffect, useMemo, useRef, useState } from 'react'
import type { Bill } from './types'
import { nowMonth, today } from './lib/format'
import { computeOverspend, type OverspendInfo } from './lib/budget'
import { useStore } from './lib/store'
import { syncStatusBar, type StatusBarTone } from './lib/statusbar'
import BillSheet from './components/BillSheet'
import ConfirmHost from './components/Confirm'
import Icon from './components/Icon'
import ListView from './components/ListView'
import MeView from './components/MeView'
import OverspendAlert from './components/OverspendAlert'
import StatsView from './components/StatsView'
import TabBar, { type TabKey } from './components/TabBar'
import ToastHost from './components/Toast'

const NOTICE_KEY = 'qz.overspendNotice.v1'

export default function App() {
  const { bills, settings } = useStore()
  const [tab, setTab] = useState<TabKey>('list')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)

  /** 本月超支信息，未超支或未设置预算时为 null */
  const overspend = useMemo<OverspendInfo | null>(
    () => computeOverspend(bills, settings.budget, nowMonth()),
    [bills, settings.budget]
  )

  const wasOverspend = useRef(false)
  const previousExpense = useRef(0)
  /** 是否已经完成首次挂载的状态记录 */
  const tracked = useRef(false)

  useEffect(() => {
    const expense = overspend ? overspend.expense : 0
    const nowOverspend = Boolean(overspend)
    // 首次挂载时就已超支不算「刚好越过预算线」，否则每次刷新都会强制弹警报，
    // 让「每次打开都提醒」的开关失去意义
    const justCrossedLine = tracked.current && nowOverspend && !wasOverspend.current
    // 已经超支的情况下又花了更多钱，继续打断你
    const spentMore = tracked.current && nowOverspend && wasOverspend.current && expense > previousExpense.current

    tracked.current = true
    wasOverspend.current = nowOverspend
    previousExpense.current = expense

    if (!nowOverspend) {
      return
    }

    // 选择「不提醒」时只保留首页超支横幅，不再主动弹全屏
    if (settings.alertMode === 'off') {
      return
    }

    const stamp = today()
    let noticedToday = false
    try {
      noticedToday = localStorage.getItem(NOTICE_KEY) === stamp
    } catch {
      noticedToday = false
    }
    // 越过预算线、继续加码一定提醒；持续超支状态按「每次打开 / 每天一次」的频率提醒
    if (!justCrossedLine && !spentMore && noticedToday && settings.alertMode === 'daily') {
      return
    }
    try {
      localStorage.setItem(NOTICE_KEY, stamp)
    } catch {
      /* 存储不可用时忽略 */
    }

    const timer = window.setTimeout(() => setAlertOpen(true), 340)
    return () => window.clearTimeout(timer)
  }, [overspend, settings.alertMode])

  // 原生状态栏跟随当前页面底色，避免顶部出现一条与界面割裂的色带
  useEffect(() => {
    const tone: StatusBarTone = alertOpen ? 'alert' : tab === 'list' ? 'hero' : 'light'
    void syncStatusBar(tone)
  }, [tab, alertOpen])

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (bill: Bill) => {
    setEditing(bill)
    setSheetOpen(true)
  }

  const closeSheet = () => setSheetOpen(false)

  const changeTab = (next: TabKey) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setTab(next)
  }

  return (
    <div className="app">
      <main className="app__main">
        {tab === 'list' ? <ListView onEdit={openEdit} onCreate={openCreate} overspend={overspend} /> : null}
        {tab === 'stats' ? <StatsView /> : null}
        {tab === 'me' ? <MeView /> : null}
      </main>

      <div className="fab-wrap">
        <button type="button" className={`fab ${overspend ? 'fab--warn' : ''}`} onClick={openCreate} aria-label="记一笔">
          <Icon name="plus" size={26} />
        </button>
      </div>

      <TabBar tab={tab} onChange={changeTab} />
      <BillSheet open={sheetOpen} bill={editing} onClose={closeSheet} />

      {alertOpen && overspend ? (
        <OverspendAlert
          info={overspend}
          sound={settings.sound}
          flash={settings.flash}
          onClose={() => setAlertOpen(false)}
          onOpenStats={() => {
            setAlertOpen(false)
            changeTab('stats')
          }}
        />
      ) : null}

      <ConfirmHost />
      <ToastHost />
    </div>
  )
}
