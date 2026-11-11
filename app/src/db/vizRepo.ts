// 统计页数据装载：按好/坏习惯类型聚合 + 单习惯详情

import { db, type Habit } from './schema'
import { getYearBitmap } from './repo'
import { addDays, dayOfYear, todayStr } from '../core/date'
import { YearBitmap } from '../core/bitmap'
import { currentCleanStreak, currentStreak, longestRun } from '../core/stats'
import {
  countOn,
  dailySeries,
  heatCells,
  isSuspended,
  minDayOf,
  monthView,
  type DayPoint,
  type HeatCell,
  type MonthResult,
  type VizHabit,
} from '../core/viz'

function toViz(h: Habit): VizHabit {
  return {
    id: h.id,
    name: h.name,
    type: h.type,
    createdAt: h.createdAt,
    archivedAt: h.archivedAt,
    suspensions: h.suspensions,
  }
}

/**
 * 统计终点：已暂停习惯算到「暂停日当天」（含）——
 * 暂停当天若已完成，必须保留；之后的日期不再计入期望天数。
 */
export function statEnd(h: VizHabit, today: string): string {
  if (h.archivedAt && h.archivedAt <= today) return h.archivedAt
  return today
}

/** 创建日到统计终点之间的「应记录天数」（跳过暂停区间） */
function expectedDays(h: VizHabit, today: string): number {
  const end = statEnd(h, today)
  if (end < h.createdAt) return 0
  let n = 0
  for (let d = h.createdAt; d <= end; d = addDays(d, 1)) {
    if (!isSuspended(h, d)) n++
  }
  return n
}

export interface HabitStat {
  id: string
  name: string
  icon: string
  color: string
  type: 'good' | 'bad'
  createdAt: string
  /** 已暂停（历史数据仍计入统计，只是不再增长） */
  paused?: boolean
  pausedAt?: string
  /** 完成次数（坏习惯 = 发生次数） */
  count: number
  /** 当前连续（好 = 连续完成，坏 = 连续未发生） */
  streak: number
  /** 历史最长 */
  longest: number
  /** 完成率 / 未发生率（0-100） */
  rate: number
}

export interface StatsBundle {
  type: 'good' | 'bad'
  /** 顶部汇总：完成次数 / 打卡天数 / 最长连续 / 完成率 */
  top: { count: number; days: number; streak: number; rate: number }
  /** 近 30 天每日次数（双向图：好习惯向上、坏习惯向下） */
  daily: DayPoint[]
  /** 打卡频次分布（年度点阵） */
  heat: HeatCell[]
  /** 全部习惯列表 */
  habits: HabitStat[]
}

export async function loadStats(type: 'good' | 'bad', year: number): Promise<StatsBundle> {
  const all = await db.habits.toArray()
  // 已暂停的习惯也纳入统计：暂停不改动既有数据，历史数字必须保持不变
  const habits = all
    .filter((h) => h.type === type)
    .sort((a, b) => {
      const pa = a.archivedAt ? 1 : 0
      const pb = b.archivedAt ? 1 : 0
      if (pa !== pb) return pa - pb // 活跃的排在前面
      return a.sortOrder - b.sortOrder
    })
  const today = todayStr()
  const isBad = type === 'bad'

  const bmps = new Map<string, YearBitmap>()
  for (const h of habits) bmps.set(h.id, await getYearBitmap(h.id, year))
  const pool = habits.map(toViz)

  const list: HabitStat[] = habits.map((h) => {
    const b = bmps.get(h.id) as YearBitmap
    const v = toViz(h)
    const exp = expectedDays(v, today)
    const md = minDayOf(v, year)
    const count = b.count()
    // 已暂停：连续 / 最长都按暂停日结算，不因为「不再记录」而被清零
    const end = statEnd(v, today)
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      type: h.type,
      createdAt: h.createdAt,
      paused: !!h.archivedAt,
      pausedAt: h.archivedAt,
      count,
      streak: isBad ? currentCleanStreak(b, end, md) : currentStreak(b, end, md),
      longest: isBad ? longestRun(b, false, dayOfYear(end), md) : longestRun(b, true, dayOfYear(end), md),
      rate: exp > 0 ? Math.round(((isBad ? exp - count : count) / exp) * 100) : 0,
    }
  })

  // 顶部汇总
  let days = 0
  if (pool.length > 0) {
    const start = pool.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), today)
    for (let d = start; d <= today; d = addDays(d, 1)) {
      if (countOn(pool, bmps, d) > 0) days++
    }
  }
  const totalExp = pool.reduce((s, h) => s + expectedDays(h, today), 0)
  const totalCount = list.reduce((s, x) => s + x.count, 0)
  const top = {
    count: totalCount,
    days,
    streak: list.reduce((m, x) => Math.max(m, x.streak), 0),
    rate: totalExp > 0 ? Math.round(((isBad ? totalExp - totalCount : totalCount) / totalExp) * 100) : 0,
  }

  return {
    type,
    top,
    daily: dailySeries(pool, bmps, today, 30),
    heat: heatCells(pool, bmps, year, today),
    habits: list,
  }
}

