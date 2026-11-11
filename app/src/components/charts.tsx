// 自绘 SVG 图表组件：双向柱状 / 圆圈月历 / 热力图 / 统计卡
// 色彩全部走 CSS 变量（style 传入，SVG attribute 不支持 var()），随主题（浅色/深色）切换

import type { DayPoint, HeatCell, MonthCell } from '../core/viz'

const RAMP_GREEN = ['var(--green-1)', 'var(--green-2)', 'var(--green-3)', 'var(--green)']
const RAMP_RED = ['var(--red-1)', 'var(--red-2)', 'var(--red-3)', 'var(--red-soft)']
const GREEN = 'var(--green)'
const GREEN_DARK = 'var(--green-dark)'
const RED = 'var(--red-soft)'
const RED_DARK = 'var(--red-dark)'
const RED_FILL = 'var(--red-fill)'

/** 双向竖状图：零线向上 = 好习惯完成数（绿），向下 = 坏习惯发生数（红），左侧带刻度 */
export function DivergingBarChart({
  up,
  down,
  selected,
  onSelect,
  tone = 'green',
}: {
  up: DayPoint[]
  down: DayPoint[]
  selected: string | null
  onSelect: (date: string) => void
  tone?: 'green' | 'red'
}) {
  const col = tone === 'red' ? { solid: RED, dark: RED_DARK } : { solid: GREEN, dark: GREEN_DARK }

  const W = 430
  const leftPad = 14
  const n = Math.max(up.length, down.length, 1)
  const step = (W - leftPad - 4) / n
  const maxUp = Math.max(0, ...up.map((d) => d.count))
  const maxDown = Math.max(0, ...down.map((d) => d.count))
  const unit = Math.min(14, 80 / Math.max(1, maxUp, maxDown))
  const upH = maxUp * unit
  const downH = maxDown * unit
  const zeroY = upH + 5
  const H = upH + downH + 10
  const barW = Math.max(4, step * 0.62)

  const totalUp = up.reduce((s, p) => s + (p.count || 0), 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`近 30 天每日完成次数柱状图，共 ${totalUp} 次，单日最高 ${maxUp} 次`}>
      {Array.from({ length: maxUp }, (_, i) => {
        const y = zeroY - (i + 1) * unit
        return (
          <g key={`u${i}`}>
            <line x1={leftPad} y1={y} x2={W - 2} y2={y} style={{ stroke: 'var(--miss-gray)' }} strokeWidth={1} />
            <text x={leftPad - 4} y={y + 3} fontSize={9} style={{ fill: 'var(--text-3)' }} textAnchor="end">
              {i + 1}
            </text>
          </g>
        )
      })}
      {Array.from({ length: maxDown }, (_, i) => {
        const y = zeroY + (i + 1) * unit
        return (
          <g key={`d${i}`}>
            <line x1={leftPad} y1={y} x2={W - 2} y2={y} style={{ stroke: 'var(--miss-gray)' }} strokeWidth={1} />
            <text x={leftPad - 4} y={y + 3} fontSize={9} style={{ fill: 'var(--text-3)' }} textAnchor="end">
              {i + 1}
            </text>
          </g>
        )
      })}
      <text x={leftPad - 4} y={zeroY + 3} fontSize={9} style={{ fill: 'var(--text-3)' }} textAnchor="end">
        0
      </text>
      {up.map((d, i) =>
        d.count === 0 ? null : (
          <rect
            key={d.date}
            x={leftPad + i * step + (step - barW) / 2}
            y={zeroY - d.count * unit}
            width={barW}
            height={d.count * unit}
            rx={2}
            style={{ fill: selected === d.date ? col.dark : col.solid }}
            onClick={() => onSelect(d.date)}
          >
            <title>{`${d.date}：完成 ${d.count} 个`}</title>
          </rect>
        ),
      )}
      {down.map((d, i) =>
        d.count === 0 ? null : (
          <rect
            key={d.date}
            x={leftPad + i * step + (step - barW) / 2}
            y={zeroY}
            width={barW}
            height={d.count * unit}
            rx={2}
            style={{ fill: selected === d.date ? RED_DARK : RED }}
            onClick={() => onSelect(d.date)}
          >
            <title>{`${d.date}：发生 ${d.count} 个`}</title>
          </rect>
        ),
      )}
      <line x1={leftPad} y1={zeroY} x2={W - 2} y2={zeroY} style={{ stroke: 'var(--line)' }} strokeWidth={1} />
    </svg>
  )
}

const WD = ['一', '二', '三', '四', '五', '六', '日']

