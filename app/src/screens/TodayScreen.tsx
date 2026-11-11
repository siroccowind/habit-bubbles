import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Habit } from '../db/schema'
import { formatCN } from '../core/date'
import { isMilestone, rollCollectible } from '../core/drops'
import { setRevokedToy, recordDrop, findPerfectDrop, getRevokedPerfect, clearRevokedPerfect } from '../db/repo'
import { getItem } from '../data/items'
import { playDrop, playPop, vibrate } from '../lib/sound'
import { useToday } from '../core/useToday'
import BubbleCanvas from '../components/BubbleCanvas'
import DropLayer, { type ActiveDrop } from '../components/DropLayer'
import Tray from '../components/Tray'
import HabitRow from '../components/HabitRow'
import ImpCard from '../components/ImpCard'
import ImpGhost from '../components/ImpGhost'
import CreateHabitSheet from '../components/CreateHabitSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import Confetti from '../components/Confetti'
import PageOverlay from '../components/PageOverlay'
import CollectionScreen from '../screens/CollectionScreen'
import DatePickerSheet from '../components/DatePickerSheet'

export default function TodayScreen() {
  const good = useAppStore((s) => s.good)
  const bad = useAppStore((s) => s.bad)
  const loaded = useAppStore((s) => s.loaded)
  const load = useAppStore((s) => s.load)
  const form = useAppStore((s) => s.form)
  const setForm = useAppStore((s) => s.setForm)
  const motionOn = useAppStore((s) => s.motionOn)
  const dataEpoch = useAppStore((s) => s.dataEpoch)
  const tray = useAppStore((s) => s.tray)
  const loadTray = useAppStore((s) => s.loadTray)
  const loadCollection = useAppStore((s) => s.loadCollection)
  const toggleGood = useAppStore((s) => s.toggleGood)
  const tapBad = useAppStore((s) => s.tapBad)
  const archiveHabit = useAppStore((s) => s.archiveHabit)
  const removeHabit = useAppStore((s) => s.removeHabit)
  const viewDate = useAppStore((s) => s.viewDate)
  const setViewDate = useAppStore((s) => s.setViewDate)

  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)
  const [drops, setDrops] = useState<ActiveDrop[]>([])
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [zoneOpen, setZoneOpen] = useState(true)
  /** 数据读取异常缓慢时给用户一个自救入口（正常情况不会出现） */
  const [slowLoad, setSlowLoad] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (loaded) {
      setSlowLoad(false)
      return
    }
    const t = window.setTimeout(() => setSlowLoad(true), 6000)
    return () => window.clearTimeout(t)
  }, [loaded])

  const today = useToday()
  const todayRef = useRef(today)
  const displayed = viewDate ?? today

  // 跨天：屏幕上的小物件全部收起进槽，刷新今日状态
  useEffect(() => {
    if (today === todayRef.current) return
    todayRef.current = today
    setDrops([])
    void useAppStore.getState().setViewDate(null)
    void loadTray()
  }, [today, load, loadTray])

  // 清空全部数据：屏幕掉落物与庆祝状态一并清除
  useEffect(() => {
    if (dataEpoch === 0) return
    setDrops([])
    setCelebrate(false)
  }, [dataEpoch])

  function flash(m: string) {
    setToast(m)
    window.setTimeout(() => setToast(''), 2600)
  }

  function spawn(itemId: string, kind: ActiveDrop['kind'], habitId: string, x: number, y: number) {
    seq.current += 1
    setDrops((prev) => [...prev, { key: `d${Date.now()}-${seq.current}`, itemId, kind, habitId, x, y }])
  }

  function settle(key: string) {
    setDrops((prev) => prev.filter((d) => d.key !== key))
    void loadTray()
  }

  /** 完成 / 撤销一个好习惯（气泡与列表共用）：掉落、收回、完美一天 */
  async function complete(habit: Habit, cx: number, cy: number) {
    // 震动要在点击的同步调用栈里发（await 之后部分实现会因用户激活过期而忽略）
    vibrate(10)
    const r = await toggleGood(habit.id)

    if (r.locked) {
      flash('每个习惯每天只能撤销一次')
      return
    }

    if (r.revoked) {
      // 误触撤销：收起掉落物 + 清掉「完美的一天」提示（状态已变，提示不该继续显示）
      setToast('')
      playPop()
      setDrops((prev) => {
        for (const d of prev) {
          if (d.kind === 'toy' && d.habitId === habit.id) setRevokedToy(habit.id, d.itemId)
        }
        return prev.filter((d) => !(d.habitId === habit.id || d.kind === 'collectible'))
      })
      void loadTray()
      void loadCollection()
      return
    }

    // ---- 完成（仅今天掉落玩具 / 触发完美一天；历史补记只落数据，不弹特效） ----
    playPop()
    if (displayed === today && r.toyId) {
      spawn(r.toyId, 'toy', habit.id, cx, cy)
      playDrop('N')
    }

    if (displayed === today) {
      // 完美一天：当天全部好习惯完成 → 掉一个收藏品（概率制，不保底）
      // v1.38：完美一天只偏普通收藏，稀有 / 史诗仅由阶段性里程碑提升
      // 防刷：今天已掉过就不再掉；被撤销删掉过 → 重新掉落之前那一个（不 roll 新的）
      const state = useAppStore.getState()
      if (state.good.length > 0 && state.good.every((g) => g.done)) {
      const already = await findPerfectDrop(today)
      if (already) {
        // 当天已掉过：不重复掉
      } else {
        const memoItem = getRevokedPerfect(today)
        let itemId: string
        let rarity: 'N' | 'R' | 'SSR'
        if (memoItem) {
          // 重新达成：重新掉落被撤销掉的那一个
          itemId = memoItem
          rarity = getItem(memoItem).rarity
          clearRevokedPerfect(today)
        } else {
          const milestone = state.good.some((g) => isMilestone(g.streak))
          const rolled = rollCollectible(milestone)
          itemId = rolled.item.id
          rarity = rolled.item.rarity
        }
        await recordDrop({ itemId, rarity, source: 'perfect', habitId: habit.id })
        const item = getItem(itemId)
        window.setTimeout(() => {
          spawn(item.id, 'collectible', habit.id, window.innerWidth / 2, window.innerHeight * 0.3)
          playDrop(rarity)
          void loadTray()
          void loadCollection()
        }, 460)
        setCelebrate(true)
        window.setTimeout(() => setCelebrate(false), 2400)
        flash('完美的一天 ✦')
      }
      }
    }
  }

  async function onArchive(h: Habit) {
    await archiveHabit(h.id)
    flash(`已暂停「${h.name}」，可在设置中恢复`)
  }

  async function onDelete(h: Habit) {
    await removeHabit(h.id)
    flash(`已删除「${h.name}」`)
  }

  if (!loaded)
    return (
      <div className="loading">
        载入中…
        {slowLoad && (
          <div className="load-hint">
            <p>比平时慢，可能是本地数据被占用或版本过旧</p>
            <button className="soft-cta" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        )}
      </div>
    )

  const shownGood = good.filter((g) => g.habit.createdAt <= displayed)
  const shownBad = bad.filter((b) => b.habit.createdAt <= displayed)
  const pending = shownGood.filter((g) => !g.done)
  const finished = shownGood.filter((g) => g.done)
  const bubbleHabits = pending.map((g) => ({ habit: g.habit, streak: g.streak }))

  return (
    <div className="screen-today">
      <header className="page-head">
        <div className="date-wrap">
          <h1 className="date-head" onClick={() => setCalOpen(true)}>
            {formatCN(displayed)}
            <span className="date-caret" aria-hidden="true">▾</span>
          </h1>
          {viewDate && viewDate !== today && (
            <button className="today-pill" onClick={() => void setViewDate(null)}>
              今天
            </button>
          )}
        </div>
        <div className="form-switch" role="tablist" aria-label="打卡形式">
          <button
            className={form === 'bubble' ? 'on' : ''}
            onClick={() => void setForm('bubble')}
            role="tab"
            aria-selected={form === 'bubble'}
          >
            气泡
          </button>
          <button
            className={form === 'list' ? 'on' : ''}
            onClick={() => void setForm('list')}
            role="tab"
            aria-selected={form === 'list'}
          >
            列表
          </button>
        </div>
      </header>

      {good.length === 0 && bad.length === 0 && (
        <div className="empty">
          <div className="empty-illus" aria-hidden="true">
            <span className="e-bubble" />
            <span className="e-q">?</span>
            <span className="e-mini m1" />
            <span className="e-mini m2" />
          </div>
          <p>还没有任何习惯</p>
          <p className="dim">从模板选一个，10 秒开始追踪</p>
          <button className="soft-cta" onClick={() => setSheet(true)}>
            创建第一个习惯
          </button>
        </div>
      )}

      {good.length > 0 &&
        (form === 'bubble' ? (
          <BubbleCanvas habits={bubbleHabits} onPop={(h, x, y) => void complete(h, x, y)} />
        ) : (
          <section className="list">
            {shownGood.map(({ habit, done, week }) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                kind="good"
                done={done}
                week={week}
                onTap={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  void complete(habit, r.left + r.width / 2, r.top + 16)
                }}
                onArchive={() => void onArchive(habit)}
                onDelete={() => setPendingDelete(habit)}
              />
            ))}
          </section>
        ))}

      {finished.length > 0 && form === 'bubble' && (
        <section className="done-strip" aria-label="今天已完成">
          {finished.map(({ habit }) => (
            <button
              key={habit.id}
              className="done-pill"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                void complete(habit, r.left + r.width / 2, r.top)
              }}
              title="点击取消（每天仅一次）"
            >
              <span className="ic" style={{ background: habit.color }}>
                {habit.icon}
              </span>
              {habit.name}
            </button>
          ))}
        </section>
      )}

      {/* 暗影区：气泡模式 = 暗影幽灵泡；列表模式 = 小恶魔卡片列表 */}
      {bad.length > 0 &&
        (form === 'bubble' ? (
          <div className="imp-pool">
            <span className="pool-tag">暗影区 · 未发生 = 无需记录</span>
            <div className="pool-row">
              {shownBad.map(({ habit, happened, cleanStreak }, i) => (
                <ImpGhost
                  key={habit.id}
                  habit={habit}
                  happened={happened}
                  cleanStreak={cleanStreak}
                  phase={i}
                  onTap={async () => {
                    vibrate(10)
                    const first = await tapBad(habit.id, displayed)
                    if (!first) flash('今天已记录')
                    return first
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <section className="shadow-zone">
            <button className="zone-head" onClick={() => setZoneOpen((o) => !o)} aria-expanded={zoneOpen}>
              <span className="zone-title">暗影区</span>
              <span className="zone-tag">未发生 = 无需记录</span>
              <span className="zone-fold">{zoneOpen ? '收起' : '展开'}</span>
            </button>
            {zoneOpen && (
              <div className="list">
                {shownBad.map(({ habit, happened, cleanStreak, week }) => (
                  <ImpCard
                    key={habit.id}
                    habit={habit}
                    happened={happened}
                    cleanStreak={cleanStreak}
                    week={week}
                    onTap={async () => {
                      vibrate(10)
                      const first = await tapBad(habit.id, displayed)
                      if (!first) flash('今天已记录')
                      return first
                    }}
                    onArchive={() => void onArchive(habit)}
                    onDelete={() => setPendingDelete(habit)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

      <Tray drops={tray} total={tray.length} onOpen={() => setCollectionOpen(true)} />

      <p className="motto">往之不谏，来者可追，求因不求果</p>

      <button className="fab-round" onClick={() => setSheet(true)} aria-label="新建习惯">
        ＋
      </button>
      <DropLayer drops={drops} motionOn={motionOn} onDone={settle} />
      <Confetti show={celebrate} />
      {toast && (
        <div className="toast top-toast" role="status">
          {toast}
        </div>
      )}
      {sheet && <CreateHabitSheet onClose={() => setSheet(false)} />}
      {pendingDelete && (
        <ConfirmDialog
          title={`删除「${pendingDelete.name}」？`}
          message="历史记录将一并删除，不可恢复。"
          confirmText="删除"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const h = pendingDelete
            setPendingDelete(null)
            void onDelete(h)
          }}
        />
      )}
      {collectionOpen && (
        <PageOverlay from="bottom" onBack={() => setCollectionOpen(false)}>
          <CollectionScreen onBack={() => setCollectionOpen(false)} />
        </PageOverlay>
      )}

      {calOpen && (
        <DatePickerSheet
          initial={displayed}
          onClose={() => setCalOpen(false)}
          onPick={(d) => {
            void setViewDate(d)
          }}
        />
      )}
    </div>
  )
}
