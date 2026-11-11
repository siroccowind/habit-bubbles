import type { Drop } from '../db/schema'
import { DropIcon } from './DropIcon'

/** 收藏槽：暂存最近掉落，点击进收藏室 */
export default function Tray({
  drops,
  total,
  onOpen,
}: {
  drops: Drop[]
  total: number
  onOpen: () => void
}) {
  return (
    <button className="tray" onClick={onOpen}>
      <span className="tray-items">
        {drops.length === 0 ? (
          <span className="tray-hint">完美一天，收藏品会落在这里</span>
        ) : (
          drops.map((d) => (
            <i key={d.id} className="tray-item">
              <DropIcon id={d.itemId} size={18} />
            </i>
          ))
        )}
      </span>
      <span className="tray-count">{total} ›</span>
    </button>
  )
}
