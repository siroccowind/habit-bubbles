// 数据导出：JSON 全量快照 + CSV 事件流水（Excel 友好：BOM + CRLF）

import type { CheckIn, Drop, Habit, Occurrence } from '../db/schema'

export interface ExportData {
  app: 'habit-bubbles'
  version: 1
  exportedAt: string
  habits: Habit[]
  checkins: CheckIn[]
  occurrences: Occurrence[]
  drops: Drop[]
}

function esc(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

/** CSV 事件流水：date, habitId, name, type, kind */
export function toCSV(data: ExportData): string {
  const nameOf = new Map(data.habits.map((h) => [h.id, h.name]))
  const rows: string[][] = [['date', 'habitId', 'name', 'type', 'kind']]
  for (const c of data.checkins) {
    rows.push([c.date, c.habitId, nameOf.get(c.habitId) ?? '', 'good', 'checkin'])
  }
  for (const o of data.occurrences) {
    rows.push([o.date, o.habitId, nameOf.get(o.habitId) ?? '', 'bad', 'occurrence'])
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

/** 触发浏览器下载 */
export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 校验并规整一份快照（本地文件与云端备份共用） */
export function normalizeSnapshot(data: unknown): ExportData {
  const d = data as Partial<ExportData>
  if (
    !d ||
    d.app !== 'habit-bubbles' ||
    !Array.isArray(d.habits) ||
    !Array.isArray(d.checkins) ||
    !Array.isArray(d.occurrences)
  ) {
    throw new Error('不是习惯气泡的备份数据')
  }
  return {
    app: 'habit-bubbles',
    version: 1,
    exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : '',
    habits: d.habits,
    checkins: d.checkins,
    occurrences: d.occurrences,
    drops: Array.isArray(d.drops) ? d.drops : [],
  }
}

/** 解析导入的 JSON 快照并校验基本结构，不合法则抛错 */
export function parseImport(text: string): ExportData {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('不是有效的 JSON 文件')
  }
  return normalizeSnapshot(data)
}
