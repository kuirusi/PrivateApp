import { useEffect, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

let ask: Ask | null = null

/**
 * App 内确认弹窗。
 * Android WebView 默认不实现 window.confirm，统一走这里保证两端行为一致。
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!ask) {
    return Promise.resolve(window.confirm(`${options.title}${options.message ? `\n${options.message}` : ''}`))
  }
  return ask(options)
}

export default function ConfirmHost() {
  const [current, setCurrent] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null)

  useEffect(() => {
    ask = (options) =>
      new Promise<boolean>((resolve) => {
        setCurrent({ options, resolve })
      })
    return () => {
      ask = null
    }
  }, [])

  useEffect(() => {
    if (!current) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [current])

  if (!current) {
    return null
  }

  const close = (value: boolean) => {
    current.resolve(value)
    setCurrent(null)
  }

  return (
    <div className="dialog">
      <div className="dialog__mask" onClick={() => close(false)} />
      <div className="dialog__panel" role="alertdialog" aria-modal="true">
        <p className="dialog__title">{current.options.title}</p>
        {current.options.message ? <p className="dialog__message">{current.options.message}</p> : null}
        <div className="dialog__actions">
          <button type="button" className="dialog__btn" onClick={() => close(false)}>
            {current.options.cancelText ?? '取消'}
          </button>
          <button
            type="button"
            className={`dialog__btn dialog__btn--primary ${current.options.danger ? 'dialog__btn--danger' : ''}`}
            onClick={() => close(true)}
          >
            {current.options.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
