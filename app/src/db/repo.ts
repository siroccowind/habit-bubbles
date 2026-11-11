// ---- 数据访问层：所有写入走这里，严格当日校验在写入层强制

import { db, type Drop, type Habit } from './schema'
import { addDays, dayOfYear, todayStr, weekdayIndex } from '../core/date'
import { YearBitmap } from '../core/bitmap'
import { currentCleanStreak, currentStreak } from '../core/stats'
import { isSuspended } from '../core/viz'
import { rollToy } from '../core/drops'
import type { ExportData } from '../lib/export'

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function listActiveHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray()
  return all.filter((h) => !h.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 好习惯活跃上限 6（固定）、坏习惯 1-3：习惯养成重在逐个击破 */
const GOOD_CAP = 6
const BAD_CAP = 3

export async function createHabit(input: {
  type: Habit['type']
  name: string
  icon: string
  color: string
}): Promise<Habit> {
  const active = await listActiveHabits()
  const sameType = active.filter((h) => h.type === input.type)
  if (input.type === 'good' && sameType.length >= GOOD_CAP) {
    throw new Error(`好习惯最多 ${GOOD_CAP} 个，先暂停一个再创建`)
  }
  if (input.type === 'bad' && sameType.length >= BAD_CAP) {
    throw new Error(`坏习惯最多 ${BAD_CAP} 个`)
  }
  const all = await db.habits.toArray()
  const habit: Habit = {
    id: uid(),
    type: input.type,
    name: input.name,
    icon: input.icon,
    color: input.color,
    createdAt: todayStr(),
    sortOrder: all.length,
  }
  await db.habits.add(habit)
  return habit
}

/**
 * 暂停打卡 = 归档。
 * 关键：**暂停当天仍然算活跃**（当天已记录的保留、还能补记），
 * 从次日开始进入暂停区间；历史数据一概不动，只把区间内的日子排除在「应完成」之外。
 */
export async function archiveHabit(id: string): Promise<void> {
  const date = todayStr()
  await db.habits.where('id').equals(id).modify((h) => {
    if (h.archivedAt) return
    h.archivedAt = date
    const list = h.suspensions ? [...h.suspensions] : []
    list.push({ start: addDays(date, 1) })
    h.suspensions = list
  })
}

/** 恢复打卡：把当前开放区间收尾到「恢复日前一天」，从恢复当天起重回活跃（当天即可记录） */
export async function unarchiveHabit(id: string): Promise<void> {
  const habit = await db.habits.get(id)
  if (!habit || !habit.archivedAt) return
  // 恢复不能突破活跃上限（否则暂停一个 + 新建一个后，恢复会变成 7 个）
  const active = await listActiveHabits()
  const same = active.filter((h) => h.type === habit.type)
  const cap = habit.type === 'good' ? GOOD_CAP : BAD_CAP
  if (same.length >= cap) {
    throw new Error(
      habit.type === 'good'
        ? `好习惯已满 ${GOOD_CAP} 个，先暂停一个再恢复`
        : `坏习惯已满 ${BAD_CAP} 个，先暂停一个再恢复`,
    )
  }
  const date = todayStr()
  await db.habits.where('id').equals(id).modify((h) => {
    if (!h.archivedAt) return
    const list = h.suspensions ? [...h.suspensions] : []
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].end) {
        const end = addDays(date, -1)
        if (end < list[i].start) list.splice(i, 1) // 暂停次日就恢复 → 空区间，丢弃
        else list[i] = { start: list[i].start, end }
        break
      }
    }
    h.suspensions = list
    delete h.archivedAt
  })
}

export async function listArchivedHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray()
  return all
    .filter((h) => !!h.archivedAt)
    .sort((a, b) => (a.archivedAt! < b.archivedAt! ? 1 : -1))
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.checkins, db.occurrences, db.drops, async () => {
    await db.habits.delete(id)
    await db.checkins.where('habitId').equals(id).delete()
    await db.occurrences.where('habitId').equals(id).delete()
    await db.drops.where('habitId').equals(id).delete()
  })
}

// ---- 好习惯完成 / 撤销（v1.7「撤销一次」机制） ----

export interface GoodResult {
  /** true = 完成；false = 撤销或锁定 */
  done: boolean
  /** 今天已撤销过一次，本次拒绝（防刷：不能反复横跳） */
  locked?: boolean
  /** 本次是撤销：掉落物已收回（完美收藏品记录已删除） */
  revoked?: boolean
  /** 本次掉落的玩具 itemId（普通完成；不落库） */
  toyId?: string
}

/**
 * 撤销日志（settings），按日期分组：保证「每个习惯每个日期只能撤销一次」。
 * 形如 { [date]: string[] }，补记历史日期时各天独立计数。
 */