/** 圆圈月历：好习惯 完成=绿/未完成=红；坏习惯 发生=红/没做=灰；创建前/未来 = 灰圆 */
export function MonthCalendar({
  cells,
  today,
  max,
  variant,
  hideWeekday,
}: {
  cells: MonthCell[]
  today: string
  max: number
  variant: 'good' | 'bad'
  /** 三栏轮播时只在外层保留一次周标题 */
  hideWeekday?: boolean
}) {
  function doneStyle(count: number): { background: string; color: string } {
    if (max <= 1) return { background: GREEN, color: '#fff' }
    const lv = Math.min(4, Math.max(1, 1 + Math.floor(((count - 1) / max) * 3.999)))
    return { background: RAMP_GREEN[lv - 1], color: lv >= 3 ? '#fff' : 'var(--text)' }
  }

  const doneDays = cells.filter((c) => c.state === 'done').length
  const totalDays = cells.filter((c) => c.state === 'done' || c.state === 'miss').length

  return (
    <div className="cal" role="img" aria-label={`该月完成 ${doneDays} 天，共 ${totalDays} 天需要记录`}>
      {!hideWeekday && (
        <div className="cal-wd">
          {WD.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      )}
      <div className="cal-grid">
        {cells.map((c, i) => {
          if (c.day === 0) return <span key={i} className="cal-cell pad" />
          const isToday = c.date === today
          let cls = `cal-cell ${c.state}`
          if (isToday) {
            if (variant === 'bad') cls += ' today today-bad'
            else if (c.state === 'miss') cls += ' today today-na'
            else cls += ' today'
          }
          if (c.state === 'done') {
            return (
              <span
                key={i}
                className={cls}
                style={variant === 'bad' ? { background: 'var(--na-gray)', color: 'var(--text-3)' } : doneStyle(c.count)}
              >
                {c.day}
              </span>
            )
          }
          if (c.state === 'miss') {
            if (variant === 'bad') {
              // 坏习惯「发生了」：红色 + 红色边框，清楚可见
              return (
                <span
                  key={i}
                  className={cls}
                  style={{ background: RED, color: '#fff', boxShadow: `inset 0 0 0 1.5px ${RED_DARK}` }}
                >
                  {c.day}
                </span>
              )
            }
            if (isToday) {
              // 好习惯今日未完成：浅灰，不要绿色边框
              return (
                <span key={i} className={cls} style={{ background: 'var(--miss-gray)', color: 'var(--text-3)' }}>
                  {c.day}
                </span>
              )
            }
            return (
              <span key={i} className={cls} style={{ background: RED_FILL, color: RED_DARK }}>
                {c.day}
              </span>
            )
          }
          return (
            <span key={i} className={cls}>
              {c.day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** 年度点阵：创建前 = 灰；binary = 完成/发生即一个点；否则按频次分色深 */
export function Heatmap({
  cells,
  tone,
  binary,
}: {
  cells: HeatCell[]
  tone: 'green' | 'red'
  binary?: boolean
}) {
  const cols = Math.max(1, ...cells.map((c) => c.col + 1))
  const cell = 6.5
  const gap = 1.5
  const step = cell + gap
  const leftPad = 16
  const topPad = 12
  const W = leftPad + cols * step
  const H = topPad + 7 * step
  const RAMP = tone === 'red' ? RAMP_RED : RAMP_GREEN
  const SOLID = tone === 'red' ? 'var(--red-soft)' : 'var(--green)'

  // 色阶按「当日完成数 / 当日期望数」归一：全做了 = 最深，没做 = 灰
  function fill(c: HeatCell): string {
    if (c.na) return 'var(--na-gray)'
    if (c.future) return 'var(--future-gray)'
    if (c.count === 0) return 'var(--miss-gray)'
    if (binary) return SOLID
    const ratio = c.count / Math.max(1, c.expected)
    const lv = ratio >= 0.75 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1
    return RAMP[lv - 1]
  }
  const monthLabels: Array<{ col: number; label: string }> = []
  const seen = new Set<number>()
  for (const c of cells) {
    const m = Number(c.date.slice(5, 7))
    if (!seen.has(m)) {
      seen.add(m)
      monthLabels.push({ col: c.col, label: `${m}月` })
    }
  }

  const activeDays = cells.filter((c) => c.count > 0).length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart heat" role="img" aria-label={`年度打卡热力图，有记录 ${activeDays} 天`}>
      {[0, 2, 4].map((r, i) => (
        <text key={r} x={0} y={topPad + r * step + cell - 1} fontSize={9} style={{ fill: 'var(--text-3)' }}>
          {['一', '三', '五'][i]}
        </text>
      ))}
      {monthLabels.map((m) => (
        <text key={m.label} x={leftPad + m.col * step} y={9} fontSize={9} style={{ fill: 'var(--text-3)' }}>
          {m.label}
        </text>
      ))}
      {cells.map((c) => (
        <rect
          key={c.date}
          x={leftPad + c.col * step}
          y={topPad + c.row * step}
          width={cell}
          height={cell}
          rx={1.5}
          style={{ fill: fill(c) }}
        >
          <title>{`${c.date}：${c.count} 个`}</title>
        </rect>
      ))}
    </svg>
  )
}

export function StatCards({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
