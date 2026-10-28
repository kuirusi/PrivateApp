import { useEffect, useState } from 'react'

let notify: ((message: string) => void) | null = null

export function toast(message: string): void {
  if (notify) {
    notify(message)
  }
}

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    notify = setMessage
    return () => {
      notify = null
    }
  }, [])

  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(() => setMessage(null), 1800)
    return () => window.clearTimeout(timer)
  }, [message])

  if (!message) {
    return null
  }

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
