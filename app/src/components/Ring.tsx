export default function Ring({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const mid = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" role="img" aria-label={`今日完成 ${done} / ${total}`}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--line)" strokeWidth={5} />
      <circle
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        stroke="var(--green)"
        strokeWidth={5}
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${mid} ${mid})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fill="var(--text)">
        {done}/{total}
      </text>
    </svg>
  )
}
