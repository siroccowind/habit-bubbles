import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useAppStore } from './store/useAppStore'
import { initInstallCapture } from './lib/install'
import './styles.css'

// 尽早捕获浏览器「可安装」事件（Android Chrome / 桌面 Chrome、Edge），供一键添加到桌面
initInstallCapture()

// 模块能跑到这里 = JS 真的加载并执行了（index.html 的加载失败兜底靠这个标记判断）
;(window as unknown as { __hbMounted?: boolean }).__hbMounted = true

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/** 数据读完就撤掉启动占位（首帧先画骨架，不再白屏干等） */
const boot = document.getElementById('boot')
function hideBoot() {
  if (!boot || boot.classList.contains('out')) return
  boot.classList.add('out')
  window.setTimeout(() => boot.remove(), 320)
}

if (useAppStore.getState().loaded) hideBoot()
const unsub = useAppStore.subscribe((s) => {
  if (s.loaded) {
    hideBoot()
    unsub()
  }
})
// 兜底：读数据异常也别让占位一直挡着（但 JS 没跑起来的情况交给 index.html 的失败面板）
window.setTimeout(() => {
  if ((window as unknown as { __hbMounted?: boolean }).__hbMounted) hideBoot()
}, 5000)

// PWA：生产环境注册 Service Worker（离线可用、可添加到主屏）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache: 'none' → 每次打开都绕过 HTTP 缓存检查 sw.js，发版能及时生效
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // 从后台切回前台时再确认一次有没有新版本
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined)
        })
      })
      .catch(() => undefined)
  })
}
