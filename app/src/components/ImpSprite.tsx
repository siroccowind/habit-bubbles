// 暗影小恶魔（😈 参考）：红色圆头 + 白角 + 绿眼 + 咧嘴
//  · 今天记录过 → 睁眼坏笑、露出牙齿（邪恶但不吓人）
//  · 今天还没记录 → 闭眼打盹，红色褪成暗红、安静待着
//  · 连续未发生越久，整体越淡越小，像悄悄缩回暗影里

import { useId } from 'react'

interface Props {
  /** 连续未发生天数（越久越淡越小） */
  streak: number
  /** 打盹态（今天未发生） */
  asleep: boolean
  size?: number
}

/** 越久没发生 → 越暗越透 */
function tone(streak: number): { hi: string; lo: string; horn: string; hornIn: string; alpha: number } {
  if (streak >= 100) return { hi: '#D98A85', lo: '#8E4148', horn: '#E6E6EC', hornIn: '#C9C9D2', alpha: 0.75 }
  if (streak >= 30) return { hi: '#E0706B', lo: '#8A2630', horn: '#EFEFF4', hornIn: '#CFCFD8', alpha: 0.85 }
  if (streak >= 7) return { hi: '#EA5F58', lo: '#961A24', horn: '#F6F6F9', hornIn: '#D6D6DE', alpha: 0.93 }
  return { hi: '#F45B50', lo: '#B3121F', horn: '#FFFFFF', hornIn: '#DCDCE4', alpha: 1 }
}

/** 打盹时把红色压暗一档 */
function mix(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * 0.76)
  const g = Math.round(((n >> 8) & 255) * 0.7)
  const b = Math.round((n & 255) * 0.72)
  return `rgb(${r},${g},${b})`
}

/** 小恶魔头像（纯 SVG，无外部资源） */
export default function ImpSprite({ streak, asleep, size = 46 }: Props) {
  const uid = useId().replace(/:/g, '')
  const t = tone(streak)
  const scale = 1 - Math.min(streak, 120) / 700 // 长期未发生 → 略微缩小
  const s = size * scale

  const gHead = `h-${uid}`
  const gEye = `e-${uid}`
  const gHorn = `n-${uid}`
  // 记录过 = 鲜红；打盹 = 暗一档
  const hi = asleep ? mix(t.hi) : t.hi
  const lo = asleep ? mix(t.lo) : t.lo

  return (
    <span className={'imp' + (asleep ? ' asleep' : ' awake')} style={{ width: s, height: s, opacity: t.alpha }}>
      <svg viewBox="0 0 48 48" width={s} height={s} aria-hidden="true">
        <defs>
          <radialGradient id={gHead} cx="0.34" cy="0.24" r="0.86">
            <stop offset="0%" stopColor={hi} />
            <stop offset="62%" stopColor={hi} stopOpacity="0.96" />
            <stop offset="100%" stopColor={lo} />
          </radialGradient>
          <radialGradient id={gEye} cx="0.4" cy="0.32" r="0.7">
            <stop offset="0%" stopColor="#B8FFA6" />
            <stop offset="45%" stopColor="#3BE05A" />
            <stop offset="100%" stopColor="#0E9B32" />
          </radialGradient>
          <linearGradient id={gHorn} x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor={t.hornIn} />
            <stop offset="100%" stopColor={t.horn} />
          </linearGradient>
        </defs>

        {/* 两只角（从头两侧斜上伸出） */}
        <path
          d="M12.6 16.2 C10 11 8.6 6.8 9.5 3.6 C13 6.6 16.6 10.4 18.6 14.2 Z"
          fill={`url(#${gHorn})`}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="0.9"
        />
        <path
          d="M35.4 16.2 C38 11 39.4 6.8 38.5 3.6 C35 6.6 31.4 10.4 29.4 14.2 Z"
          fill={`url(#${gHorn})`}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="0.9"
        />

        {/* 头 */}
        <circle cx="24" cy="27" r="15" fill={`url(#${gHead})`} stroke="rgba(58,6,10,0.55)" strokeWidth="1.1" />
        {/* 顶部高光 + 底部暗面 */}
        <ellipse
          cx="17.6"
          cy="19.4"
          rx="4.4"
          ry="2.8"
          fill="#fff"
          opacity="0.2"
          transform="rotate(-22 17.6 19.4)"
        />
        <path
          d="M11 33.5 C14 39.6 20 41 24 41 C28 41 34 39.6 37 33.5 C33 37.6 28 38.6 24 38.6 C20 38.6 15 37.6 11 33.5 Z"
          fill="#4A0308"
          opacity="0.22"
        />

        {/* 眼睛 */}
        {asleep ? (
          <>
            <path
              d="M14.4 26.2 Q17.2 29.2 20 26.2"
              stroke="#3A0609"
              strokeWidth="1.9"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M28 26.2 Q30.8 29.2 33.6 26.2"
              stroke="#3A0609"
              strokeWidth="1.9"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* 怒目：内低外高，绿色发光 */}
            <path d="M12.9 25.6 Q16.6 21.9 21.3 24.5 Q17.6 28.6 12.9 25.6 Z" fill={`url(#${gEye})`} />
            <path d="M35.1 25.6 Q31.4 21.9 26.7 24.5 Q30.4 28.6 35.1 25.6 Z" fill={`url(#${gEye})`} />
            <circle cx="16.3" cy="24.6" r="1.05" fill="#fff" opacity="0.9" />
            <circle cx="18.5" cy="25.6" r="0.6" fill="#fff" opacity="0.7" />
            <circle cx="31.7" cy="24.6" r="1.05" fill="#fff" opacity="0.9" />
            <circle cx="29.5" cy="25.6" r="0.6" fill="#fff" opacity="0.7" />
            {/* 眉压眼 */}
            <path
              d="M12.2 22.6 Q16.6 20.4 21.6 22.4"
              stroke="#5C0A0E"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M35.8 22.6 Q31.4 20.4 26.4 22.4"
              stroke="#5C0A0E"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.75"
            />
          </>
        )}

        {/* 嘴 */}
        {asleep ? (
          <path d="M19.8 32.4 Q24 35.6 28.2 32.4" stroke="#4A0206" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        ) : (
          <>
            {/* 咧嘴 */}
            <path d="M15.4 31.2 Q24 33.4 32.6 31.2 Q31.8 38.6 24 38.6 Q16.2 38.6 15.4 31.2 Z" fill="#3E0206" />
            {/* 上排牙 */}
            <path d="M16.2 31.4 Q24 33.4 31.8 31.4 L31.5 33.3 Q24 35.1 16.5 33.3 Z" fill="#FFFFFF" />
            {/* 牙缝 */}
            <path
              d="M19.8 32.2 L19.7 33.8 M23.3 32.7 L23.3 34.2 M26.8 32.7 L26.9 34.2"
              stroke="#C9C9CF"
              strokeWidth="0.6"
            />
            {/* 一颗小尖牙 */}
            <path d="M16.6 33.1 L17.6 36.1 L18.7 33.3 Z" fill="#FFFFFF" />
            {/* 舌头 */}
            <path d="M20.6 37.2 Q24 40.1 27.4 37.2 Q24 38.8 20.6 37.2 Z" fill="#C9353F" opacity="0.8" />
          </>
        )}
      </svg>
      {asleep && (
        <span className="imp-zz" aria-hidden="true">
          z
        </span>
      )}
    </span>
  )
}
