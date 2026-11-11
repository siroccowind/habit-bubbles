// 日期工具：一律使用本地日字符串 YYYY-MM-DD，规避时区 bug

export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isToday(s: string, now: Date = new Date()): boolean {
  return s === todayStr(now)
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

/** 一年中的第几天，1..366 */
export function dayOfYear(dateStr: string): number {
  const d = parseDate(dateStr)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.round((d.getTime() - start.getTime()) / 86400000) + 1
}

/**
 * 严格当日记录：写入层强制校验。
 * 过去与未来的日期一律拒绝——这是数据诚实性的技术保障，不仅是界面限制。
 */
export function assertToday(dateStr: string): void {
  if (!isToday(dateStr)) {
    throw new Error(`严格当日记录：拒绝写入非当天日期 ${dateStr}`)
  }
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function formatCN(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

/** 0 = 周一 … 6 = 周日 */
export function weekdayIndex(dateStr: string): number {
  return (parseDate(dateStr).getDay() + 6) % 7
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
