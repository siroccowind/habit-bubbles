import { useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import PageOverlay from './PageOverlay'
import { COLORS, ICONS, GOOD_TEMPLATES, BAD_TEMPLATES, type Template } from '../data/templates'

/**
 * 新建习惯：单屏完成。
 * - 模板自带预设图标与颜色，点一下直接创建；
 * - 想自定义就在同屏下方：名称 + 颜色 + 图标（可选，不选就只有颜色）。
 */
export default function CreateHabitSheet({ onClose }: { onClose: () => void }) {
  const overlayClose = useRef<(() => void) | null>(null)
  const doClose = () => (overlayClose.current ? overlayClose.current() : onClose())
  const addHabit = useAppStore((s) => s.addHabit)
  const error = useAppStore((s) => s.error)
  const [type, setType] = useState<'good' | 'bad'>('good')
  const [custom, setCustom] = useState('')
  const [color, setColor] = useState(COLORS[5].value)
  const [icon, setIcon] = useState('')

  const templates = type === 'good' ? GOOD_TEMPLATES : BAD_TEMPLATES

  function switchType(t: 'good' | 'bad') {
    setType(t)
    setCustom('')
  }

  async function quickCreate(t: Template) {
    try {
      await addHabit({ type, name: t.name, icon: t.icon, color: t.color })
      doClose()
    } catch {
      // 上限等错误由全局错误条展示，Sheet 保持打开
    }
  }

  async function createCustom() {
    const name = custom.trim()
    if (!name) return
    try {
      await addHabit({ type, name, icon, color })
      doClose()
    } catch {
      // 同上
    }
  }

  return (
    <PageOverlay from="bottom" onBack={onClose} closeRef={overlayClose}>
      <div className="sheet">
        <div className="grab" />
        <div className="sheet-head">
          <span className="sheet-title">新建习惯</span>
          <button className="sheet-close" onClick={doClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="seg">
          <button className={type === 'good' ? 'on' : ''} onClick={() => switchType('good')}>
            好习惯 · 养成
          </button>
          <button className={type === 'bad' ? 'on' : ''} onClick={() => switchType('bad')}>
            坏习惯 · 记录
          </button>
        </div>

        <div className="tpl-hint">点一下模板，直接创建（图标和颜色已配好）</div>
        <div className="tpl-grid">
          {templates.map((t) => (
            <button key={t.name} className="tpl" onClick={() => void quickCreate(t)}>
              <span className="tpl-ic" style={{ background: t.color }}>
                {t.icon}
              </span>
              <span className="tpl-name">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="divider">或者，自己定义一个</div>

        <div className="custom-row">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="习惯名称"
            aria-label="习惯名称"
          />
        </div>

        <div className="pick-label">颜色 · 18 色</div>
        <div className="colors">
          {COLORS.map((c) => (
            <button
              key={c.value}
              className={color === c.value ? 'c on' : 'c'}
              style={{ background: c.value }}
              onClick={() => setColor(c.value)}
              title={c.name}
              aria-label={`颜色 ${c.name}`}
            />
          ))}
        </div>

        <div className="pick-label">图标 · 40 个（可选，不选就只有颜色）</div>
        <div className="icons">
          {ICONS.map((i) => (
            <button
              key={i || 'none'}
              className={icon === i ? 'ic-btn on' : 'ic-btn'}
              onClick={() => setIcon(i)}
              aria-label={i ? `图标 ${i}` : '不要图标'}
            >
              {i || '无'}
            </button>
          ))}
        </div>

        <button className="primary block" disabled={!custom.trim()} onClick={() => void createCustom()}>
          创建
        </button>

        {error && <div className="sheet-error">{error}</div>}
        <div className="hint">
          {type === 'good' ? '好习惯最多 6 个' : '坏习惯最多 3 个'} · 左滑行可暂停 / 删除
        </div>
      </div>
    </PageOverlay>
  )
}
