import { useEffect, useState } from 'react'

/**
 * PWA 安装能力：
 * · Android Chrome / 桌面 Chrome、Edge 等支持 `beforeinstallprompt`，可「一键安装」；
 * · iOS Safari 受系统限制，没有可编程接口，只能引导用户手动「添加到主屏幕」。
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferred: InstallPromptEvent | null = null
let installedFlag = false

const EVT = 'hb-install-available'

/** 尽早调用：在 React 挂载前捕获浏览器的安装事件 */
export function initInstallCapture(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    window.dispatchEvent(new Event(EVT))
  })
  window.addEventListener('appinstalled', () => {
    installedFlag = true
    deferred = null
    window.dispatchEvent(new Event(EVT))
  })
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** 当前浏览器是否提供了一键安装的能力（Android Chrome / 桌面 Chrome、Edge 等） */
export function canPromptInstall(): boolean {
  return !!deferred
}

/**
 * 触发原生安装弹窗。
 * 返回 'accepted' 已安装 / 'dismissed' 用户取消 / 'unavailable' 当前浏览器不支持
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  const ev = deferred
  try {
    await ev.prompt()
    const choice = await ev.userChoice
    deferred = null
    installedFlag = installedFlag || choice.outcome === 'accepted'
    window.dispatchEvent(new Event(EVT))
    return choice.outcome
  } catch {
    return 'unavailable'
  }
}

/** 最近一次「已安装」状态（appinstalled 触发后为 true） */
export function wasInstalled(): boolean {
  return installedFlag
}

/** 订阅安装可用性，供组件展示「一键安装」或手动步骤 */
export function useInstallState(): { can: boolean; standalone: boolean } {
  const [state, setState] = useState(() => ({ can: canPromptInstall(), standalone: isStandalone() }))
  useEffect(() => {
    const update = () => setState({ can: canPromptInstall(), standalone: isStandalone() })
    window.addEventListener(EVT, update)
    window.addEventListener('appinstalled', update)
    // 部分浏览器安装能力回填较晚，打开页面后再补测一次
    const t = window.setTimeout(update, 1500)
    return () => {
      window.removeEventListener(EVT, update)
      window.removeEventListener('appinstalled', update)
      window.clearTimeout(t)
    }
  }, [])
  return state
}
