import { useEffect, useRef, useState } from 'react'
import type { Bill, BillType } from '../types'
import { getCategories, getTags } from '../lib/categories'
import { today } from '../lib/format'
import { actions } from '../lib/store'
import Sheet from './Sheet'
import { confirmAction } from './Confirm'
import { toast } from './Toast'

interface Props {
  open: boolean
  bill: Bill | null
  onClose: () => void
}

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500]

function sanitizeAmount(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const matched = cleaned.match(/^\d*(\.\d{0,2})?/)
  return matched ? matched[0] : ''
}

export default function BillSheet({ open, bill, onClose }: Props) {
  const [type, setType] = useState<BillType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('餐饮')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  const categories = getCategories(type)
  /** 当前分类支持的二级标签，为空表示这个分类不需要标签 */
  const tagOptions = getTags(category)

  useEffect(() => {
    if (!open) {
      return
    }
    if (bill) {
      setType(bill.type)
      setAmount(bill.amount.toFixed(2))
      setCategory(bill.category)
      setDate(bill.date)
      setNote(bill.note)
      setTag(bill.tag ?? '')
    } else {
      setType('expense')
      setAmount('')
      setCategory(getCategories('expense')[0].name)
      setDate(today())
      setNote('')
      setTag('')
    }
    const timer = window.setTimeout(() => amountRef.current?.focus(), 260)
    return () => window.clearTimeout(timer)
  }, [open, bill])

  const switchType = (next: BillType) => {
    if (next === type) {
      return
    }
    setType(next)
    setCategory(getCategories(next)[0].name)
    setTag('')
  }

  const pickCategory = (name: string) => {
    setCategory(name)
    // 换分类后旧标签不再适用
    setTag('')
  }

  const addQuick = (value: number) => {
    const current = Number(amount) || 0
    setAmount((current + value).toFixed(2))
  }

  const save = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast('请输入有效金额')
      return
    }
    const input = {
      type,
      amount: value,
      category,
      date,
      note,
      tag: tagOptions.length > 0 && tag ? tag : undefined
    }
    if (bill) {
      actions.updateBill({ ...bill, ...input })
    } else {
      actions.addBill(input)
    }
    toast(bill ? '已更新' : '已记账')
    onClose()
  }

  const remove = async () => {
    if (!bill) {
      return
    }
    const confirmed = await confirmAction({
      title: '删除这笔账？',
      message: '删除后不可恢复',
      confirmText: '删除',
      danger: true
    })
    if (!confirmed) {
      return
    }
    actions.removeBill(bill.id)
    toast('已删除')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet__grab" />
      <div className="sheet__body">
        <div className="seg">
          <button
            type="button"
            className={`seg__item ${type === 'expense' ? 'seg__item--active seg__item--expense' : ''}`}
            onClick={() => switchType('expense')}
          >
            支出
          </button>
          <button
            type="button"
            className={`seg__item ${type === 'income' ? 'seg__item--active seg__item--income' : ''}`}
            onClick={() => switchType('income')}
          >
            收入
          </button>
        </div>

        <div className={`amount ${type === 'income' ? 'amount--income' : 'amount--expense'}`}>
          <span className="amount__cny">¥</span>
          <input
            ref={amountRef}
            className="amount__input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
            aria-label="金额"
          />
        </div>

        <div className="quick">
          {QUICK_AMOUNTS.map((value) => (
            <button type="button" key={value} className="quick__item" onClick={() => addQuick(value)}>
              +{value}
            </button>
          ))}
        </div>

        <p className="sheet__title">选择分类</p>
        <div className="cats">
          {categories.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`cats__item ${category === item.name ? 'cats__item--active' : ''}`}
              onClick={() => pickCategory(item.name)}
            >
              <span
                className="cats__icon"
                style={{ background: `${item.color}1f`, color: item.color, borderColor: category === item.name ? item.color : 'transparent' }}
              >
                {item.icon}
              </span>
              <span className="cats__name">{item.name}</span>
            </button>
          ))}
        </div>

        {tagOptions.length > 0 ? (
          <>
            <p className="sheet__title">选择标签（可选）</p>
            <div className="tags">
              {tagOptions.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`tags__item ${tag === item.name ? 'tags__item--active' : ''}`}
                  onClick={() => setTag(tag === item.name ? '' : item.name)}
                  aria-pressed={tag === item.name}
                >
                  {item.icon} {item.name}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="fields">
          <label className="field">
            <span className="field__label">日期</span>
            <input className="field__input" type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">备注</span>
            <input
              className="field__input"
              value={note}
              maxLength={30}
              placeholder="点击添加备注"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="sheet__footer">
        {bill ? (
          <button type="button" className="btn btn--danger" onClick={remove}>
            删除
          </button>
        ) : null}
        <button type="button" className="btn btn--primary" onClick={save}>
          {bill ? '保存修改' : '保存'}
        </button>
      </div>
    </Sheet>
  )
}
