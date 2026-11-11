import { useEffect, useRef, useState } from 'react'
import { loadStats, type StatsBundle } from '../db/vizRepo'
import { parseDate } from '../core/date'
import { DivergingBarChart, Heatmap } from '../components/charts'

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

function dateLabel(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.')
}

/** 统计页：好/坏习惯做成可左右滑动的分页；顶部数字 + 柱状图 + 频次分布 + 全部习惯列表 */
export default function StatsScreen({
  type,
  onTypeChange,
  onOpenHabit,
}: {
  type: 'good' | 'bad'
  onTypeChange: (t: 'good' | 'bad') => void
  onOpenHabit: (id: string) => void
}) {
  const [goodB, setGoodB] = useState<StatsBundle | null>(null)
  const [badB, setBadB] = useState<StatsBundle | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; active: boolean }>({ x: 0, active: false })
  const start = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([loadStats('good', new Date().getFullYear()), loadStats('bad', new Date().getFullYear())]).then(
      ([g, b]) => {
        if (!alive) return
        setGoodB(g)
        setBadB(b)
      },
    )
    return () => {
      alive = false
    }
  }, [])

  if (!goodB || !badB) return <div className="loading">载入中…</div>

  function onDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, active: false })
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (!drag.active) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      if (Math.abs(dy) > Math.abs(dx)) {
        start.current = null
        return
      }
      setDrag({ x: dx, active: true })
    } else {
      setDrag({ x: dx, active: true })
    }
  }
  function onUp() {
    if (!start.current) return
    const dx = drag.active ? drag.x : 0
    start.current = null
    setDrag({ x: 0, active: false })
    if (dx < -40 && type === 'good') onTypeChange('bad')
    else if (dx > 40 && type === 'bad') onTypeChange('good')
  }

  const base = type === 'good' ? '0%' : '-50%'
  const trackStyle: React.CSSProperties = {
    transform: `translateX(calc(${base} + ${drag.active ? drag.x + 'px' : '0px'}))`,
    transition: drag.active ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
  }

  function renderPanel(bundle: StatsBundle) {
    const isBad = bundle.type === 'bad'
    // 暂停的习惯不在「全部习惯」里显示，只能从设置里的暂停页恢复
    const listed = bundle.habits.filter((h) => !h.paused)
    const dayPoint = selectedDay ? bundle.daily.find((d) => d.date === selectedDay) : null
    const ramp = isBad
      ? ['var(--future-gray)', 'var(--red-1)', 'var(--red-2)', 'var(--red-3)', 'var(--red-soft)']
      : ['var(--future-gray)', 'var(--green-1)', 'var(--green-2)', 'var(--green-3)', 'var(--green)']
    return (
      <>
        <div className="card top-stats">
          <div className="top-item">
            <b>{bundle.top.count}</b>
            <span>{isBad ? '发生次数' : '完成次数'}</span>
          </div>
          <div className="top-item">
            <b>{bundle.top.days}</b>
            <span>{isBad ? '发生天数' : '打卡天数'}</span>
          </div>
          <div className="top-item">
            <b>{bundle.top.streak}</b>
            <span>{isBad ? '连续未发生' : '最长连续'}</span>
          </div>
          <div className="top-item">
            <b>{bundle.top.rate}%</b>
            <span>{isBad ? '未发生率' : '完成率'}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">近 30 天 · 每日{isBad ? '发生' : '完成'}</div>
          <DivergingBarChart
            up={bundle.daily}
            down={[]}
            tone={isBad ? 'red' : 'green'}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
          {dayPoint && (
            <div className="day-detail">
              <span className="dd-date">
                {(() => {
                  const d = parseDate(dayPoint.date)
                  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_CN[d.getDay()]}`
                })()}
              </span>
              <span className="dd-names">
                {dayPoint.names.length > 0
                  ? `${isBad ? '发生' : '完成'}：${dayPoint.names.join(' · ')}`
                  : '当天没有记录'}
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title row-between">
            <span>打卡频次分布</span>
            <span className="heat-legend">
              <span>无</span>
              <i className="dot-swatch" style={{ background: 'var(--miss-gray)' }} />
              {ramp.slice(1).map((c) => (
                <i key={c} className="dot-swatch" style={{ background: c }} />
              ))}
              <span>较多</span>
            </span>
          </div>
          <Heatmap cells={bundle.heat} tone={isBad ? 'red' : 'green'} />
        </div>

        {listed.length > 0 && (
          <>
            <div className="group-title">全部习惯</div>
            <div className="habit-list">
              {listed.map((h) => (
                <button key={h.id} className="habit-card" onClick={() => onOpenHabit(h.id)}>
                  <span className="ic" style={{ background: h.type === 'bad' ? '#FF6961' : h.color }}>
                    {h.icon}
                  </span>
                  <span className="hc-main">
                    <span className="hc-name">{h.name}</span>
                    <span className="hc-date">
                      {dateLabel(h.createdAt)} 创建 · 进行中
                    </span>
                  </span>
                  <span className="hc-stats">
                    <span>
                      <b>{h.count}</b>
                      <i>{isBad ? '发生' : '完成'}</i>
                    </span>
                    <span>
                      <b>{h.streak}</b>
                      <i>连续</i>
                    </span>
                    <span>
                      <b>{h.rate}%</b>
                      <i>{isBad ? '未发生' : '完成'}率</i>
                    </span>
                  </span>
                  <span className="hc-arrow">›</span>
                </button>
              ))}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="screen-stats">
      <header className="stats-head">
        <h1>统计</h1>
        <div className="seg sm">
          <button className={type === 'good' ? 'on' : ''} onClick={() => onTypeChange('good')}>
            好习惯
          </button>
          <button className={type === 'bad' ? 'on' : ''} onClick={() => onTypeChange('bad')}>
            坏习惯
          </button>
        </div>
      </header>

      <div
        className="stats-pager"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="stats-track" style={trackStyle}>
          <div className="stats-panel">
            {goodB.habits.length === 0 ? (
              <div className="placeholder-card">
                <p className="ph-title">还没有好习惯</p>
                <p>去「习惯」页创建几个，数据从第一次打卡开始积累。</p>
              </div>
            ) : (
              renderPanel(goodB)
            )}
          </div>
          <div className="stats-panel">
            {badB.habits.length === 0 ? (
              <div className="placeholder-card">
                <p className="ph-title">还没有坏习惯</p>
                <p>去「习惯」页创建几个，数据从第一次记录开始积累。</p>
              </div>
            ) : (
              renderPanel(badB)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
