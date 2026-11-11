import { useEffect, useRef, useState } from 'react'
import type { Habit } from '../db/schema'
import ImpSprite from './ImpSprite'

interface Props {
  habit: Habit
  /** 今天是否已记录（二值） */
  happened: boolean
  /** 连续未发生天数 */
  cleanStreak: number
  /** 漂浮相位（错开动画） */
  phase: number
  /** 点击 = 诚实记录一次；返回 true = 本次为新记录（放星光） */
  onTap: () => Promise<boolean>
}

/**
 * 气泡模式下的暗影呈现：暗影幽灵泡。
 * 与好习惯气泡同一「漂浮 + 点击」语言，但深色半透明、泡体下垂、无高光——
 * 视觉上一眼区分，点击不是「完成」而是「诚实记录」。
 */
export default function ImpGhost({ habit, happened, cleanStreak, phase, onTap }: Props) {
  const [spark, setSpark] = useState(0)
  const sparkTimer = useRef(0)

  // 星光播放完毕即卸载：切页（display 切换）回来不会重放
  useEffect(() => {
    if (spark === 0) return
    sparkTimer.current = window.setTimeout(() => setSpark(0), 750)
    return () => window.clearTimeout(sparkTimer.current)
  }, [spark])

  return (
    <button
      className={'imp-ghost' + (happened ? ' recorded' : '')}
      style={{ animationDelay: `${phase * -0.9}s` }}
      onClick={() =>
        void onTap().then((first) => {
          if (first) setSpark((n) => n + 1)
        })
      }
      aria-label={`记录 ${habit.name}`}
    >
      <span className="ghost-bubble">
        <ImpSprite streak={cleanStreak} asleep={!happened} size={38} />
        {spark > 0 && (
          <span key={spark} className="imp-sparks" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
      <span className="ghost-name">{habit.name}</span>
    </button>
  )
}
