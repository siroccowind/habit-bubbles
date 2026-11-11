import { useCallback, useEffect, useState } from 'react'
import { loadArchiveList, type ArchivedItem } from '../db/vizRepo'
import { useAppStore } from '../store/useAppStore'
import { useSwipeRow } from '../hooks/useSwipeRow'
import type { Habit } from '../db/schema'
import ConfirmDialog from '../components/ConfirmDialog'
import PageOverlay, { useOverlayClose } from '../components/PageOverlay'
import HabitDetailScreen from './HabitDetailScreen'

/**
 * 归档中心：暂停打卡的习惯都收在这里。
 * · 与习惯页一样能点进详情看月历 / 热力图（只读，记录已暂停）；
 * · 卡片右侧常驻「恢复 / 删除」，也可以左滑露出同样两个操作；
 * · 好习惯绿、坏习惯红，暂停日写在副标题里。
 */
export default function ArchiveScreen({ onBack }: { onBack: () => void }) {
  const close = useOverlayClose()
  const doClose = close ?? onBack
  const [items, setItems] = useState<ArchivedItem[] | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)
  const [msg, setMsg] = useState('')
  const restoreHabit = useAppStore((s) => s.restoreHabit)
  const removeHabit = useAppStore((s) => s.removeHabit)

  const reload = useCallback(async () => {
    setItems(await loadArchiveList())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  function say(m: string) {
    setMsg(m)
    window.setTimeout(() => setMsg(''), 2200)
  }

  async function onRestore(h: Habit) {
    const ok = await restoreHabit(h.id)
    if (!ok) return // 已达活跃上限（好 6 / 坏 3）：store 已弹出提示
    await reload()
    say(`已恢复「${h.name}」，今天开始继续记录`)
  }

  async function onDelete(h: Habit) {
    await removeHabit(h.id)
    await reload()
    say(`已删除「${h.name}」`)
  }

  const good = (items ?? []).filter((i) => i.habit.type === 'good')
  const bad = (items ?? []).filter((i) => i.habit.type === 'bad')

  return (
    <div className="screen-settings screen-archive">
      <div className="sub-head">
        <button className="back-btn" onClick={doClose} aria-label="返回">
          ‹
        </button>
        <h1 className="sub-title">暂停的习惯</h1>
      </div>

      <p className="archive-intro">
        暂停打卡的习惯都在这里，历史记录完整保留。点进去可以看月历和热力图，随时可以恢复继续记录。
      </p>

      {items && items.length === 0 && (
        <div className="empty archive-empty">
          <div className="empty-illus" aria-hidden="true">
            <span className="e-bubble" />
            <span className="e-mini m1" />
            <span className="e-mini m2" />
          </div>
          <p>还没有暂停的习惯</p>
          <p className="dim">在习惯上左滑点「暂停」，或在详情页点「暂停打卡」</p>
        </div>
      )}

      {good.length > 0 && (
        <>
          <div className="group-title">好习惯 · {good.length}</div>
          <div className="archive-list">
            {good.map((it) => (
              <ArchiveRow
                key={it.habit.id}
                item={it}
                onOpen={() => setDetailId(it.habit.id)}
                onRestore={() => void onRestore(it.habit)}
                onDelete={() => setPendingDelete(it.habit)}
              />
            ))}
          </div>
        </>
      )}

      {bad.length > 0 && (
        <>
          <div className="group-title">坏习惯 · {bad.length}</div>
          <div className="archive-list">
            {bad.map((it) => (
              <ArchiveRow
                key={it.habit.id}
                item={it}
                onOpen={() => setDetailId(it.habit.id)}
                onRestore={() => void onRestore(it.habit)}
                onDelete={() => setPendingDelete(it.habit)}
              />
            ))}
          </div>
        </>
      )}

      {msg && <div className="settings-msg">{msg}</div>}

      {detailId && (
        <PageOverlay onBack={() => setDetailId(null)} className="nested">
          <HabitDetailScreen
            habitId={detailId}
            onBack={() => setDetailId(null)}
            onGone={() => {
              setDetailId(null)
              void reload()
            }}
          />
        </PageOverlay>
      )}

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
    </div>
  )
}

function ArchiveRow({
  item,
  onOpen,
  onRestore,
  onDelete,
}: {
  item: ArchivedItem
  onOpen: () => void
  onRestore: () => void
  onDelete: () => void
}) {
  const swipe = useSwipeRow()
  const { habit, pausedAt, count, streak, rate } = item
  const isBad = habit.type === 'bad'
  return (
    <div className="row-wrap">
      <div className="row-actions">
        <button className="act restore" onClick={onRestore}>
          恢复
        </button>
        <button className="act delete" onClick={onDelete}>
          删除
        </button>
      </div>
      <div
        className="arc-card"
        style={{ transform: `translateX(${swipe.dx}px)` }}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
      >
        <button
          className="arc-main"
          onClick={() => {
            if (swipe.didDrag()) return
            onOpen()
          }}
        >
          <span className="ic" style={{ background: isBad ? 'var(--red-soft)' : habit.color }}>
            {habit.icon}
          </span>
          <span className="arc-info">
            <span className="arc-name">
              {habit.name}
              <em className={'arc-type' + (isBad ? ' bad' : '')}>{isBad ? '坏' : '好'}</em>
            </span>
            <span className="arc-meta">
              {pausedAt.slice(5).replace('-', '.')} 暂停 · {isBad ? `发生 ${count}` : `完成 ${count}`} · {rate}%
              {streak > 0 && ` · 连续 ${streak} 天`}
            </span>
          </span>
        </button>
        <span className="arc-btns">
          <button className="mini" onClick={onRestore}>
            恢复
          </button>
          <button className="mini danger-text" onClick={onDelete}>
            删除
          </button>
        </span>
      </div>
    </div>
  )
}
