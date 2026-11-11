import { useEffect, useRef, useState } from 'react'
import { DropIcon } from './DropIcon'
import { getItem, getToy } from '../data/items'
import { useAppStore } from '../store/useAppStore'

export interface ActiveDrop {
  key: string
  itemId: string
  /** toy = 当天玩的玩具（次日收起）；collectible = 收藏品（完美一天） */
  kind: 'toy' | 'collectible'
  habitId?: string
  x: number
  y: number
}

interface Trail {
  id: number
  x: number
  y: number
}

const G = 1500 // 重力加速度 px/s²
/** 恢复系数：0.57 是用户实测手感最好的值（更小 = 落地更闷，更接近实体小球） */
const RESTITUTION = 0.57
const MAX_ITEMS = 8
const REST_DAMP = 0.94 // 贴墙静置阻尼
const WALL = 24 // 墙厚（= 物件半径，保证整颗都留在屏幕内）
const REST_ANGLE = 0.35 // 重力方向变化超过此角度（rad）→ 静置物件苏醒滚向新低处
const SHAKE_ANGLE = 0.6 // 单帧重力方向剧变 → 判定为摇晃，全体飞起
/** 低于此速度才开始累计「该睡了」的计时（不是一慢就睡） */
const SLOW_SPEED = 44
/** 持续低速这么久才真正静置：所以它会慢慢晃、轻轻抖，而不是弹满固定次数就“啪”地定住 */
const SLEEP_MS = 300
const FLOOR_FRICTION = 0.9 // 落地后的切向摩擦（滚动阻力）
const AIR_DRAG = 0.9985 // 空气阻力
const ROLL_RATIO = 1 / 22 // 滚动角速度 = 水平速度 / 半径
const SPIN_CLAMP = 14 // 角速度上限 rad/s
const TRAIL_MIN_SPEED = 220 // 速度超过此值才留尾迹
const TRAIL_MIN_DIST = 26 // 距上个尾迹点的最小距离
const TRAIL_LIFE = 650 // 尾迹存活 ms（渐隐）
const FLOOR_MARGIN = 104 // 底部导航栏高度

/**
 * 掉落物理层：真·重力感应。
 *  · 重力向量由陀螺仪合成（gamma 左右 + beta 前后）——手机倾斜 = 世界倾斜：
 *    倾倒 → 物件顺坡滚向屏幕边缘；倒置 → 掉向屏幕顶部；四面墙都是地板，撞上即弹；
 *  · 弹性 0.57 + 切向摩擦 + 滚动角速度：撞墙后越弹越矮，落地会滚一小段再停；
 *  · 静止判定不按弹跳次数，而按「低速持续时长」——没有硬性急停，看起来像真的在减速；
 *  · 静置物件随重力方向变化自动苏醒；猛烈摇晃 → 全体沿重力反方向飞起；
 *  · 桌面（无传感器）降级为普通向下重力；位置用 transform（GPU 合成，无残影）。
 */
