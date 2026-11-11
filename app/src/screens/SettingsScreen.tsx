import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import ConfirmDialog from '../components/ConfirmDialog'
import PageOverlay from '../components/PageOverlay'
import GuideSheet from '../components/GuideSheet'
import MotionHelpSheet from '../components/MotionHelpSheet'
import ArchiveScreen from './ArchiveScreen'
import DataScreen from './DataScreen'
import { canVibrate, vibrate } from '../lib/sound'
import { isIOS, isMobileDevice } from '../lib/platform'

export default function SettingsScreen() {
  const loadArchived = useAppStore((s) => s.loadArchived)
  const archived = useAppStore((s) => s.archived)
  const clearAllData = useAppStore((s) => s.clearAllData)
  const form = useAppStore((s) => s.form)
  const setForm = useAppStore((s) => s.setForm)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const motionOn = useAppStore((s) => s.motionOn)
  const motionState = useAppStore((s) => s.motionState)
  const motionSeen = useAppStore((s) => s.motionSeen)
  const toggleMotion = useAppStore((s) => s.toggleMotion)
  const soundOn = useAppStore((s) => s.soundOn)
  const toggleSound = useAppStore((s) => s.toggleSound)
  const vibrateOn = useAppStore((s) => s.vibrateOn)
  const toggleVibrate = useAppStore((s) => s.toggleVibrate)
  const [confirmClear, setConfirmClear] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [motionHelp, setMotionHelp] = useState(false)
  const [msg, setMsg] = useState('')

  // 归档数量用于入口角标；从归档中心返回后同步刷新
  useEffect(() => {
    void loadArchived()
  }, [loadArchived, archiveOpen])

  function say(m: string) {
    setMsg(m)
    window.setTimeout(() => setMsg(''), 2000)
  }

  async function doClear() {
    setConfirmClear(false)
    await clearAllData()
    say('已清空全部数据')
  }

  const ios = isIOS()
  const canMotion = isMobileDevice()
  // 体感说明：只给当前平台真正适用的一句话，细节收进「怎么开启？」的小弹层
  const motionHint = !canMotion
    ? '桌面端没有方向传感器，自动使用普通重力。'
    : !motionOn
      ? '小物件随手机倾斜滚动。'
      : motionState === 'unsupported'
        ? '当前设备没有方向传感器，无法使用体感。'
        : motionState === 'denied'
          ? '动作权限未开启。'
          : motionSeen
            ? '已生效 · 倾斜手机即可。'
            : ios
              ? '已开启 · 需要允许一次动作权限。'
              : '已开启 · 倾斜手机即可。'
  // 只有 iOS 才可能出现「需要授权 / 被拒绝」；安卓无需授权，桌面端直接禁用
  const needsMotionHelp = canMotion && ios && motionOn && (!motionSeen || motionState === 'denied')

  async function onToggleMotion() {
    const next = !motionOn
    await toggleMotion(next)
    if (next && isIOS() && useAppStore.getState().motionState === 'denied') {
      say('动作权限未开启，点「怎么开启？」看看')
    }
  }

  return (
    <div className="screen-settings">
      <h1>设置</h1>

      <div className="set-group">
        <div className="set-row">
          <span>主题</span>
          <div className="seg sm">
            <button className={theme === 'light' ? 'on' : ''} onClick={() => void setTheme('light')}>
              浅色
            </button>
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => void setTheme('dark')}>
              深色
            </button>
            <button className={theme === 'auto' ? 'on' : ''} onClick={() => void setTheme('auto')}>
              自动
            </button>
          </div>
        </div>
        <div className="set-row">
          <span>打卡形式</span>
          <div className="seg sm">
            <button className={form === 'bubble' ? 'on' : ''} onClick={() => void setForm('bubble')}>
              气泡
            </button>
            <button className={form === 'list' ? 'on' : ''} onClick={() => void setForm('list')}>
              列表
            </button>
          </div>
        </div>
        <div className="set-row">
          <span>音效</span>
          <button
            className={'toggle' + (soundOn ? ' on' : '')}
            role="switch"
            aria-checked={soundOn}
            aria-label="音效"
            onClick={() => void toggleSound(!soundOn)}
          />
        </div>
        <div className="set-row">
          <div className="set-col">
            <span>震动</span>
            {!canVibrate() && (
              <div className="set-sub">
                iPhone / Safari 不提供网页振动接口（系统限制），当前设备无效；Android 可用。
              </div>
            )}
          </div>
          <button
            className={'toggle' + (vibrateOn && canVibrate() ? ' on' : '')}
            role="switch"
            aria-checked={vibrateOn && canVibrate()}
            aria-label="震动"
            disabled={!canVibrate()}
            onClick={() => {
              // 打开时立刻短震一下，方便确认手感
              if (!vibrateOn) vibrate(18)
              void toggleVibrate(!vibrateOn)
            }}
          />
        </div>
        <div className="set-row">
          <div className="set-col">
            <span>体感 · 晃动手机</span>
            <div className="set-sub">{motionHint}</div>
            {needsMotionHelp && (
              <button className="motion-help" onClick={() => setMotionHelp(true)}>
                <span className="motion-help-ic" aria-hidden="true">
                  ?
                </span>
                怎么开启？
              </button>
            )}
          </div>
          <button
            className={'toggle' + (motionOn && canMotion ? ' on' : '')}
            role="switch"
            aria-checked={motionOn && canMotion}
            aria-label="体感"
            disabled={!canMotion}
            onClick={() => void onToggleMotion()}
          />
        </div>
      </div>

      <div className="set-group">
        <button className="set-row nav-row" onClick={() => setDataOpen(true)}>
          <div className="set-col">
            <span>数据与备份</span>
            <div className="set-sub">导出文件 · 从文件导入</div>
          </div>
          <span className="nav-right">
            <i className="chev" aria-hidden="true">
              ›
            </i>
          </span>
        </button>

        <button className="set-row nav-row" onClick={() => setArchiveOpen(true)}>
          <div className="set-col">
            <span>暂停的习惯</span>
            <div className="set-sub">暂停打卡的习惯 · 查看历史 / 恢复 / 删除</div>
          </div>
          <span className="nav-right">
            {archived.length > 0 && <em className="count-badge">{archived.length}</em>}
            <i className="chev" aria-hidden="true">
              ›
            </i>
          </span>
        </button>
      </div>

      <div className="set-group">
        <button className="set-row nav-row" onClick={() => setGuideOpen(true)}>
          <div className="set-col">
            <span>使用指南</span>
            <div className="set-sub">添加到桌面 · 数据存在哪 · 怎么备份 · 功能说明</div>
          </div>
          <span className="nav-right">
            <i className="chev" aria-hidden="true">
              ›
            </i>
          </span>
        </button>
      </div>

      <button className="danger" onClick={() => setConfirmClear(true)}>
        清空全部数据
      </button>

      {msg && <div className="settings-msg">{msg}</div>}

      {dataOpen && (
        <PageOverlay onBack={() => setDataOpen(false)}>
          <DataScreen onBack={() => setDataOpen(false)} />
        </PageOverlay>
      )}

      {archiveOpen && (
        <PageOverlay onBack={() => setArchiveOpen(false)}>
          <ArchiveScreen onBack={() => setArchiveOpen(false)} />
        </PageOverlay>
      )}

      {guideOpen && <GuideSheet onClose={() => setGuideOpen(false)} />}
      {motionHelp && <MotionHelpSheet onClose={() => setMotionHelp(false)} />}

      {confirmClear && (
        <ConfirmDialog
          title="清空全部数据？"
          message="所有习惯与打卡记录都会被删除，此操作不可恢复。云端存档里如果有，可以之后再取回。"
          confirmText="清空"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => void doClear()}
        />
      )}
    </div>
  )
}
