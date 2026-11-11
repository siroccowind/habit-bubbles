import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSwipeBack } from '../hooks/useSwipeBack'

/** 子页面通过它拿到「带动画的关闭」，使点退出按钮与滑动手势效果一致 */
const OverlayCloseContext = createContext<(() => void) | null>(null)

export function useOverlayClose(): (() => void) | null {
  return useContext(OverlayCloseContext)
}

/**
 * 统一的覆盖层外壳（纯 transform 过渡，进出场丝滑、不跳帧）：
 *  · from="right"：从右侧滑入，退出向右滑出（设置子页 / 习惯详情）；保留左边缘右滑返回手势。
 *  · from="bottom"：从底部滑入，退出向下滑出（新建习惯 / 收藏室 / 日历）；支持下滑手势退出，
 *                  也支持点上方空白处退出。
 *
 * 设计要点：
 *  1) 覆盖层是“悬浮在上面的一层”，底层页面完全不动（不做位移/缩放），退出时不会整屏闪。
 *  2) 进场/退场都用内联 transform + CSS transition，不用 keyframes，
 *     避免旧版“退出动画从 0 重播导致回跳卡顿”。
 *  3) 退出过渡结束（transitionend）才卸载，并带 500ms 兜底，防止极端情况下卡死。
 */
export default function PageOverlay({
  onBack,
  children,
  className = '',
  from = 'right',
  closeRef,
}: {
  onBack: () => void
  children: ReactNode
  className?: string
  from?: 'right' | 'bottom'
  /** 可选：把「带动画的关闭」暴露给自身就是 PageOverlay 父级的组件（如新建习惯 / 日历） */
  closeRef?: { current: (() => void) | null }
}) {
  const isBottom = from === 'bottom'
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [vDrag, setVDrag] = useState(false)
  const closedRef = useRef(false)
  const doneRef = useRef(false)
  const fallbackRef = useRef<number | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const dragYRef = useRef(0)
  const requestCloseRef = useRef<() => void>(() => {})
  const offscreen = isBottom ? 'translate3d(0, 100%, 0)' : 'translate3d(100%, 0, 0)'

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => {
      cancelAnimationFrame(id)
      if (fallbackRef.current) window.clearTimeout(fallbackRef.current)
    }
  }, [])

  // 打开覆盖层时锁住底层滚动/回弹：避免拖拽弹层时背景页上下窜、顶部闪黑
  useEffect(() => {
    const body = document.body
    const docEl = document.documentElement
    const prevOverflow = body.style.overflow
    const prevOverscroll = docEl.style.overscrollBehavior
    body.style.overflow = 'hidden'
    docEl.style.overscrollBehavior = 'none'
    return () => {
      body.style.overflow = prevOverflow
      docEl.style.overscrollBehavior = prevOverscroll
    }
  }, [])

  function finishClose() {
    if (doneRef.current) return
    doneRef.current = true
    if (fallbackRef.current) {
      window.clearTimeout(fallbackRef.current)
      fallbackRef.current = null
    }
    onBack()
  }

  function requestClose() {
    if (closedRef.current) return
    closedRef.current = true
    setClosing(true)
    // 兜底：极端环境（禁用过渡 / 元素不可见）transitionend 不触发时，最多 500ms 强制卸载
    fallbackRef.current = window.setTimeout(finishClose, 500)
  }
  requestCloseRef.current = requestClose
  if (closeRef) closeRef.current = requestClose

  // 底部弹层：下滑退出（只接管“在顶部往下拖”的竖向手势，不影响内部正常滚动）
  useEffect(() => {
    if (!isBottom) return
    const el = layerRef.current
    if (!el) return
    let sy = 0
    let sx = 0
    let active = false
    let atTop = true
    const scrollTopNow = () => {
      const sc = el.querySelector<HTMLElement>('.sheet, .screen-collection')
      return sc ? sc.scrollTop : 0
    }
    const ts = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      sy = t.clientY
      sx = t.clientX
      active = false
      atTop = scrollTopNow() <= 0
    }
    const tm = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      const dy = t.clientY - sy
      const dx = t.clientX - sx
      if (!active) {
        if (Math.abs(dy) < 8) return
        // 只接管向下、基本竖直、且内容已在顶部的手势
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || !atTop) return
        active = true
        setVDrag(true)
      }
      if (dy > 0) {
        e.preventDefault()
        dragYRef.current = dy
        setDragY(dy)
      }
    }
    const te = () => {
      if (!active) {
        setVDrag(false)
        return
      }
      active = false
      setVDrag(false)
      const h = window.innerHeight
      const d = dragYRef.current
      dragYRef.current = 0
      if (d > Math.min(160, h * 0.22)) {
        requestCloseRef.current()
      } else {
        setDragY(0)
      }
    }
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te)
    el.addEventListener('touchcancel', te)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
      el.removeEventListener('touchcancel', te)
    }
  }, [isBottom])

  const swipe = useSwipeBack(requestClose)
  const bind = isBottom ? {} : swipe.bind
  const dragging = isBottom ? vDrag : swipe.dragging

  let transform: string
  if (isBottom) {
    if (closing) transform = offscreen
    else if (open) transform = dragY ? `translate3d(0, ${dragY}px, 0)` : 'translate3d(0, 0, 0)'
    else transform = offscreen
  } else if (dragging) {
    transform = `translate3d(${swipe.dx}px, 0, 0)`
  } else if (closing) {
    transform = offscreen
  } else if (open) {
    transform = 'translate3d(0, 0, 0)'
  } else {
    transform = offscreen
  }

  const node = (
    <>
      <div
        className={`overlay-backdrop${open && !closing ? ' show' : ''}`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={layerRef}
        className={[
          isBottom ? 'bottom-sheet-layer' : 'settings-layer',
          'page-overlay',
          isBottom ? 'from-bottom' : '',
          dragging ? 'dragging' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ transform }}
        onClick={
          isBottom
            ? (e) => {
                // 点 sheet 以外的空白（容器本身）关闭
                if (e.target === e.currentTarget) requestClose()
              }
            : undefined
        }
        onTransitionEnd={(e) => {
          if (!closing) return
          if (e.target !== e.currentTarget) return
          if (e.propertyName !== 'transform') return
          finishClose()
        }}
        {...bind}
      >
        {children}
      </div>
    </>
  )

  return createPortal(
    <OverlayCloseContext.Provider value={requestClose}>{node}</OverlayCloseContext.Provider>,
    document.body,
  )
}
