import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ITEMS, RARITY_LABEL } from '../data/items'
import { DropIcon } from '../components/DropIcon'
import { useOverlayClose } from '../components/PageOverlay'
import type { CollectionEntry } from '../db/repo'

/** 收藏室：已收集展示，未收集显示剪影 */
export default function CollectionScreen({ onBack }: { onBack: () => void }) {
  const close = useOverlayClose()
  const doClose = close ?? onBack
  const loadCollection = useAppStore((s) => s.loadCollection)
  const collection = useAppStore((s) => s.collection)

  useEffect(() => {
    void loadCollection()
  }, [loadCollection])

  const owned = new Map(collection.map((c) => [c.itemId, c]))
  const total = collection.reduce((s, c) => s + c.count, 0)
  const byRarity = (r: string) => collection.filter((c) => ITEMS.find((i) => i.id === c.itemId)?.rarity === r).length

  return (
    <div className="screen-collection">
      <div className="sub-head">
        <button className="back-btn" onClick={doClose} aria-label="返回">
          ‹
        </button>
        <span className="sub-title">收藏室</span>
      </div>

      <div className="collection-stats">
        <span>
          <b>{total}</b>
          <i>总数</i>
        </span>
        <span>
          <b>{byRarity('N')}</b>
          <i>普通</i>
        </span>
        <span>
          <b>{byRarity('R')}</b>
          <i>稀有</i>
        </span>
        <span>
          <b>{byRarity('SSR')}</b>
          <i>史诗</i>
        </span>
      </div>

      <div className="collection-grid">
        {ITEMS.map((item) => {
          const entry: CollectionEntry | undefined = owned.get(item.id)
          return (
            <div key={item.id} className={entry ? 'col-tile' : 'col-tile lost'}>
              <DropIcon id={item.id} size={26} silent={!entry} />
              <span className="col-name">{entry ? item.name : '未发现'}</span>
              <span className={`col-rarity r-${item.rarity}`}>{RARITY_LABEL[item.rarity]}</span>
              {entry && entry.count > 1 && <span className="col-count">×{entry.count}</span>}
            </div>
          )
        })}
      </div>

      <p className="about dim">收藏品仅来自「完美的一天」· 普通完成掉落的是玩具，当天可玩、不进收藏室</p>
    </div>
  )
}
