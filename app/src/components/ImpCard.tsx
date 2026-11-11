import { useEffect, useRef, useState } from 'react'
import type { Habit } from '../db/schema'
import { useSwipeRow } from '../hooks/useSwipeRow'
import ImpSprite from './ImpSprite'

interface Props {
  habit: Habit
  /** 今天是否已记录（二值） */
  happened: boolean
  /** 连续未发生天数 */
  cleanStreak: number
  /** 本周 7 天：true = 发生，false = 未发生，null = 未来 / 暂停 */
  week: Array<boolean | null>
  /** 点击 = 诚实记录一次；返回 true = 本次为新记录（放星光） */
  onTap: () => Promise<boolean>
  onArchive: () => void
  onDelete: () => void
}

/** 暗影区行：与好习惯行完全同一套排版（图标位 / 名称 / 本周点阵 / 记录圆点），左滑归档删除 */
export default function ImpCard({ habit, happened, cleanStreak, week, onTap, onArchive, onDelete }: Props) {
  const swipe = useSwipeRow()
  const [spark, setSpark] = useState(0)
  const sparkTimer = useRef(0)

  // 星光播放完毕即卸载：切页（display 切换）回来不会重放
  useEffect(() => {
    if (spark === 0) return
    sparkTimer.current = window.setTimeout(() => setSpark(0), 750)
    return () => window.clearTimeout(sparkTimer.current)
  }, [spark])

  return (
    <div className="row-wrap">
      <div className="row-actions">
        <button className="act archive" onClick={onArchive}>
          暂停
        </button>
        <button className="act delete" onClick={onDelete}>
          删除
        </button>
      </div>
      <button
        className={'row bad' + (happened ? ' recorded' : '')}
        style={{ transform: `translateX(${swipe.dx}px)` }}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onClick={() =>
          void swipe.handleClick(async () => {
            const first = await onTap()
            if (first) setSpark((n) => n + 1)
          })
        }
        aria-label={`记录 ${habit.name}`}
      >
        <span className={'imp-slot' + (happened ? ' hot' : '')}>
          <ImpSprite streak={cleanStreak} asleep={!happened} size={26} />
        </span>
        <span className="row-name">
          {habit.name}
          <i className="imp-clean">· 连续 {cleanStreak} 天</i>
        </span>
        <span className="week-dots">
          {week.map((v, i) => {
            const cls = v === null ? 'wd future' : v ? 'wd bad' : 'wd none'
            return <i key={i} className={cls} />
          })}
        </span>
        <span className={happened ? 'chk bad' : 'chk'} />
        {spark > 0 && (
          <span key={spark} className="imp-sparks" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
    </div>
  )
}
