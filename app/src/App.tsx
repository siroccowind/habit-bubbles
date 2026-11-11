import { useEffect, useState } from 'react'
import { useAppStore, applyTheme } from './store/useAppStore'
import TabBar, { type Tab } from './components/TabBar'
import PageOverlay from './components/PageOverlay'
import WelcomeSheet, { shouldShowWelcome } from './components/WelcomeSheet'
import TodayScreen from './screens/TodayScreen'
import StatsScreen from './screens/StatsScreen'
import HabitDetailScreen from './screens/HabitDetailScreen'
import SettingsScreen from './screens/SettingsScreen'

export default function App() {
  const [tab, setTab] = useState<Tab>('habit')
  const [detailId, setDetailId] = useState<string | null>(null)
  /** 统计页每次进入都重载（nonce 作 key，重挂载即刷新） */
  const [statsNonce, setStatsNonce] = useState(0)
  /** 统计页的好/坏选择：提升到 App 层，进详情页再返回不丢失 */
  const [statsType, setStatsType] = useState<'good' | 'bad'>('good')
  /** SW 后台更新完成 → 提示刷新（cache-first 打开才快，代价是更新要下次生效） */
  const [updateReady, setUpdateReady] = useState(false)
  /** 公共版首次打开的一次性引导 */
  const [welcome, setWelcome] = useState(() => shouldShowWelcome())
  const load = useAppStore((s) => s.load)
  const theme = useAppStore((s) => s.theme)
  const motionOn = useAppStore((s) => s.motionOn)
  const error = useAppStore((s) => s.error)
  const clearError = useAppStore((s) => s.clearError)
  const rev = useAppStore((s) => s.rev)

  useEffect(() => {
    void load()
  }, [load])

  // auto 主题：跟随系统深浅色变化
  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => applyTheme('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  // iOS 陀螺仪权限：必须在用户手势里申请，且**每次打开都要申请一次**（苹果不支持持久授权）。
  // Safari 对 pointerdown 的「用户激活」判定不稳，改用 touchend / click / pointerup 三重兜底。
  useEffect(() => {
    if (!motionOn) return
    let asked = false
    const kick = () => {
      if (asked) return
      asked = true
      void useAppStore.getState().requestMotion()
    }
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('touchend', kick, opts)
    window.addEventListener('click', kick, opts)
    window.addEventListener('pointerup', kick, opts)
    return () => {
      window.removeEventListener('touchend', kick)
      window.removeEventListener('click', kick)
      window.removeEventListener('pointerup', kick)
    }
  }, [motionOn])

  // SW 后台拉到新版本 → 顶部小胶囊提示（不打断操作）
  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    const onMsg = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === 'hb-update') setUpdateReady(true)
    }
    sw.addEventListener('message', onMsg)
    return () => sw.removeEventListener('message', onMsg)
  }, [])

  function goTab(t: Tab) {
    setTab(t)
    if (t === 'stats') setStatsNonce((n) => n + 1)
  }

  // 任意一次写入（含补记历史日期）都让统计页在下次进入时重载
  useEffect(() => {
    setStatsNonce((n) => n + 1)
  }, [rev])

  return (
    <div className="app">
      {/* 顶部浮现提示：2.8 秒自动消失（不再常驻挡屏幕） */}
      {error && (
        <div className="toast top-toast" role="status" onClick={clearError}>
          {error}
        </div>
      )}
      {updateReady && (
        <button className="update-pill" onClick={() => window.location.reload()}>
          有新版本 · 点击刷新
        </button>
      )}
      {/* 三个页面常驻 DOM，仅切换可见性——习惯页的气泡位置、屏幕小物件在切页/进详情后保持 */}
      <main className="content">
        <div className="tab-page" hidden={tab !== 'habit'}>
          <TodayScreen />
        </div>
        <div className="tab-page" hidden={tab !== 'stats'}>
          <StatsScreen key={statsNonce} type={statsType} onTypeChange={setStatsType} onOpenHabit={setDetailId} />
        </div>
        <div className="tab-page" hidden={tab !== 'settings'}>
          <SettingsScreen />
        </div>
      </main>
      {welcome && <WelcomeSheet onClose={() => setWelcome(false)} />}
      <TabBar tab={tab} onChange={goTab} />
      {/* 习惯详情：覆盖层渲染，不卸载 main——返回后习惯页小物件、统计页筛选状态原样保留 */}
      {detailId && (
        <PageOverlay onBack={() => setDetailId(null)}>
          <HabitDetailScreen
            habitId={detailId}
            onBack={() => setDetailId(null)}
            onGone={() => setDetailId(null)}
            onChanged={() => setStatsNonce((n) => n + 1)}
          />
        </PageOverlay>
      )}
    </div>
  )
}
