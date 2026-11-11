import { CheckIcon, ChartIcon, GearIcon } from './icons'

export type Tab = 'habit' | 'stats' | 'settings'

const TABS: Array<{ id: Tab; label: string; Icon: () => JSX.Element }> = [
  { id: 'habit', label: '习惯', Icon: CheckIcon },
  { id: 'stats', label: '统计', Icon: ChartIcon },
  { id: 'settings', label: '设置', Icon: GearIcon },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? 'tab on' : 'tab'}
          onClick={() => onChange(t.id)}
        >
          <t.Icon />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