export default function DropLayer({
  drops,
  motionOn,
  onDone,
}: {
  drops: ActiveDrop[]
  /** 体感（重力感应）开关 */
  motionOn: boolean
  onDone: (key: string) => void
}) {
  const [items, setItems] = useState<ActiveDrop[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const itemsRef = useRef<ActiveDrop[]>([])
  /** 速度 + 低速计时 */
  const vel = useRef(new Map<string, { vx: number; vy: number; slowMs: number }>())
  /** 自转角（deg）与角速度（rad/s） */
  const spin = useRef(new Map<string, { a: number; w: number }>())
  const resting = useRef(new Set<string>())
  /** 每个静置物件贴墙时记录的重力方向（方向变了就苏醒） */
  const restG = useRef(new Map<string, { gx: number; gy: number }>())
  const gravity = useRef({ gx: 0, gy: G })
  const lastAngle = useRef(Math.PI / 2)
  const drag = useRef<{ key: string; x: number; y: number; t: number; vx: number; vy: number } | null>(null)
  const raf = useRef(0)
  const lastT = useRef(0)
  const lastTrail = useRef(new Map<string, { x: number; y: number }>())
  const trailSeq = useRef(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function apply(updater: (prev: ActiveDrop[]) => ActiveDrop[]) {
    setItems((prev) => {
      const next = updater(prev)
      itemsRef.current = next
      return next
    })
  }

  function angleOf(gx: number, gy: number): number {
    return Math.atan2(gy, gx)
  }

  function angleDiff(a: number, b: number): number {
    let d = Math.abs(a - b)
    if (d > Math.PI) d = Math.PI * 2 - d
    return d
  }

  // 新掉落进入；外层收回（撤销 / 跨天）的同步移除
  useEffect(() => {
    apply((prev) => {
      const known = new Set(prev.map((p) => p.key))
      const fresh = drops.filter((d) => !known.has(d.key))
      const dropped = prev.filter((p) => !drops.some((d) => d.key === p.key))
      for (const d of dropped) {
        vel.current.delete(d.key)
        spin.current.delete(d.key)
        resting.current.delete(d.key)
        restG.current.delete(d.key)
        lastTrail.current.delete(d.key)
      }
      if (fresh.length === 0 && dropped.length === 0) return prev
      for (const d of fresh) {
        vel.current.set(d.key, { vx: (Math.random() - 0.5) * 170, vy: -190 - Math.random() * 70, slowMs: 0 })
        spin.current.set(d.key, { a: 0, w: (Math.random() - 0.5) * 6 })
      }
      const merged = [...prev.filter((p) => !dropped.includes(p)), ...fresh]
      if (merged.length > MAX_ITEMS) {
        merged.slice(MAX_ITEMS).forEach((d) => doneRef.current(d.key))
        return merged.slice(0, MAX_ITEMS)
      }
      return merged
    })
    ensureLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drops])

  // 减少动态：跳过物理，直接静置在底部
  useEffect(() => {
    if (!reduced) return
    const floor = window.innerHeight - FLOOR_MARGIN
    apply((prev) => {
      prev.forEach((it) => resting.current.add(it.key))
      return prev.map((it) => ({ ...it, y: floor }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, reduced])

  // 陀螺仪 → 二维重力向量（gamma 左右倾 + beta 前后倾）
  useEffect(() => {
    if (!motionOn) {
      gravity.current = { gx: 0, gy: G }
      lastAngle.current = angleOf(0, G)
      return
    }
    function onOrient(e: DeviceOrientationEvent) {
      const g = e.gamma ?? 0
      const b = e.beta ?? 0
      const gr = (g * Math.PI) / 180
      const br = (b * Math.PI) / 180
      gravity.current = {
        gx: G * Math.sin(gr),
        gy: G * Math.cos(gr) * Math.sin(br),
      }
      // 只有拿到「有意义」的方向数据才算生效：桌面浏览器会发全 0 的空事件，不能当成功
      if (Math.abs(e.alpha ?? 0) + Math.abs(e.beta ?? 0) + Math.abs(e.gamma ?? 0) > 1) {
        useAppStore.getState().markMotionSeen()
      }
      ensureLoop() // 唤醒循环（静置时循环是停摆的）
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      gravity.current = { gx: 0, gy: G }
      lastAngle.current = angleOf(0, G)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionOn])

  // 物理循环
  function ensureLoop() {
    if (raf.current || reduced) return
    lastT.current = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - lastT.current) / 1000 || 0.016)
      lastT.current = now
      const rawG = gravity.current
      let { gx, gy } = rawG
      // 传感器接近水平（beta≈0）或只有一次空事件时，平面内重力会趋近 0，
      // 物件会保持初速一直往上飘、贴在天花板上。补一个柔和的下沉分量兜底。
      const rawMag = Math.hypot(gx, gy)
      const minMag = G * 0.3
      if (rawMag < minMag) gy += (1 - rawMag / minMag) * minMag
      const W = window.innerWidth
      const floorY = window.innerHeight - FLOOR_MARGIN

      // 摇晃检测：单帧重力方向剧变（自然倾斜做不到）= 用户猛摇
      const ang = angleOf(gx, gy)
      const shaking = angleDiff(ang, lastAngle.current) > SHAKE_ANGLE
      lastAngle.current = ang
      const gMag = Math.hypot(gx, gy) || G

      const newTrails: Trail[] = []

      apply((prev) =>
        prev.map((it) => {
          if (drag.current?.key === it.key) return it
          const v = vel.current.get(it.key)
          const sp = spin.current.get(it.key) ?? { a: 0, w: 0 }
          if (!v) return it
          let { x, y } = it

          if (resting.current.has(it.key) && !shaking) {
            const rg = restG.current.get(it.key)
            const turned = !rg || angleDiff(angleOf(gx, gy), angleOf(rg.gx, rg.gy)) > REST_ANGLE
            if (turned) {
              // 世界倾斜了：苏醒，顺着新重力滚向新的低处（给个小初速，立刻动起来不墨迹）
              resting.current.delete(it.key)
              restG.current.delete(it.key)
              v.vx = gx * 0.05
              v.vy = gy * 0.05
              v.slowMs = 0
            } else {
              // 贴墙静置：只沿重力方向微滑（大阻尼），自转缓缓收住
              v.vx = (v.vx + gx * 0.5 * dt) * REST_DAMP
              v.vy = (v.vy + gy * 0.5 * dt) * REST_DAMP
              x = Math.min(W - WALL, Math.max(WALL, x + v.vx * dt))
              y = Math.min(floorY, Math.max(WALL, y + v.vy * dt))
              sp.w *= 0.86
              sp.a += sp.w * dt * (180 / Math.PI)
              return { ...it, x, y }
            }
          }

          if (resting.current.has(it.key) && shaking) {
            // 猛烈摇晃：沿重力反方向飞起（倒置时也能从顶墙弹开）
            resting.current.delete(it.key)
            restG.current.delete(it.key)
            v.vx = (-gx / gMag) * 780 + (Math.random() - 0.5) * 300
            v.vy = (-gy / gMag) * 780 + (Math.random() - 0.5) * 180
            v.slowMs = 0
            sp.w = (Math.random() - 0.5) * 12
          }

          // ---- 自由物理 ----
          v.vx = (v.vx + gx * dt) * AIR_DRAG
          v.vy = (v.vy + gy * dt) * AIR_DRAG
          x += v.vx * dt
          y += v.vy * dt

          let onWall = false
          if (x < WALL) {
            x = WALL
            onWall = true
            if (v.vx < 0) v.vx = -v.vx * RESTITUTION
            sp.w *= -0.6
          }
          if (x > W - WALL) {
            x = W - WALL
            onWall = true
            if (v.vx > 0) v.vx = -v.vx * RESTITUTION
            sp.w *= -0.6
          }
          if (y < WALL) {
            y = WALL
            onWall = true
            if (v.vy < 0) v.vy = -v.vy * RESTITUTION
          }
          if (y >= floorY) {
            y = floorY
            onWall = true
            if (v.vy > 0) v.vy = -v.vy * RESTITUTION
            // 落地：切向摩擦 + 滚动（水平速度换算成自转，停下来时自然不再转）
            v.vx *= FLOOR_FRICTION
            sp.w = v.vx * ROLL_RATIO
          }

          // 自转：空中保持，阻尼缓慢衰减；限幅避免转成风车
          if (!onWall) sp.w *= 0.995
          sp.w = Math.max(-SPIN_CLAMP, Math.min(SPIN_CLAMP, sp.w))
          sp.a += sp.w * dt * (180 / Math.PI)

          // ---- 休眠：看「低速持续了多久」，不看弹了几次 ----
          const speed = Math.hypot(v.vx, v.vy)
          if (onWall && speed < SLOW_SPEED) v.slowMs += dt * 1000
          else v.slowMs = 0
          if (onWall && (v.slowMs >= SLEEP_MS || speed < 5)) {
            resting.current.add(it.key)
            restG.current.set(it.key, { gx, gy })
            v.vx = 0
            v.vy = 0
            v.slowMs = 0
            sp.w = 0
          }

          // 快速移动 → 留一个渐隐尾迹点
          const prevPos = lastTrail.current.get(it.key)
          if (speed > TRAIL_MIN_SPEED && (!prevPos || Math.hypot(x - prevPos.x, y - prevPos.y) > TRAIL_MIN_DIST)) {
            lastTrail.current.set(it.key, { x, y })
            trailSeq.current += 1
            newTrails.push({ id: trailSeq.current, x, y })
          }
          return { ...it, x, y }
        }),
      )

      if (newTrails.length > 0) {
        setTrails((prev) => [...prev, ...newTrails].slice(-18))
        const ids = new Set(newTrails.map((t) => t.id))
        window.setTimeout(() => setTrails((prev) => prev.filter((t) => !ids.has(t.id))), TRAIL_LIFE)
      }

      // 全部静置且无拖拽 → 停摆省电（重力变化由陀螺仪事件唤醒）
      const allRest = itemsRef.current.length > 0 && itemsRef.current.every((it) => resting.current.has(it.key))
      if (allRest && !drag.current) {
        raf.current = 0
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  // 循环生命周期跟随组件
  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>, key: string) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { key, x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 }
    resting.current.delete(key)
    restG.current.delete(key)
    const v = vel.current.get(key)
    if (v) {
      v.vx = 0
      v.vy = 0
      v.slowMs = 0
    }
    const sp = spin.current.get(key)
    if (sp) sp.w = 0
    ensureLoop()
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    const dt = Math.max(1, now - d.t) / 1000
    d.vx = (e.clientX - d.x) / dt
    d.vy = (e.clientY - d.y) / dt
    d.x = e.clientX
    d.y = e.clientY
    d.t = now
    apply((prev) => prev.map((it) => (it.key === d.key ? { ...it, x: e.clientX, y: e.clientY } : it)))
  }

  function onPointerUp() {
    const d = drag.current
    if (!d) return
    const v = vel.current.get(d.key)
    if (v) {
      v.vx = Math.max(-900, Math.min(900, d.vx))
      v.vy = Math.max(-900, Math.min(900, d.vy))
      v.slowMs = 0
    }
    const sp = spin.current.get(d.key)
    if (sp) sp.w = v ? v.vx * ROLL_RATIO : 0
    drag.current = null
  }

  if (items.length === 0) return null

  return (
    <div className="drop-layer">
      {trails.map((t) => (
        <i key={t.id} className="drop-trail" style={{ transform: `translate3d(${t.x}px, ${t.y}px, 0)` }} />
      ))}
      {items.map((it) => {
        const sp = spin.current.get(it.key)
        const rot = sp ? Math.round(sp.a) : 0
        return (
          <button
            key={it.key}
            className={'drop-item' + (it.kind === 'collectible' ? ' collectible' : '')}
            style={{ transform: `translate3d(${it.x}px, ${it.y}px, 0) rotate(${rot}deg)` }}
            onPointerDown={(e) => onPointerDown(e, it.key)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label={it.kind === 'toy' ? getToy(it.itemId).name : getItem(it.itemId).name}
          >
            <DropIcon id={it.itemId} size={it.kind === 'collectible' ? 32 : 30} />
          </button>
        )
      })}
    </div>
  )
}