async function getUndoLog(date: string): Promise<{ date: string; ids: string[] }> {
  const row = await db.settings.get('undoLog')
  const map = (row?.value as Record<string, string[]> | undefined) || {}
  return { date, ids: Array.isArray(map[date]) ? map[date] : [] }
}

async function markUndone(habitId: string, date: string): Promise<void> {
  const row = await db.settings.get('undoLog')
  const map = (row?.value as Record<string, string[]>) || {}
  if (!map[date]) map[date] = []
  if (!map[date].includes(habitId)) map[date].push(habitId)
  await db.settings.put({ key: 'undoLog', value: map })
}

/** 撤销时记住玩具（内存），重新完成时掉回同一个，不重新 roll */
const revokedToyMemo = new Map<string, { date: string; toyId: string }>()

export function setRevokedToy(habitId: string, toyId: string): void {
  revokedToyMemo.set(habitId, { date: todayStr(), toyId })
}

/** 撤销时记住被删掉的完美收藏品（内存），重新达成完美一天时重新掉落同一个 */
const revokedPerfectMemo = new Map<string, string>() // date -> itemId

export function getRevokedPerfect(date: string): string | undefined {
  return revokedPerfectMemo.get(date)
}

export function clearRevokedPerfect(date: string): void {
  revokedPerfectMemo.delete(date)
}

/** 今天是否已因「完美一天」掉过收藏品（不管是否被撤销删除）——用于防止撤销重选后重复掉落 */
export async function findPerfectDrop(date: string) {
  return db.drops.filter((d) => d.date === date && d.source === 'perfect').first()
}

/**
 * 完成 / 撤销一个好习惯（仅当天）。
 *  · 完成 → 掉落：优先掉回被撤销的玩具，否则 roll 新玩具；
 *  · 撤销 → 收回掉落：今天的完美收藏品记录直接删除（收藏室同步撤掉），
 *    并记住其 itemId——重新达成完美一天时重新掉落同一个，绝不 roll 新的。
 */
export async function completeGood(habitId: string, date: string = todayStr()): Promise<GoodResult> {
  const key: [string, string] = [habitId, date]
  const existing = await db.checkins.get(key)

  if (existing) {
    // ---- 撤销 ----
    const log = await getUndoLog(date)
    if (log.ids.includes(habitId)) return { done: false, locked: true }
    await db.checkins.delete(key)
    // 删除当天的完美收藏品（屏幕收回由外层按 kind 处理），记住 itemId
    const perfect = await findPerfectDrop(date)
    if (perfect) {
      await db.drops.delete(perfect.id)
      revokedPerfectMemo.set(date, perfect.itemId)
    }
    await markUndone(habitId, date)
    invalidateBitmap(habitId, Number(date.slice(0, 4)))
    return { done: false, revoked: true }
  }

  // ---- 完成 ----
  await db.checkins.add({ habitId, date })
  const memo = revokedToyMemo.get(habitId)
  if (memo && memo.date === date) {
    revokedToyMemo.delete(habitId)
    invalidateBitmap(habitId, Number(date.slice(0, 4)))
    return { done: true, toyId: memo.toyId }
  }
  invalidateBitmap(habitId, Number(date.slice(0, 4)))
  return { done: true, toyId: rollToy().id }
}

/** 坏习惯记录一次发生（仅当天，二值）。返回 true = 本次为新记录 */
export async function recordOccurrence(habitId: string, date: string = todayStr()): Promise<boolean> {
  const key: [string, string] = [habitId, date]
  const existing = await db.occurrences.get(key)
  if (existing) return false
  await db.occurrences.add({ habitId, date })
  invalidateBitmap(habitId, Number(date.slice(0, 4)))
  return true
}

// ---- 掉落 ----

export async function recordDrop(d: {
  itemId: string
  rarity: 'N' | 'R' | 'SSR'
  source: string
  habitId?: string
}): Promise<void> {
  await db.drops.add({
    id: uid(),
    itemId: d.itemId,
    rarity: d.rarity,
    source: d.source,
    habitId: d.habitId,
    date: todayStr(),
  })
}

export interface CollectionEntry {
  itemId: string
  count: number
  firstDate: string
}

export async function loadCollection(): Promise<CollectionEntry[]> {
  const rows = await db.drops.orderBy('date').toArray()
  const map = new Map<string, CollectionEntry>()
  for (const r of rows) {
    if (r.revoked) continue // 兼容旧版本：被撤销的收藏品不计入
    const e = map.get(r.itemId)
    if (e) e.count++
    else map.set(r.itemId, { itemId: r.itemId, count: 1, firstDate: r.date })
  }
  return [...map.values()]
}

export async function recentDrops(n: number): Promise<Drop[]> {
  const rows = await db.drops.orderBy('date').reverse().limit(n).toArray()
  return rows.reverse().filter((r) => !r.revoked)
}

