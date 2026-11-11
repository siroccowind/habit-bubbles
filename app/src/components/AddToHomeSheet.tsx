import { useState } from 'react'
import { promptInstall, useInstallState } from '../lib/install'

/** 「添加到主屏幕」引导：按平台给不同步骤，微信内先提示用浏览器打开 */
export function detectAddToHome(): {
  standalone: boolean
  intro: string
  steps: string[]
  tip?: string
} {
  if (typeof navigator === 'undefined') {
    return { standalone: false, intro: '在浏览器菜单里可以把它添加到主屏幕。', steps: [] }
  }
  const ua = navigator.userAgent
  const standalone =
    (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(ua)
  const isWeChat = /MicroMessenger/i.test(ua)

  if (isWeChat) {
    return {
      standalone,
      intro: '微信里不能直接添加，先用浏览器打开这个页面：',
      steps: ['点右上角「···」', '选「在浏览器打开」（iPhone 会跳到 Safari）', '再按浏览器的菜单添加到主屏幕'],
      tip: '添加后从桌面打开，不用每次输网址，也更不容易被系统清掉。',
    }
  }
  if (isIOS) {
    return {
      standalone,
      intro: '在 Safari 里两步就能放上桌面：',
      steps: ['点屏幕底部中间的「分享」按钮（方框加向上箭头）', '在列表里往下找「添加到主屏幕」', '右上角点「添加」'],
      tip: '如果不是用 Safari 打开的，先在 Safari 里打开本页。',
    }
  }
  if (isAndroid) {
    return {
      standalone,
      intro: '在浏览器菜单里添加：',
      steps: ['点浏览器右上角的「⋮」', '选「添加到主屏幕」或「安装应用」', '确认即可'],
      tip: '部分浏览器会直接弹出「安装应用」的提示条，点一下也行。',
    }
  }
  return {
    standalone,
    intro: '在浏览器菜单里添加：',
    steps: ['打开浏览器菜单（一般是右上角的三点）', '找「安装应用 / 添加到主屏幕」', '确认'],
    tip: '桌面端浏览器一般是地址栏右侧的安装图标。',
  }
}

export default function AddToHomeSheet({ onClose }: { onClose: () => void }) {
  const info = detectAddToHome()
  const { can } = useInstallState()
  const [msg, setMsg] = useState('')

  async function install() {
    const r = await promptInstall()
    if (r === 'accepted') setMsg('已添加到桌面，回到桌面点图标就能打开。')
    else if (r === 'dismissed') setMsg('已取消。你也可以按下面的步骤手动添加。')
    else setMsg('当前浏览器不支持一键安装，请按下面的步骤手动添加。')
  }

  return (
    <div className="sheet-mask guide-mask" onClick={onClose}>
      <div className="sheet guide-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">添加到主屏幕</span>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {info.standalone ? (
          <div className="guide-done">
            <span className="guide-done-ic">✓</span>
            <p>你已经在主屏幕里打开它了，这一步不用再做。</p>
          </div>
        ) : (
          <>
            {can && (
              <button className="guide-install-btn" onClick={() => void install()}>
                一键添加到桌面
              </button>
            )}
            <p className="guide-note">{info.intro}</p>
            <ol className="guide-steps">
              {info.steps.map((s, i) => (
                <li key={i}>
                  <span className="gs-n">{i + 1}</span>
                  <span className="gs-t">{s}</span>
                </li>
              ))}
            </ol>
            {info.tip && <p className="guide-tip">{info.tip}</p>}
            {msg && <p className="guide-tip">{msg}</p>}
          </>
        )}
      </div>
    </div>
  )
}
