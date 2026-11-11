import { useState } from 'react'
import { APP_NAME } from '../lib/edition'
import AddToHomeSheet from './AddToHomeSheet'

const KEY = 'hb-welcome-v1'

/** 只给公共版用：第一次打开时出现一次，之后不再打扰 */
export function shouldShowWelcome(): boolean {
  try {
    return !window.localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export default function WelcomeSheet({ onClose }: { onClose: () => void }) {
  const [guide, setGuide] = useState(false)

  function done() {
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      /* 隐私模式忽略 */
    }
    onClose()
  }

  return (
    <>
      <div className="sheet-mask welcome-mask">
        <div className="sheet welcome-sheet" role="dialog" aria-modal="true" aria-label="欢迎">
          <div className="welcome-hero" aria-hidden="true">
            <span className="wb wb1" />
            <span className="wb wb2" />
            <span className="wb wb3" />
          </div>

          <h2 className="welcome-title">欢迎使用{APP_NAME}</h2>
          <p className="welcome-sub">戳破一个气泡，就是一次打卡。</p>

          <ul className="welcome-list">
            <li>
              <span className="wl-ic">📱</span>
              <div>
                <b>数据只在这台手机上</b>
                <p>不上传、不用注册，断网也能照常用。</p>
              </div>
            </li>
            <li>
              <span className="wl-ic">🧼</span>
              <div>
                <b>清浏览器数据会把它清掉</b>
                <p>换手机、清历史记录、用无痕模式，都算。</p>
              </div>
            </li>
            <li>
              <span className="wl-ic">📦</span>
              <div>
                <b>偶尔导出一份备份</b>
                <p>设置 → 数据与备份 → 导出 JSON，几分钟的事。</p>
              </div>
            </li>
          </ul>

          <button className="primary block welcome-cta" onClick={done}>
            开始
          </button>
          <button className="welcome-link" onClick={() => setGuide(true)}>
            添加到主屏幕，用起来更像 App
          </button>
        </div>
      </div>

      {guide && <AddToHomeSheet onClose={() => setGuide(false)} />}
    </>
  )
}