// ---- 本地设置 ----

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row && row.value !== undefined ? (row.value as T) : fallback
}

// ---- 导入（全量替换：先清空，再按快照写入） ----

export async function importAll(data: ExportData): Promise<void> {
  await db.transaction('rw', db.habits, db.checkins, db.occurrences, db.drops, db.settings, async () => {
    await Promise.all([
      db.habits.clear(),
      db.checkins.clear(),
      db.occurrences.clear(),
      db.drops.clear(),
      db.settings.clear(),
    ])
    if (data.habits.length) await db.habits.bulkAdd(data.habits)
    if (data.checkins.length) await db.checkins.bulkAdd(data.checkins)
    if (data.occurrences.length) await db.occurrences.bulkAdd(data.occurrences)
    if (data.drops.length) await db.drops.bulkAdd(data.drops)
  })
}

// ---- 年份位图缓存（内存，可由事件表随时重建） ----

const bitmapCache = new Map<string, YearBitmap>()

function invalidateBitmap(habitId: string, year: number = new Date().getFullYear()): void {
  bitmapCache.delete(`${habitId}:${year}`)
}

export async function getYearBitmap(habitId: string, year: number): Promise<YearBitmap> {
  const k = `${habitId}:${year}`
  let bmp = bitmapCache.get(k)
  if (!bmp) {
    bmp = new YearBitmap(year)
    const rows = await db.checkins.where('habitId').equals(habitId).toArray()
    for (const r of rows) {
      if (Number(r.date.slice(0, 4)) === year) bmp.set(dayOfYear(r.date), true)
    }
    const occ = await db.occurrences.where('habitId').equals(habitId).toArray()
    for (const r of occ) {
      if (Number(r.date.slice(0, 4)) === year) bmp.set(dayOfYear(r.date), true)
    }
    bitmapCache.set(k, bmp)
  }
  return bmp
}

// ---- 「今天」页聚合读取 ----

export interface TodayState {
  good: Array<{ habit: Habit; done: boolean; streak: number; week: Array<boolean | null> }>
  bad: Array<{ habit: Habit; happened: boolean; cleanStreak: number; week: Array<boolean | null> }>
}

export async function loadToday(date: string = todayStr()): Promise<TodayState> {
  const year = Number(date.slice(0, 4))
  const habits = await listActiveHabits()
  // 一次性读全表再建位图：原来每个习惯 2 次查询（6 个习惯 = 12 次往返），
  // 在手机上冷启动能差出 100~300ms。这里 2 次查询搞定，并把结果回填内存缓存。
  const ids = new Set(habits.map((h) => h.id))
  const [checkins, occ] = await Promise.all([db.checkins.toArray(), db.occurrences.toArray()])
  const bmps = new Map<string, YearBitmap>()
  for (const h of habits) bmps.set(h.id, new YearBitmap(year))
  const yearStr = String(year)
  for (const r of checkins) {
    if (!ids.has(r.habitId) || r.date.slice(0, 4) !== yearStr) continue
    bmps.get(r.habitId)?.set(dayOfYear(r.date), true)
  }
  for (const r of occ) {
    if (!ids.has(r.habitId) || r.date.slice(0, 4) !== yearStr) continue
    bmps.get(r.habitId)?.set(dayOfYear(r.date), true)
  }
  for (const [id, b] of bmps) bitmapCache.set(`${id}:${year}`, b)

  // 本周 7 天（周一起步），未来日期为 null
  const monday = addDays(date, -weekdayIndex(date))
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) weekDates.push(addDays(monday, i))
  const todayDoY = dayOfYear(date)
  const good: TodayState['good'] = []
  const bad: TodayState['bad'] = []
  for (const h of habits) {
    const bmp = bmps.get(h.id) as YearBitmap
    const v = {
      id: h.id,
      name: h.name,
      type: h.type,
      createdAt: h.createdAt,
      archivedAt: h.archivedAt,
      suspensions: h.suspensions,
    }
    // 暂停区间内的日子标成「不适用」（灰点），而不是「未完成」（红点）
    const week = weekDates.map((wd) => (wd > date || isSuspended(v, wd) ? null : bmp.get(dayOfYear(wd))))
    // 创建日下限：跨年习惯从年初算，同年习惯从创建日算
    const cy = Number(h.createdAt.slice(0, 4))
    const minDay = cy < year ? 1 : cy > year ? 366 : dayOfYear(h.createdAt)
    if (h.type === 'good') {
      good.push({ habit: h, done: bmp.get(todayDoY), streak: currentStreak(bmp, date, minDay), week })
    } else {
      bad.push({ habit: h, happened: bmp.get(todayDoY), cleanStreak: currentCleanStreak(bmp, date, minDay), week })
    }
  }
  return { good, bad }
}
