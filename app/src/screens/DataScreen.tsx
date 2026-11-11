import { useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { todayStr } from '../core/date'
import ConfirmDialog from '../components/ConfirmDialog'
import AddToHomeSheet from '../components/AddToHomeSheet'
import { download, parseImport, toCSV, type ExportData } from '../lib/export'
import { buildSnapshot } from '../lib/snapshot'
import { useOverlayClose } from '../components/PageOverlay'

/**
 * 数据与备份：把「数据在哪 / 导出文件 / 从文件导入」收到一个页面里。
 * 设置首页只留一个入口，避免偏好设置和数据管理混在一起。
 */
export default function DataScreen({ onBack }: { onBack: () => void }) {
  const close = useOverlayClose()
  const doClose = close ?? onBack
  const importData = useAppStore((s) => s.importData)
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null)
  const [guide, setGuide] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  function say(m: string) {
    setMsg(m)
    window.setTimeout(() => setMsg(''), 2600)
  }

  async function exportJSON() {
    try {
      const data = await buildSnapshot()
      download(`习惯气泡-${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json')
      say('已导出 JSON 文件')
    } catch {
      say('导出失败，稍后再试')
    }
  }

  async function exportCSV() {
    try {
      const data = await buildSnapshot()
      download(`习惯气泡-${todayStr()}.csv`, toCSV(data), 'text/csv')
      say('已导出 CSV 文件')
    } catch {
      say('导出失败，稍后再试')
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许再次选择同一文件
    if (!file) return
    try {
      setPendingImport(parseImport(await file.text()))
    } catch (err) {
      say(err instanceof Error ? `导入失败：${err.message}` : '导入失败')
    }
  }

  async function doImport() {
    const data = pendingImport
    setPendingImport(null)
    if (!data) return
    await importData(data)
    say('已从文件导入')
  }

  return (
    <div className="screen-settings screen-data">
      <div className="sub-head">
        <button className="back-btn" onClick={doClose} aria-label="返回">
          ‹
        </button>
        <h1 className="sub-title">
          数据与备份
        </h1>
      </div>

      <div className="cloud-card where-card">
        <div className="cloud-head">
          <span className="cloud-title">你的数据在哪</span>
          <span className="cloud-badge">只在本机</span>
        </div>
        <ul className="where-list">
          <li>
            <span className="where-ic">📱</span>
            <div>
              <b>存在这台手机的浏览器里</b>
              <p>不上传服务器、不需要账号，断网也能用。</p>
            </div>
          </li>
          <li>
            <span className="where-ic">🧼</span>
            <div>
              <b>这些操作会清掉它</b>
              <p>清除浏览器数据 / 网站数据、换手机、用无痕模式打开。</p>
            </div>
          </li>
          <li>
            <span className="where-ic">📦</span>
            <div>
              <b>想留住就做两件事</b>
              <p>定期导出 JSON 存到「文件」或网盘；把它加到主屏幕，比网页更稳。</p>
            </div>
          </li>
        </ul>
        <div className="cloud-actions">
          <button className="cloud-btn ghost" onClick={() => setGuide(true)}>
            添加到主屏幕
          </button>
        </div>
      </div>

      <div className="cloud-card">
        <div className="cloud-head">
          <span className="cloud-title">导出文件</span>
          <span className="cloud-badge">手动</span>
        </div>
        <p className="cloud-desc">
          JSON 是一份完整快照，可以自己存到「文件」/ iCloud / 网盘；CSV 只是打卡流水，方便拿去做表。
        </p>
        <div className="cloud-actions">
          <button className="cloud-btn" onClick={() => void exportJSON()}>
            导出 JSON
          </button>
          <button className="cloud-btn ghost" onClick={() => void exportCSV()}>
            导出 CSV
          </button>
        </div>
        <p className="cloud-note">换手机、换应用时，优先用 JSON；CSV 不能用来恢复。</p>
      </div>

      <div className="cloud-card">
        <div className="cloud-head">
          <span className="cloud-title">从文件导入</span>
        </div>
        <p className="cloud-desc">选择之前导出的 JSON 文件，用它覆盖当前设备的数据。导入前会二次确认。</p>
        <div className="cloud-actions">
          <button className="cloud-btn ghost" onClick={() => fileRef.current?.click()}>
            选择 JSON 文件
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e)} />
      </div>

      {msg && <div className="settings-msg">{msg}</div>}

      {guide && <AddToHomeSheet onClose={() => setGuide(false)} />}

      {pendingImport && (
        <ConfirmDialog
          title="导入数据？"
          message={`将用文件中的数据（${pendingImport.habits.length} 个习惯、${pendingImport.checkins.length + pendingImport.occurrences.length} 条记录）覆盖当前设备全部数据，不可恢复。`}
          confirmText="导入"
          danger
          onCancel={() => setPendingImport(null)}
          onConfirm={() => void doImport()}
        />
      )}
    </div>
  )
}
