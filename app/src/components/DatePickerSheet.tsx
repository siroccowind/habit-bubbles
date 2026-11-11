import { useRef, useState } from 'react'
import PageOverlay from './PageOverlay'
import { daysInMonth, todayStr } from '../core/date'

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 周一为 0 … 周日为 6 */
function dowMon(y: number, m: number, d: number): number {
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  return { y: ny, m: total - ny * 12 + 1 }
}

const WD = ['一', '二', '三', '四', '五', '六', '日']

type Cell = { day: number; other: boolean }

/** 固定 42 格（6 行）：前导补上月月末、尾部补下月月初（浅灰） */
function buildCells(y: number, m: number): Cell[] {
  const dim = daysInMonth(y, m)
  const lead = dowMon(y, m, 1)
  const prev = shiftMonth(y, m, -1)
  const prevDim = daysInMonth(prev.y, prev.m)
  const cells: Cell[] = []
  for (let i = 0; i < lead; i++) cells.push({ day: prevDim - lead + 1 + i, other: true })
  for (let d = 1; d <= dim; d++) cells.push({ day: d, other: false })
  let nd = 1
  while (cells.length < 42) cells.push({ day: nd++, other: true })
  return cells
}

/**
 * 日期选择：底部滑入的紧凑悬浮小日历。
 *  · 三栏轮播（上/当前/下月），左右滑动为真实横向滑动过场；
 *  · 固定 6 行高度，切月不跳动；空白用相邻月份浅灰日期补足；
 *  · 选中蓝色实心圆、今天深蓝描边；点选后按统一滑动效果关闭。
 */
export default function DatePickerSheet({
  initial,
  onClose,
  onPick,
}: {
  initial: string
  onClose: () => void
  onPick: (date: string) => void
}) {
  const today = todayStr()
  const overlayClose = useRef<(() => void) | null>(null)
  const doClose = () => (overlayClose.current ? overlayClose.current() : onClose())

  const [view, setView] = useState({ y: Number(initial.slice(0, 4)), m: Number(initial.slice(5, 7)) })
  const [panel, setPanel] = useState(0) // -1 上月 / 0 当前 / 1 下月
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(true)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragXRef = useRef(0)
  const suppressRef = useRef(0)

  const prev = shiftMonth(view.y, view.m, -1)
  const next = shiftMonth(view.y, view.m, 1)

  function pdown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    dragXRef.current = 0
    setAnimating(false)
  }
  function pmove(e: React.PointerEvent) {
    const s = startRef.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx)) return
    dragXRef.current = dx
    setDragX(dx)
  }
  function pup() {
    const s = startRef.current
    if (!s) return
    const dx = dragXRef.current
    const dt = Math.max(1, performance.now() - s.t)
    const speed = Math.abs(dx) / dt
    startRef.current = null
    const commit = Math.abs(dx) > 30 || (Math.abs(dx) > 14 && speed > 0.3)
    if (commit) {
      setPanel(dx < 0 ? 1 : -1)
      setAnimating(true)
      setDragX(0)
      suppressRef.current = performance.now()
    } else {
      setAnimating(true)
      setDragX(0)
    }
  }
  function onTrackEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.propertyName !== 'transform') return
    if (panel !== 0) {
      setView((v) => shiftMonth(v.y, v.m, panel))
      setPanel(0)
      setAnimating(false)
    } else {
      setAnimating(false)
    }
  }
  const go = (dir: 1 | -1) => {
    if (panel !== 0) return
    setAnimating(true)
    setDragX(0)
    setPanel(dir)
  }
  function pick(date: string) {
    if (performance.now() - suppressRef.current < 320) return
    onPick(date)
    doClose()
  }

  function renderGrid(y: number, m: number) {
    const cells = buildCells(y, m)
    return (
      <div className="cal-grid">
        {cells.map((c, i) => {
          if (c.other) {
            return (
              <span key={i} className="cal-cell other">
                {c.day}
              </span>
            )
          }
          const date = ymd(y, m, c.day)
          const future = date > today
          const isToday = date === today
          const isSel = date === initial
          return (
            <button
              key={i}
              className={`cal-cell${future ? ' disabled' : ''}${isToday ? ' today' : ''}${isSel ? ' sel' : ''}`}
              disabled={future}
              onClick={() => pick(date)}
            >
              {c.day}
            </button>
          )
        })}
      </div>
    )
  }

  const basePct = -(100 / 3) * (1 + panel)

  return (
    <PageOverlay from="bottom" onBack={onClose} closeRef={overlayClose}>
      <div className="sheet cal-sheet">
        <div className="cal">
          <div className="cal-head">
            <button className="cal-nav" onClick={() => go(-1)} aria-label="上个月">
              ‹
            </button>
            <span className="cal-title">
              {view.y}.{String(view.m).padStart(2, '0')}
            </span>
            <button className="cal-nav" onClick={() => go(1)} aria-label="下个月">
              ›
            </button>
          </div>

          <div className="cal-wd">
            {WD.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div
            className="cal-view"
            onPointerDown={pdown}
            onPointerMove={pmove}
            onPointerUp={pup}
            onPointerCancel={pup}
          >
            <div
              className="cal-track"
              style={{
                transform: `translateX(calc(${basePct}% + ${dragX}px))`,
                transition: animating ? 'transform 0.28s cubic-bezier(0.32,0.72,0,1)' : 'none',
              }}
              onTransitionEnd={onTrackEnd}
            >
              <div className="cal-page">{renderGrid(prev.y, prev.m)}</div>
              <div className="cal-page">{renderGrid(view.y, view.m)}</div>
              <div className="cal-page">{renderGrid(next.y, next.m)}</div>
            </div>
          </div>

          <button className="cal-today" onClick={() => pick(today)}>
            回到今天
          </button>
        </div>
      </div>
    </PageOverlay>
  )
}
