// 统计口径：全部为纯函数，读时从位图实时计算，不落库
// 好习惯：位 = 1 表示完成；坏习惯：位 = 1 表示发生

import type { YearBitmap } from './bitmap'
import { dayOfYear, daysInYear, todayStr } from './date'

function countRun(bmp: YearBitmap, start: number, want: boolean, minDay: number): number {
  let n = 0
  let d = start
  while (d >= minDay && bmp.get(d) === want) {
    n++
    d--
  }
  return n
}

/**
 * 好习惯连续完成天数：今天已完成则从今天数，否则从昨天数。
 * minDay = 习惯创建日的一年中第几天，防止把创建前的空白算进连续段。
 */
export function currentStreak(bmp: YearBitmap, dateStr: string = todayStr(), minDay = 1): number {
  const today = dayOfYear(dateStr)
  const start = bmp.get(today) ? today : today - 1
  return countRun(bmp, start, true, minDay)
}

/** 坏习惯连续未发生天数：今天未发生则从今天数，否则从昨天数 */
export function currentCleanStreak(bmp: YearBitmap, dateStr: string = todayStr(), minDay = 1): number {
  const today = dayOfYear(dateStr)
  const start = bmp.get(today) ? today - 1 : today
  return countRun(bmp, start, false, minDay)
}

/** 历史上最长的连续段（upto 通常传今天的 dayOfYear，不数未来） */
export function longestRun(bmp: YearBitmap, want: boolean, upto: number, minDay = 1): number {
  let best = 0
  let cur = 0
  for (let d = minDay; d <= upto; d++) {
    if (bmp.get(d) === want) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 0
    }
  }
  return best
}

/** 当年累计：好习惯 = 完成天数；坏习惯 = 发生天数 */
export function yearCount(bmp: YearBitmap): number {
  return bmp.count()
}

export function yearLength(bmp: YearBitmap): number {
  return daysInYear(bmp.year)
}
