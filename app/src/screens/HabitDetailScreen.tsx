import { useEffect, useRef, useState } from 'react'
import { loadHabitDetail, type DetailBundle } from '../db/vizRepo'
import { todayStr } from '../core/date'
import { Heatmap, MonthCalendar } from '../components/charts'
import { useOverlayClose } from '../components/PageOverlay'
import { useAppStore } from '../store/useAppStore'

/** 习惯详情页：月历 + 年度热力图（很简约，完成了就是一个点）；底部可暂停 / 恢复打卡 */
export default function HabitDetailScreen({
  habitId,
  onBack,
  onGone,
  onChanged,
}: {
  habitId: string
  onBack: () => void
  /** 习惯被删除等导致不存在时关闭 */
  onGone?: () => void
  /** 暂停 / 恢复后通知外部刷新列表 */
  onChanged?: () => void
}) {
  const close = useOverlayClose()
  const doClose = close ?? onBack
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bundle, setBundle] = useState<DetailBundle | null>(null)
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState(false)
  // 月历轮播：panel = -1 上个月 / 0 当前 / 1 下个月
  const [panel, setPanel] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(true)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const dragXRef = useRef(0)
  const pendingRef = useRef<{ y: number; m: number } | null>(null)
  const archiveHabit = useAppStore((s) => s.archiveHabit)
  // 回调走 ref：父组件每次渲染都会给新函数，避免它触发重复拉数
  const backRef = useRef(onBack)
  backRef.current = onBack
  const goneRef = useRef(onGone)
  goneRef.current = onGone
  const changedRef = useRef(onChanged)
  changedRef.current = onChanged
  const restoreHabit = useAppStore((s) => s.restoreHabit)

  useEffect(() => {
    let alive = true
    void loadHabitDetail(habitId, year, month)
      .then((b) => {
        if (alive) setBundle(b)
      })
      .catch(() => {
        if (!alive) return
        if (goneRef.current) goneRef.current()
        else backRef.current()
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitId, year, month, nonce])

  // 加载新月份后把轮播归位到中间（此时中间面板内容与刚滑到的面板一致，视觉上无跳动）
  useEffect(() => {
    const p = pendingRef.current
    if (!p || !bundle) return
    if (bundle.ym !== `${p.y}-${String(p.m).padStart(2, '0')}`) return
    pendingRef.current = null
    setAnimating(false)
    setPanel(0)
    setDragX(0)
    const id = requestAnimationFrame(() => setAnimating(true))
    return () => cancelAnimationFrame(id)
  }, [bundle])

  const canNext = monthIsCurrent(year, month)

  function go(dir: 1 | -1) {
    if (panel !== 0) return
    if (dir === 1 && !canNext) return
    setAnimating(true)
    setDragX(0)
    setPanel(dir)
  }

  function onTrackEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.propertyName !== 'transform') return
    if (panel !== 0) {
      const t = shiftYM(year, month, panel)
      pendingRef.current = t
      setYear(t.y)
      setMonth(t.m)
    } else {
      setAnimating(false)
    }
  }

  function pdown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY }
    dragXRef.current = 0
    setAnimating(false)
  }
  function pmove(e: React.PointerEvent) {
    const s = dragRef.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx)) return
    dragXRef.current = dx
    setDragX(dx)
  }
  function pup() {
    const s = dragRef.current
    if (!s) return
    dragRef.current = null
    const dx = dragXRef.current
    if (dx < -55 && canNext) {
      setPanel(1)
      setAnimating(true)
      setDragX(0)
    } else if (dx > 55) {
      setPanel(-1)
      setAnimating(true)
      setDragX(0)
    } else {
      setAnimating(true)
      setDragX(0)
    }
  }

  async function pause() {
    if (busy) return
    setBusy(true)
    await archiveHabit(habitId)
    changedRef.current?.()
    setNonce((n) => n + 1)
    setBusy(false)
  }

  async function resume() {
    if (busy) return
    setBusy(true)
    await restoreHabit(habitId)
    changedRef.current?.()
    setNonce((n) => n + 1)
    setBusy(false)
  }

  if (!bundle) return <div className="loading">载入中…</div>

  const isBad = bundle.habit.type === 'bad'
  const today = todayStr()
  const pausedAt = bundle.habit.archivedAt

  return (
    <div className="screen-detail">
      <div className="sub-head">
        <button className="back-btn" onClick={doClose} aria-label="返回">
          ‹
        </button>
      </div>

      <div className="detail-head">
        <span className="detail-ic" style={{ background: isBad ? '#FF6961' : bundle.habit.color }}>
          {bundle.habit.icon}
        </span>
        <div>
          <div className="detail-name">
            {bundle.habit.name}
            {bundle.paused && <span className="paused-tag">已暂停</span>}
          </div>
          <div className="detail-date">
            {bundle.habit.createdAt.slice(0, 10).replace(/-/g, '.')} 创建 ·{' '}
            {pausedAt ? `${pausedAt.slice(0, 10).replace(/-/g, '.')} 暂停` : '进行中'}
          </div>
        </div>
      </div>

      <div className="detail-stats">
        <span>
          <b>{bundle.stats.count}</b>
          <i>{isBad ? '发生' : '完成'}</i>
        </span>
        <span>
          <b>{bundle.stats.streak}</b>
          <i>{isBad ? '连续未发生' : '连续'}</i>
        </span>
        <span>
          <b>{bundle.stats.rate}%</b>
          <i>{isBad ? '未发生' : '完成'}率</i>
        </span>
      </div>

      <div className="card">
        <div className="card-title row-between">
          <span>
            月历 · {year}年{month}月
          </span>
          <span className="month-nav">
            <button onClick={() => go(-1)} aria-label="上个月">
              ‹
            </button>
            <button onClick={() => go(1)} disabled={!canNext} aria-label="下个月">
              ›
            </button>
          </span>
        </div>
        <div className="cal">
          <div className="cal-wd">
            {WD.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div
            className="month-pager"
            onPointerDown={pdown}
            onPointerMove={pmove}
            onPointerUp={pup}
            onPointerCancel={pup}
          >
            <div
              className="month-track"
              style={{
                transform: `translateX(calc(${-(100 / 3) * (1 + panel)}% + ${dragX}px))`,
                transition: animating ? 'transform 0.28s cubic-bezier(0.32,0.72,0,1)' : 'none',
              }}
              onTransitionEnd={onTrackEnd}
            >
              <div className="month-panel">
                <MonthCalendar
                  cells={bundle.prevMonth.cells}
                  today={today}
                  max={bundle.prevMonth.max}
                  variant={isBad ? 'bad' : 'good'}
                  hideWeekday
                />
              </div>
              <div className="month-panel">
                <MonthCalendar
                  cells={bundle.month.cells}
                  today={today}
                  max={bundle.month.max}
                  variant={isBad ? 'bad' : 'good'}
                  hideWeekday
                />
              </div>
              <div className="month-panel">
                <MonthCalendar
                  cells={bundle.nextMonth.cells}
                  today={today}
                  max={bundle.nextMonth.max}
                  variant={isBad ? 'bad' : 'good'}
                  hideWeekday
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          年度{isBad ? '发生' : '完成'} · {year}
        </div>
        <Heatmap cells={bundle.heat} tone={isBad ? 'red' : 'green'} binary />
        <div className="heat-legend">
          <i className="dot-swatch" style={{ background: isBad ? 'var(--red-soft)' : 'var(--green)' }} />
          <span>{isBad ? '发生' : '完成'}</span>
          <i className="dot-swatch" style={{ background: 'var(--miss-gray)' }} />
          <span>{isBad ? '未发生' : '未完成'}</span>
        </div>
      </div>

      <div className="detail-actions">
        {bundle.paused ? (
          <>
            <button className="primary block" onClick={() => void resume()} disabled={busy}>
              恢复打卡
            </button>
            <p className="pause-hint">
              已暂停于 {pausedAt?.slice(0, 10).replace(/-/g, '.')}，恢复后从今天继续记录
            </p>
          </>
        ) : (
          <>
            <button className="pause-btn" onClick={() => void pause()} disabled={busy}>
              暂停打卡
            </button>
            <p className="pause-hint">暂停后不再计入打卡，历史保留，可随时恢复</p>
          </>
        )}
      </div>
    </div>
  )
}

const WD = ['一', '二', '三', '四', '五', '六', '日']

function shiftYM(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  return { y: ny, m: total - ny * 12 + 1 }
}

function monthIsCurrent(year: number, month: number): boolean {
  const now = new Date()
  return !(year === now.getFullYear() && month === now.getMonth() + 1)
}
