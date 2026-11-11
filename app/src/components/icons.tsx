// 线性图标组件（M1-M2 临时用，M3 扩充为完整图标库）

export function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="5" x2="17" y2="5" />
      <circle cx="7.5" cy="5" r="2.1" fill="var(--card)" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <circle cx="12.5" cy="10" r="2.1" fill="var(--card)" />
      <line x1="3" y1="15" x2="17" y2="15" />
      <circle cx="9.5" cy="15" r="2.1" fill="var(--card)" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 11.5 L10 14 L15.2 8.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="4" y="12" width="3.4" height="6" rx="1.2" fill="currentColor" />
      <rect x="9.3" y="7" width="3.4" height="11" rx="1.2" fill="currentColor" />
      <rect x="14.6" y="9.5" width="3.4" height="8.5" rx="1.2" fill="currentColor" />
    </svg>
  )
}
