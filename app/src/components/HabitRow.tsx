import type { Habit } from '../db/schema'
import { useSwipeRow } from '../hooks/useSwipeRow'

interface Props {
  habit: Habit
  kind: 'good' | 'bad'
  done?: boolean
  happened?: boolean
  /** 本周 7 天（周一起步）：true = 完成/发生，false = 未完成/未发生，null = 未来 */
  week: Array<boolean | null>
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void
  onArchive: () => void
  onDelete: () => void
}

/** 习惯行：左滑露出「归档 / 删除」，点主体打卡；本周表现用 7 个小圆点表示，不用文字 */
export default function HabitRow({ habit, kind, done, happened, week, onTap, onArchive, onDelete }: Props) {
  const swipe = useSwipeRow()
  const isBad = kind === 'bad'

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
        className={'row' + (isBad ? ' bad' : '') + (done || happened ? ' done' : '')}
        style={{ transform: `translateX(${swipe.dx}px)` }}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onClick={(e) => swipe.handleClick(() => onTap(e))}
      >
        <span className="ic" style={{ background: isBad ? '#8E8E93' : habit.color }}>
          {habit.icon}
        </span>
        <span className="row-name">{habit.name}</span>
        <span className="week-dots">
          {week.map((v, i) => {
            const cls =
              v === null
                ? 'wd future'
                : isBad
                  ? v
                    ? 'wd bad'
                    : 'wd none'
                  : v
                    ? 'wd done'
                    : 'wd miss'
            return <i key={i} className={cls} />
          })}
        </span>
        {isBad ? <span className={happened ? 'chk bad' : 'chk'} /> : <span className={done ? 'chk on' : 'chk'} />}
      </button>
    </div>
  )
}
