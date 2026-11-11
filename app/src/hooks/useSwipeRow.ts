import { useRef, useState } from 'react'

const ACTION_W = 128

/** 左滑露出操作区（归档 / 删除）的手势逻辑，习惯行与小恶魔卡片共用 */
export function useSwipeRow() {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const base = useRef(0)
  const moved = useRef(false)

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    start.current = { x: e.clientX, y: e.clientY }
    base.current = dx
    moved.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 某些环境不支持 capture，忽略 */
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!start.current) return
    const mx = e.clientX - start.current.x
    const my = e.clientY - start.current.y
    if (!moved.current && Math.abs(mx) < 8 && Math.abs(my) < 8) return
    if (!moved.current && Math.abs(my) > Math.abs(mx)) {
      start.current = null
      moved.current = true
      return
    }
    moved.current = true
    setDx(Math.max(-ACTION_W - 16, Math.min(0, base.current + mx)))
  }

  function onPointerUp() {
    if (!start.current) return
    start.current = null
    setDx((prev) => (prev < -ACTION_W / 2 ? -ACTION_W : 0))
  }

  /** 点击主体：拖拽后不触发；操作区展开时先收起 */
  function handleClick(action: () => void) {
    if (moved.current) {
      moved.current = false
      return
    }
    if (dx !== 0) {
      setDx(0)
      return
    }
    action()
  }

  /** 刚刚是否发生了拖拽（点击时应忽略）；调用后复位 */
  function didDrag(): boolean {
    if (!moved.current) return false
    moved.current = false
    return true
  }

  return { dx, setDx, onPointerDown, onPointerMove, onPointerUp, handleClick, didDrag }
}
