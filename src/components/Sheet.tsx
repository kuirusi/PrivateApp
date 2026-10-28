import { useEffect, useState, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function Sheet({ open, onClose, children }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) {
      return
    }
    setClosing(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
      // 卸载前先释放焦点，避免第三方脚本在元素消失后仍去读取它的布局信息
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  return (
    <div className={`sheet ${closing ? 'sheet--closing' : ''}`}>
      <div className="sheet__mask" onClick={onClose} />
      <div className="sheet__panel" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}