export interface DetailBundle {
  habit: Habit
  /** 当前加载的年月 YYYY-MM，用于轮播切换后归位 */
  ym: string
  month: MonthResult
  /** 相邻月份（供月历左右滑动时直接显示，切换后再重载） */
  prevMonth: MonthResult
  nextMonth: MonthResult
  heat: HeatCell[]
  stats: { count: number; streak: number; longest: number; rate: number }
  /** 统计终点（未归档 = 今天；已归档 = 暂停日前一天） */
  end: string
  /** 是否已暂停 */
  paused: boolean
}

function shiftYM(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  return { y: ny, m: total - ny * 12 + 1 }
}

export async function loadHabitDetail(
  habitId: string,
  year: number,
  month: number,
): Promise<DetailBundle> {
  const habit = await db.habits.get(habitId)
  if (!habit) throw new Error('习惯不存在')
  const today = todayStr()
  const isBad = habit.type === 'bad'
  const v = toViz(habit)
  const pm = shiftYM(year, month, -1)
  const nm = shiftYM(year, month, 1)
  // 相邻月可能跨年：把用到的年份位图都取出来
  const bmap = new Map<number, YearBitmap>()
  for (const yy of new Set([year, pm.y, nm.y])) bmap.set(yy, await getYearBitmap(habit.id, yy))
  const one = (yy: number) => new Map<string, YearBitmap>([[habit.id, bmap.get(yy) as YearBitmap]])
  const bmp = bmap.get(year) as YearBitmap
  // 暂停后：月历/热力图/连续都以暂停日为终点（之后显示为 na，不再算漏打卡）
  const end = statEnd(v, today)
  const exp = expectedDays(v, today)
  const md = minDayOf(v, year)
  const count = bmp.count()
  return {
    habit,
    ym: `${year}-${String(month).padStart(2, '0')}`,
    month: monthView([v], one(year), year, month, end, isBad),
    prevMonth: monthView([v], one(pm.y), pm.y, pm.m, end, isBad),
    nextMonth: monthView([v], one(nm.y), nm.y, nm.m, end, isBad),
    heat: heatCells([v], one(year), year, end),
    stats: {
      count,
      streak: isBad ? currentCleanStreak(bmp, end, md) : currentStreak(bmp, end, md),
      longest: isBad ? longestRun(bmp, false, dayOfYear(end), md) : longestRun(bmp, true, dayOfYear(end), md),
      rate: exp > 0 ? Math.round(((isBad ? exp - count : count) / exp) * 100) : 0,
    },
    end,
    paused: !!habit.archivedAt,
  }
}

export interface ArchivedItem {
  habit: Habit
  /** 暂停日（YYYY-MM-DD） */
  pausedAt: string
  /** 暂停前的累计（好习惯=完成，坏习惯=发生） */
  count: number
  /** 暂停时的当前连续 */
  streak: number
  /** 追踪了多少天 */
  days: number
  rate: number
}

/** 归档中心列表：按暂停日倒序 */
export async function loadArchiveList(): Promise<ArchivedItem[]> {
  const all = await db.habits.toArray()
  const list = all.filter((h) => !!h.archivedAt).sort((a, b) => (a.archivedAt! < b.archivedAt! ? 1 : -1))
  const today = todayStr()
  const out: ArchivedItem[] = []
  for (const h of list) {
    const v = toViz(h)
    const year = Number((h.archivedAt as string).slice(0, 4))
    const bmp = await getYearBitmap(h.id, year)
    const end = statEnd(v, today)
    const exp = expectedDays(v, today)
    const md = minDayOf(v, year)
    const isBad = h.type === 'bad'
    // 累计用事件表直接数（跨年也准），不用单年位图
    const [goodCount, badCount] = await Promise.all([
      db.checkins.where('habitId').equals(h.id).count(),
      db.occurrences.where('habitId').equals(h.id).count(),
    ])
    const count = isBad ? badCount : goodCount
    out.push({
      habit: h,
      pausedAt: h.archivedAt as string,
      count,
      streak: isBad ? currentCleanStreak(bmp, end, md) : currentStreak(bmp, end, md),
      days: exp,
      rate: exp > 0 ? Math.round(((isBad ? exp - count : count) / exp) * 100) : 0,
    })
  }
  return out
}
