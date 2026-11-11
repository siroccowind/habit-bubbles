// 可视化纯函数：全部基于年份位图与习惯元数据，读时计算，不落库

import type { YearBitmap } from './bitmap'
import { addDays, dayOfYear, daysInYear, weekdayIndex } from './date'
import { currentCleanStreak, currentStreak, longestRun } from './stats'

export interface VizHabit {
  id: string
  name: string
  type: 'good' | 'bad'
  createdAt: string
  archivedAt?: string
  /** 暂停区间（暂停日仍算活跃，区间从次日开始） */
  suspensions?: Array<{ start: string; end?: string }>
}

export interface DayPoint {
  date: string
  count: number
  names: string[]
}

export type CellState = 'done' | 'miss' | 'na'

export interface MonthCell {
  date: string
  day: number
  count: number
  state: CellState
}

export interface MonthResult {
  label: string
  cells: MonthCell[]
  done: number
  total: number
  max: number
}

export interface HeatCell {
  date: string
  count: number
  /** 当日期望完成数（当天活跃的习惯数）——色阶按 count/expected 归一，全做了即最深 */
  expected: number
  future: boolean
  na: boolean
  col: number
  row: number
}

type BmpMap = Map<string, YearBitmap>

function bitOn(bmps: BmpMap, id: string, date: string): boolean {
  const b = bmps.get(id)
  return b ? b.get(dayOfYear(date)) : false
}

export function countOn(pool: VizHabit[], bmps: BmpMap, date: string): number {
  let n = 0
  for (const h of pool) if (bitOn(bmps, h.id, date)) n++
  return n
}

export function namesOn(pool: VizHabit[], bmps: BmpMap, date: string): string[] {
  return pool.filter((h) => bitOn(bmps, h.id, date)).map((h) => h.name)
}

/** 某天是否处于暂停区间内（暂停当天不算——当天仍可记录，也仍计入期望） */
export function isSuspended(h: VizHabit, date: string): boolean {
  const list = h.suspensions
  if (!list || list.length === 0) {
    // 老数据只有 archivedAt：保持原样（暂停日起就不计）
    return !!h.archivedAt && date > h.archivedAt
  }
  for (const s of list) {
    if (date >= s.start && (!s.end || date <= s.end)) return true
  }
  return false
}

/** 当天在追踪中的习惯数（创建后、暂停区间之外） */
export function expectedOn(pool: VizHabit[], date: string): number {
  let n = 0
  for (const h of pool) {
    if (h.createdAt > date) continue
    if (isSuspended(h, date)) continue
    n++
  }
  return n
}

export function dailySeries(pool: VizHabit[], bmps: BmpMap, today: string, n: number): DayPoint[] {
  const out: DayPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    out.push({ date, count: countOn(pool, bmps, date), names: namesOn(pool, bmps, date) })
  }
  return out
}

/**
 * 月历矩阵（周一开头，6 行 × 7 列）。
 * 无红色语义：完成 = done（绿，全局视图按当日完成数分色深）；未完成 = miss（原始色）；
 * 创建前 / 归档后 / 未来 = na（灰）。坏习惯：未发生 = done，发生 = miss。
 */
export function monthView(
  pool: VizHabit[],
  bmps: BmpMap,
  year: number,
  month: number,
  today: string,
  isBad: boolean,
): MonthResult {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const dim = new Date(year, month, 0).getDate()
  const lead = weekdayIndex(first)
  const cells: MonthCell[] = []
  let done = 0
  let total = 0
  let max = 0
  for (let i = 0; i < 42; i++) {
    const offset = i - lead
    if (offset < 0 || offset >= dim) {
      cells.push({ date: '', day: 0, count: 0, state: 'na' })
      continue
    }
    const date = addDays(first, offset)
    const day = offset + 1
    if (date > today || expectedOn(pool, date) === 0) {
      cells.push({ date, day, count: 0, state: 'na' })
      continue
    }
    total++
    const c = countOn(pool, bmps, date)
    if (c > max) max = c
    const hit = isBad ? c === 0 : c > 0
    if (hit) done++
    cells.push({ date, day, count: c, state: hit ? 'done' : 'miss' })
  }
  return { label: `${month} 月`, cells, done, total, max }
}

/** 全年热力图数据（周一开头的 53 列 × 7 行网格）；na = 习惯创建前 */
export function heatCells(pool: VizHabit[], bmps: BmpMap, year: number, today: string): HeatCell[] {
  const jan1 = `${year}-01-01`
  const dim = daysInYear(year)
  const base = weekdayIndex(jan1)
  const minCreated = pool.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), '9999-12-31')
  const out: HeatCell[] = []
  for (let d = 1; d <= dim; d++) {
    const date = addDays(jan1, d - 1)
    const idx = base + d - 1
    out.push({
      date,
      count: countOn(pool, bmps, date),
      expected: expectedOn(pool, date),
      future: date > today,
      na: date < minCreated,
      col: Math.floor(idx / 7),
      row: idx % 7,
    })
  }
  return out
}

/** 完美周：一周内每个"应完成日"都达成（坏习惯 = 一周零发生） */
function perfectWeeks(pool: VizHabit[], bmps: BmpMap, today: string): number {
  if (pool.length === 0) return 0
  const minCreated = pool.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), '9999-12-31')
  const monday = addDays(today, -weekdayIndex(today))
  let n = 0
  for (let w = 0; w < 80; w++) {
    const ws = addDays(monday, -7 * w)
    if (ws < minCreated) break
    let expectedDays = 0
    let perfect = true
    for (let d = 0; d < 7; d++) {
      const date = addDays(ws, d)
      if (date > today) continue
      const exp = expectedOn(pool, date)
      if (exp > 0) {
        expectedDays++
        if (countOn(pool, bmps, date) !== exp) perfect = false
      }
    }
    if (expectedDays > 0 && perfect) n++
  }
  return n
}

/** 习惯创建日在该年份位图中的下限（第几天）；跨年则从年初算起 */
export function minDayOf(h: VizHabit, year: number): number {
  const cy = Number(h.createdAt.slice(0, 4))
  if (cy < year) return 1
  if (cy > year) return 366
  return dayOfYear(h.createdAt)
}

export function statsFor(
  pool: VizHabit[],
  bmps: BmpMap,
  today: string,
  isBad: boolean,
): Array<{ label: string; value: string }> {
  const todayDoY = dayOfYear(today)
  if (isBad) {
    const h = pool[0]
    const b = h ? bmps.get(h.id) : undefined
    const md = h && b ? minDayOf(h, b.year) : 1
    return [
      { label: '当前连续未发生', value: `${b ? currentCleanStreak(b, today, md) : 0} 天` },
      { label: '历史最长未发生', value: `${b ? longestRun(b, false, todayDoY, md) : 0} 天` },
      { label: '累计发生', value: `${b ? b.count() : 0} 天` },
      { label: '完美周（零发生）', value: `${perfectWeeks(pool, bmps, today)} 个` },
    ]
  }
  let cur = 0
  let longest = 0
  let total = 0
  for (const h of pool) {
    const b = bmps.get(h.id)
    if (!b) continue
    const md = minDayOf(h, b.year)
    cur = Math.max(cur, currentStreak(b, today, md))
    longest = Math.max(longest, longestRun(b, true, todayDoY, md))
    total += b.count()
  }
  return [
    { label: '当前最长连续', value: `${cur} 天` },
    { label: '历史最长连续', value: `${longest} 天` },
    { label: '累计打卡', value: `${total} 天` },
    { label: '完美周', value: `${perfectWeeks(pool, bmps, today)} 个` },
  ]
}
