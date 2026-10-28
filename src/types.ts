export type BillType = 'expense' | 'income'

export interface Bill {
  id: string
  type: BillType
  amount: number
  category: string
  /** YYYY-MM-DD */
  date: string
  note: string
  createdAt: number
}

/** 超支提醒频率：每次打开 / 每天首次打开 / 不主动提醒 */
export type AlertMode = 'always' | 'daily' | 'off'

export interface Settings {
  budget: number
  /** 超支警报是否播放提示音与震动 */
  sound: boolean
  /** 警报页面是否红白频闪 */
  flash: boolean
  /** 超支提醒频率，off 时只保留首页超支横幅 */
  alertMode: AlertMode
}

export interface Category {
  name: string
  icon: string
  color: string
}

export interface BillInput {
  type: BillType
  amount: number
  category: string
  date: string
  note: string
}

export interface MonthSummary {
  income: number
  expense: number
  balance: number
}
