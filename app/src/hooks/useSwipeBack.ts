import { useRef, useState } from 'react'

/** 左边缘触发区宽度（px）：从屏幕左侧 30px 内起手才算「返回手势」，避免和内容滑动打架 */
const EDGE = 30

/**
 * iOS 风格「左边缘右滑返回」。
 *  · 只有从屏幕最左侧起手才接管，其余手势完全不受影响；
 *  · 跟手位移（1:1），松手按位移比例 + 速度判定：够远或够快 → 关闭，否则弹回；
 *  · 关闭时不自己写动画/延时——把「松手」交给调用方（PageOverlay）用统一的过渡滑出，
 *    避免旧版 set(w) + setTimeout 与退出动画叠加造成的停顿。
 */
export function useSwipeBack(onBack: () => void) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const cur = useRef(0)

  function set(v: number) {
    cur.current = v
    setDx(v)
  }

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.clientX > EDGE) return
    // 手指落在按钮/输入框上时不接管：否则左边缘的返回按钮会被手势吃掉点击
    const t = e.target as HTMLElement | null
    if (t?.closest('button, a, input, textarea, select')) return
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const s = start.current
    if (!s) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (mx <= 0) {
      set(0)
      return
    }
    // 竖向意图明显且横向还很短 → 放弃接管（让页面正常滚动）
    if (mx < 10 && Math.abs(my) > 10) {
      start.current = null
      setDragging(false)
      set(0)
      return
    }
    set(Math.min(window.innerWidth, mx))
  }

  function finish() {
    const s = start.current
    if (!s) return
    start.current = null
    setDragging(false)
    const w = window.innerWidth
    const moved = cur.current
    const v = moved / Math.max(1, performance.now() - s.t) // px/ms
    if (moved > w * 0.3 || (v > 0.5 && moved > 56)) {
      // 松手即交给外层统一滑出（拖拽态结束 → transition 生效 → 从当前位移平滑到屏外）
      onBack()
    } else {
      set(0)
    }
  }

  return {
    dx,
    dragging,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
