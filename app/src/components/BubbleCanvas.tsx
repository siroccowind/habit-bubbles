import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Habit } from '../db/schema'

interface Props {
  habits: Array<{ habit: Habit; streak: number }>
  /** 戳破回调：返回该习惯在视口中的中心坐标 */
  onPop: (habit: Habit, cx: number, cy: number) => void
}

interface BubbleState {
  id: string
  x: number // 0..1 归一化（中心点）
  y: number
  vx: number
  vy: number
}

const MAX_SPEED = 0.028 // 归一化/秒（约 10px/s，缓慢漂浮）
const WANDER = 0.02 // 随机扰动力度
const PAD = 6 // 气泡与画布边缘的最小留白

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function makeState(id: string, index: number): BubbleState {
  const seed = hash(id)
  // 初始位置按 3 列 × 2 行错开，再叠一点随机抖动——避免一上来就叠在一起
  const cols = 3
  const col = index % cols
  const row = Math.floor(index / cols) % 2
  const jx = ((seed % 100) / 100 - 0.5) * 0.08
  const jy = (((seed >> 9) % 100) / 100 - 0.5) * 0.1
  return {
    id,
    x: (col + 0.5) / cols + jx,
    y: (row + 0.5) / 2 + jy,
    vx: (((seed >> 17) % 100) / 100 - 0.5) * MAX_SPEED,
    vy: (((seed >> 23) % 100) / 100 - 0.5) * MAX_SPEED,
  }
}

/**
 * 气泡画布：好习惯 = 漂浮的彩色气泡，点击戳破。
 * 位置按 habit id 稳定绑定——戳破/新增任一气泡，其他气泡保持原位不动；
 * 每个气泡独立随机缓慢漂移（wander），边界柔和反弹。
 * 移动用 transform（GPU 合成，不触发 layout），比改 left/top 更跟手。
 */
export default function BubbleCanvas({ habits, onPop }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<string, HTMLDivElement>())
  const states = useRef(new Map<string, BubbleState>())
  const sizes = useRef(new Map<string, number>())
  const popRef = useRef(onPop)
  popRef.current = onPop
  const [box, setBox] = useState({ w: 0, h: 0 })
  const boxRef = useRef({ w: 0, h: 0 })

  // 同步初始化（渲染前，避免首帧堆叠在左上角）；已存在的保持原状态
  const seen = new Set<string>()
  habits.forEach((h, i) => {
    seen.add(h.habit.id)
    if (!states.current.has(h.habit.id)) states.current.set(h.habit.id, makeState(h.habit.id, i))
  })
  for (const id of [...states.current.keys()]) {
    if (!seen.has(id)) {
      states.current.delete(id)
      els.current.delete(id)
      sizes.current.delete(id)
    }
  }

  // 画布尺寸（transform 定位需要像素，不能再用百分比）
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      const next = { w: r.width, h: r.height }
      boxRef.current = next
      setBox(next)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [habits.length === 0])

  // 漂浮循环（挂载一次，读写 ref，不依赖 habits）
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (document.hidden) {
        raf = requestAnimationFrame(tick)
        return
      }
      const { w: W, h: H } = boxRef.current
      const list = [...states.current.values()]

      // 1) 自由漂移
      for (const s of list) {
        s.vx += (Math.random() - 0.5) * WANDER * dt
        s.vy += (Math.random() - 0.5) * WANDER * dt
        const sp = Math.hypot(s.vx, s.vy)
        if (sp > MAX_SPEED) {
          s.vx = (s.vx / sp) * MAX_SPEED
          s.vy = (s.vy / sp) * MAX_SPEED
        }
        s.x += s.vx * dt
        s.y += s.vy * dt
      }

      // 2) 相互排斥：气泡之间保持距离，不会糊成一团
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]
          const b = list[j]
          const dx = (a.x - b.x) * W
          const dy = (a.y - b.y) * H
          const d = Math.hypot(dx, dy)
          const min = ((sizes.current.get(a.id) ?? 56) + (sizes.current.get(b.id) ?? 56)) / 2 + 8
          if (d > 0.01 && d < min) {
            const push = (min - d) / 2
            const ux = (dx / d) * push
            const uy = (dy / d) * push
            if (W > 0) {
              a.x += ux / W
              b.x -= ux / W
            }
            if (H > 0) {
              a.y += uy / H
              b.y -= uy / H
            }
            a.vx += ux > 0 ? 0.0004 : -0.0004
            b.vx -= ux > 0 ? 0.0004 : -0.0004
          }
        }
      }

      // 3) 边界收口（按气泡半径）+ 落到 transform
      for (const s of list) {
        const size = sizes.current.get(s.id) ?? 56
        const minX = W > 0 ? (size / 2 + PAD) / W : 0.07
        const maxX = 1 - minX
        const minY = H > 0 ? (size / 2 + PAD) / H : 0.06
        const maxY = 1 - minY
        if (s.x < minX) {
          s.x = minX
          s.vx = Math.abs(s.vx)
        }
        if (s.x > maxX) {
          s.x = maxX
          s.vx = -Math.abs(s.vx)
        }
        if (s.y < minY) {
          s.y = minY
          s.vy = Math.abs(s.vy)
        }
        if (s.y > maxY) {
          s.y = maxY
          s.vy = -Math.abs(s.vy)
        }
        const el = els.current.get(s.id)
        if (el && W > 0 && H > 0) {
          el.style.transform = `translate3d(${s.x * W - size / 2}px, ${s.y * H - size / 2}px, 0)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (habits.length === 0) {
    return (
      <div className="bubble-canvas empty-canvas">
        <p className="dim">今天没有要戳破的气泡</p>
      </div>
    )
  }

  return (
    <div className="bubble-canvas" ref={wrapRef}>
      {habits.map(({ habit, streak }) => {
        const size = Math.min(78, 54 + streak * 1.6)
        sizes.current.set(habit.id, size)
        const s = states.current.get(habit.id)!
        const pos =
          box.w > 0
            ? `translate3d(${s.x * box.w - size / 2}px, ${s.y * box.h - size / 2}px, 0)`
            : `translate3d(${s.x * 100}%, ${s.y * 100}%, 0)`
        return (
          <div
            key={habit.id}
            className="bubble-pos"
            ref={(el) => {
              if (el) els.current.set(habit.id, el)
              else els.current.delete(habit.id)
            }}
            style={{ transform: pos }}
          >
            <button
              className={'bubble' + (streak === 0 ? ' fresh' : '')}
              style={{
                width: size,
                height: size,
                // 用 CSS 变量把习惯色带进多层渐变，避免内联样式的长串 background
                ['--b' as string]: habit.color,
              }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                popRef.current(habit, r.left + r.width / 2, r.top + r.height / 2)
              }}
              aria-label={`完成 ${habit.name}`}
            >
              <span className="bubble-ic">{habit.icon}</span>
              <span className="bubble-name">{habit.name}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
