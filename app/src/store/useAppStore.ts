import { create } from 'zustand'
import { db } from '../db/schema'
import { todayStr } from '../core/date'
import {
  archiveHabit as archiveHabitRepo,
  completeGood,
  createHabit,
  deleteHabit,
  importAll,
  listArchivedHabits,
  loadCollection,
  loadSetting,
  loadToday,
  recentDrops,
  recordOccurrence,
  saveSetting,
  unarchiveHabit as unarchiveHabitRepo,
  type CollectionEntry,
  type GoodResult,
  type TodayState,
} from '../db/repo'
import type { Drop, Habit } from '../db/schema'
import type { ExportData } from '../lib/export'
import { setMuted } from '../lib/sound'

interface AppState {
  loaded: boolean
  good: TodayState['good']
  bad: TodayState['bad']
  /** 当前正在查看的日期（null = 今天）；补记历史用 */
  viewDate: string | null
  archived: Habit[]
  /** 打卡形式：气泡 / 列表 */
  form: 'bubble' | 'list'
  /** 收藏槽最近掉落 */
  tray: Drop[]
  collection: CollectionEntry[]
  /** 主题：浅色 / 深色 / 跟随系统 */
  theme: 'light' | 'dark' | 'auto'
  /** 体感：晃动手机移动掉落物 */
  motionOn: boolean
  /** iOS 陀螺仪授权结果（每次会话都要重新请求，苹果的限制） */
  motionState: 'unknown' | 'granted' | 'denied' | 'unsupported'
  /** 是否真的收到过 deviceorientation 事件（没收到 = 权限没生效 / 设备无传感器） */
  motionSeen: boolean
  soundOn: boolean
  vibrateOn: boolean
  /** 数据世代：清空全部数据时 +1，用于通知各页清理屏幕状态（如掉落物） */
  dataEpoch: number
  /** 数据修订号：每次写入成功后 +1（云端自动存档靠它触发，防抖 5s） */
  rev: number
  error: string | null
  load: () => Promise<void>
  clearError: () => void
  loadArchived: () => Promise<void>
  loadTray: () => Promise<void>
  loadCollection: () => Promise<void>
  clearAllData: () => Promise<void>
  /** 导入 JSON 快照（全量替换当前数据） */
  importData: (data: ExportData) => Promise<void>
  setForm: (v: 'bubble' | 'list') => Promise<void>
  setTheme: (v: 'light' | 'dark' | 'auto') => Promise<void>
  toggleMotion: (v: boolean) => Promise<void>
  /** 在用户手势内请求陀螺仪权限（iOS 每次会话都必须调一次） */
  requestMotion: () => Promise<boolean>
  markMotionSeen: () => void
  toggleSound: (v: boolean) => Promise<void>
  toggleVibrate: (v: boolean) => Promise<void>
  toggleGood: (habitId: string, date?: string) => Promise<GoodResult>
  /** 返回 true = 本次为新记录；false = 当天已记录过（二值） */
  tapBad: (habitId: string, date?: string) => Promise<boolean>
  /** 切换正在查看的日期（null = 回到今天），并刷新该日状态 */
  setViewDate: (d: string | null) => Promise<void>
  addHabit: (input: { type: 'good' | 'bad'; name: string; icon: string; color: string }) => Promise<void>
  removeHabit: (habitId: string) => Promise<void>
  archiveHabit: (habitId: string) => Promise<void>
  restoreHabit: (habitId: string) => Promise<boolean>
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 应用主题到 <html data-theme>，并同步 theme-color + localStorage（下次冷启动可内联直出，不闪白） */
export function applyTheme(theme: 'light' | 'dark' | 'auto'): void {
  const dark =
    theme === 'dark' ||
    (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F5F5F7')
  try {
    window.localStorage.setItem('hb-theme', theme)
  } catch {
    /* 隐私模式忽略 */
  }
}

/** 顶部浮现提示：2.8 秒后自动消失（不再常驻，也不挡操作） */
let errTimer: number | undefined
export function flashError(message: string): void {
  useAppStore.setState({ error: message })
  if (errTimer) window.clearTimeout(errTimer)
  errTimer = window.setTimeout(() => useAppStore.setState({ error: null }), 2800)
}

/**
 * 请求陀螺仪权限。
 * iOS(Safari / 主屏 PWA) 的规则：**每次页面会话都要重新请求一次**，且必须在用户手势内调用，
 * 否则事件永远不来（这就是「每次打开都要重新开关体感」的根因——不是配置丢了，是苹果不给持久授权）。
 */
export async function requestMotionPermission(): Promise<boolean> {
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
  if (typeof DeviceOrientationEvent === 'undefined') return false
  if (typeof D.requestPermission !== 'function') return true // 非 iOS：无需授权
  try {
    return (await D.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  good: [],
  bad: [],
  viewDate: null,
  archived: [],
  form: 'bubble',
  tray: [],
  collection: [],
  theme: 'auto',
  // 体感默认开：桌面上无传感器会自动降级为普通重力；iOS 首次触摸时弹权限（见 App）
  motionOn: true,
  motionState: 'unknown',
  motionSeen: false,
  soundOn: true,
  vibrateOn: true,
  dataEpoch: 0,
  rev: 0,
  error: null,

  load: async () => {
    try {
      const s = await loadToday(get().viewDate ?? todayStr())
      set({ good: s.good, bad: s.bad, loaded: true, error: null })
    } catch (e) {
      flashError(msg(e))
    }
    // 偏好与收藏（失败不影响主流程）
    try {
      const [form, theme, motion, sound, vibrate, tray, collection] = await Promise.all([
        loadSetting<'bubble' | 'list'>('form', 'bubble'),
        loadSetting<'light' | 'dark' | 'auto'>('theme', 'auto'),
        loadSetting<boolean>('motion', true),
        loadSetting<boolean>('sound', true),
        loadSetting<boolean>('vibrate', true),
        recentDrops(8),
        loadCollection(),
      ])
      applyTheme(theme)
      setMuted(!sound)
      set({ form, theme, motionOn: motion, soundOn: sound, vibrateOn: vibrate, tray, collection })
    } catch (e) {
      flashError(msg(e))
    }
  },

  clearError: () => set({ error: null }),

  loadArchived: async () => {
    try {
      set({ archived: await listArchivedHabits() })
    } catch (e) {
      flashError(msg(e))
    }
  },

  loadTray: async () => {
    try {
      set({ tray: await recentDrops(8) })
    } catch (e) {
      flashError(msg(e))
    }
  },

  loadCollection: async () => {
    try {
      set({ collection: await loadCollection() })
    } catch (e) {
      flashError(msg(e))
    }
  },

  clearAllData: async () => {
    try {
      await Promise.all([
        db.habits.clear(),
        db.checkins.clear(),
        db.occurrences.clear(),
        db.drops.clear(),
        db.settings.clear(),
      ])
    } catch (e) {
      flashError(msg(e))
      return
    }
    // 世代 +1：通知「习惯」页清理屏幕掉落物等本地状态
    set({ dataEpoch: get().dataEpoch + 1, rev: get().rev + 1, viewDate: null })
    await get().load()
    await get().loadArchived()
  },

  importData: async (data) => {
    try {
      await importAll(data)
    } catch (e) {
      flashError(msg(e))
      return
    }
    set({ dataEpoch: get().dataEpoch + 1, rev: get().rev + 1, viewDate: null })
    await get().load()
    await get().loadArchived()
  },

  setForm: async (v) => {
    set({ form: v })
    try {
      await saveSetting('form', v)
    } catch (e) {
      flashError(msg(e))
    }
  },

  setTheme: async (v) => {
    set({ theme: v })
    applyTheme(v)
    try {
      await saveSetting('theme', v)
    } catch (e) {
      flashError(msg(e))
    }
  },

  requestMotion: async () => {
    const supported = typeof DeviceOrientationEvent !== 'undefined'
    if (!supported) {
      set({ motionState: 'unsupported' })
      return false
    }
    const ok = await requestMotionPermission()
    set({ motionState: ok ? 'granted' : 'denied', motionSeen: ok ? get().motionSeen : false })
    return ok
  },

  markMotionSeen: () => {
    if (!get().motionSeen) set({ motionSeen: true, motionState: 'granted' })
  },

  toggleMotion: async (v) => {
    set({ motionOn: v })
    // iOS 需要用户手势内请求陀螺仪权限（关闭时无需请求）
    if (v) await get().requestMotion()
    try {
      await saveSetting('motion', v)
    } catch (e) {
      flashError(msg(e))
    }
  },

  toggleSound: async (v) => {
    set({ soundOn: v })
    setMuted(!v)
    try {
      await saveSetting('sound', v)
    } catch (e) {
      flashError(msg(e))
    }
  },

  toggleVibrate: async (v) => {
    set({ vibrateOn: v })
    try {
      await saveSetting('vibrate', v)
    } catch (e) {
      flashError(msg(e))
    }
  },

  toggleGood: async (habitId, date) => {
    const d = date ?? get().viewDate ?? todayStr()
    try {
      const r = await completeGood(habitId, d)
      // 撤销/完成/锁定都刷新（锁定不变态，但也无害）
      await get().load()
      if (!r.locked) set({ rev: get().rev + 1 })
      return r
    } catch (e) {
      flashError(msg(e))
      return { done: false }
    }
  },

  tapBad: async (habitId, date) => {
    const d = date ?? get().viewDate ?? todayStr()
    try {
      const first = await recordOccurrence(habitId, d)
      if (first) {
        await get().load()
        set({ rev: get().rev + 1 })
      }
      return first
    } catch (e) {
      flashError(msg(e))
      return false
    }
  },

  setViewDate: async (d) => {
    // 选中「今天」等同于回到今天：存 null，避免日期后面还挂着一个「今天」胶囊
    set({ viewDate: d && d === todayStr() ? null : d })
    await get().load()
  },

  addHabit: async (input) => {
    try {
      await createHabit(input)
    } catch (e) {
      flashError(msg(e))
      throw e
    }
    await get().load()
    set({ rev: get().rev + 1 })
  },

  removeHabit: async (habitId) => {
    try {
      await deleteHabit(habitId)
    } catch (e) {
      flashError(msg(e))
      return
    }
    await get().load()
    set({ rev: get().rev + 1 })
  },

  archiveHabit: async (habitId) => {
    try {
      await archiveHabitRepo(habitId)
    } catch (e) {
      flashError(msg(e))
      return
    }
    await get().load()
    set({ rev: get().rev + 1 })
  },

  restoreHabit: async (habitId) => {
    try {
      await unarchiveHabitRepo(habitId)
    } catch (e) {
      flashError(msg(e))
      return false
    }
    await get().load()
    await get().loadArchived()
    set({ rev: get().rev + 1 })
    return true
  },
}))
