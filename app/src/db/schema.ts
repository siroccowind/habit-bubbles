// IndexedDB（Dexie）：事件表为唯一事实源，位图为内存读缓存（见 core/bitmap.ts）

import Dexie, { type Table } from 'dexie'

/** 一段暂停区间：start = 第一个不记录的日子；end = 最后一个不记录的日子（未恢复则缺省） */
export interface Suspension {
  start: string
  end?: string
}

export interface Habit {
  id: string
  type: 'good' | 'bad'
  name: string
  icon: string
  color: string
  createdAt: string // 本地日 YYYY-MM-DD
  archivedAt?: string // 本地日（= 暂停日，当天仍算活跃）
  /** 暂停区间历史：暂停不改动任何既有数据，只把区间内的日子排除在「应完成」之外 */
  suspensions?: Suspension[]
  sortOrder: number
}

/** 好习惯打卡事件：只记"完成"，稀疏存储 */
export interface CheckIn {
  habitId: string
  date: string
}

/** 坏习惯发生记录：只记"发生了"，二值（每天最多一条） */
export interface Occurrence {
  habitId: string
  date: string
}

export interface Drop {
  id: string
  itemId: string
  rarity: 'N' | 'R' | 'SSR'
  source: string
  habitId?: string
  date: string
  /** 撤销标记：误触取消后收回，重新完成时复活同一条（不重新 roll） */
  revoked?: boolean
}

export interface Setting {
  key: string
  value: unknown
}

export class HabitDB extends Dexie {
  habits!: Table<Habit, string>
  checkins!: Table<CheckIn, [string, string]>
  occurrences!: Table<Occurrence, [string, string]>
  drops!: Table<Drop, string>
  settings!: Table<Setting, string>

  constructor() {
    super('habit-bubbles')
    this.version(1).stores({
      habits: 'id, type, archivedAt, sortOrder',
      checkins: '[habitId+date], habitId, date',
      occurrences: '[habitId+date], habitId, date',
      drops: 'id, itemId, rarity, date',
      settings: 'key',
    })
    // v2：drops 增加 habitId 索引（撤销复活查询需要；仅加索引，数据保留）
    this.version(2).stores({
      drops: 'id, itemId, rarity, date, habitId',
    })
  }
}

export const db = new HabitDB()
