import { useEffect, useState } from 'react'
import { todayStr } from './date'

/**
 * 当前日期（本地日）。每 30 秒 + 窗口聚焦时检查，
 * 跨午夜时返回新日期——用于「当天掉落物次日收起」等跨天逻辑。
 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr)

  useEffect(() => {
    const check = () => {
      const t = todayStr()
      setToday((prev) => (prev === t ? prev : t))
    }
    const id = window.setInterval(check, 30000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}
