import { db } from '../db/schema'
import type { ExportData } from './export'

/** 当前本地数据的全量快照（导出文件与云端备份共用同一份结构） */
export async function buildSnapshot(): Promise<ExportData> {
  const [habits, checkins, occurrences, drops] = await Promise.all([
    db.habits.toArray(),
    db.checkins.toArray(),
    db.occurrences.toArray(),
    db.drops.toArray(),
  ])
  return {
    app: 'habit-bubbles',
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    checkins,
    occurrences,
    drops,
  }
}
