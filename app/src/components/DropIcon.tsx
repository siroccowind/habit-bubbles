// 掉落物图标：纯 SVG 绘制，剪影模式（未收集）用灰色

export function DropIcon({ id, size = 20, silent }: { id: string; size?: number; silent?: boolean }) {
  const c = silent ? '#C7C7CC' : undefined
  const common = { width: size, height: size, viewBox: '-10 -10 20 20', fill: 'none' as const }

  switch (id) {
    case 'star':
      return (
        <svg {...common}>
          <path d="M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8 Z" fill={c ?? '#FFCC00'} />
        </svg>
      )
    case 'candy':
      return (
        <svg {...common}>
          <circle r="4.5" fill={c ?? '#FF2D55'} />
          <path d="M-4 -3 L-9 -7 L-1 -6 Z" fill={c ?? '#FF2D55'} />
          <path d="M4 -3 L9 -7 L1 -6 Z" fill={c ?? '#FF2D55'} />
        </svg>
      )
    case 'sakura':
      return (
        <svg {...common}>
          <g fill={c ?? '#FFB7C5'}>
            <circle cx="0" cy="-4.5" r="3" />
            <circle cx="4.2" cy="-1.4" r="3" />
            <circle cx="2.6" cy="4" r="3" />
            <circle cx="-2.6" cy="4" r="3" />
            <circle cx="-4.2" cy="-1.4" r="3" />
          </g>
          <circle r="1.6" fill={c ?? '#FFCC00'} />
        </svg>
      )
    case 'bubble':
      return (
        <svg {...common}>
          <circle r="6.5" fill={c ?? '#64D2FF'} opacity={silent ? 0.5 : 0.75} />
          <circle cx="-2" cy="-2.4" r="1.8" fill="#FFFFFF" opacity="0.9" />
        </svg>
      )
    case 'mochi':
      return (
        <svg {...common}>
          <ellipse rx="6.5" ry="5" fill={c ?? '#FFFFFF'} stroke={c ?? '#D1D1D6'} strokeWidth="0.8" />
          <path d="M-6.5 -1 Q-3 -3.5 0 -1 Q3 -3.5 6.5 -1" stroke={c ?? '#8E8E93'} strokeWidth="0.9" fill="none" />
        </svg>
      )
    case 'clover':
      return (
        <svg {...common}>
          <g fill={c ?? '#34C759'}>
            <circle cx="0" cy="-4" r="3" />
            <circle cx="3.5" cy="2" r="3" />
            <circle cx="-3.5" cy="2" r="3" />
          </g>
          <path d="M0 3 Q1.5 7 0 9" stroke={c ?? '#248A3D'} strokeWidth="1" fill="none" />
        </svg>
      )
    case 'plane':
      return (
        <svg {...common}>
          <path d="M-8 -2 L8 -6 L3 0 L8 6 L-8 2 L-4 0 Z" fill={c ?? '#85B7EB'} stroke={c ?? '#378ADD'} strokeWidth="0.6" />
        </svg>
      )
    case 'cake':
      return (
        <svg {...common}>
          <path d="M-6 5 L-6 -1 Q-6 -4 -3 -4 L3 -4 Q6 -4 6 -1 L6 5 Z" fill={c ?? '#FFB7C5'} />
          <path d="M-6 1 Q0 4 6 1 L6 5 L-6 5 Z" fill={c ?? '#FF8FA8'} />
          <path d="M0 -4 L0 -8" stroke={c ?? '#8E8E93'} strokeWidth="1" />
          <circle cy="-8.5" r="1.2" fill={c ?? '#FFCC00'} />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path d="M2 -6 A7 7 0 1 0 2 6 A5.5 5.5 0 1 1 2 -6 Z" fill={c ?? '#FFD60A'} />
        </svg>
      )
    case 'pinwheel':
      return (
        <svg {...common}>
          <g fill={c ?? '#AF52DE'}>
            <path d="M0 0 L0 -8 Q4 -8 3 -3 Q1 0 0 0 Z" />
            <path d="M0 0 L8 0 Q8 4 3 3 Q0 1 0 0 Z" opacity="0.85" />
            <path d="M0 0 L0 8 Q-4 8 -3 3 Q-1 0 0 0 Z" opacity="0.7" />
            <path d="M0 0 L-8 0 Q-8 -4 -3 -3 Q0 -1 0 0 Z" opacity="0.85" />
          </g>
          <circle r="1.2" fill={c ?? '#FFCC00'} />
        </svg>
      )
    case 'fish':
      return (
        <svg {...common}>
          <ellipse rx="5" ry="3.2" fill={c ?? '#FF9F0A'} />
          <path d="M4 0 L8.5 -3.5 L8.5 3.5 Z" fill={c ?? '#FF9F0A'} />
          <circle cx="-2" cy="-0.6" r="0.9" fill="#FFFFFF" />
        </svg>
      )
    case 'rainbow':
      return (
        <svg {...common}>
          <g fill="none" strokeWidth="2" strokeLinecap="round">
            <path d="M-7 3 A7 7 0 0 1 7 3" stroke={c ?? '#FF3B30'} />
            <path d="M-4.5 3 A4.5 4.5 0 0 1 4.5 3" stroke={c ?? '#FF9500'} />
            <path d="M-2 3 A2 2 0 0 1 2 3" stroke={c ?? '#FFCC00'} />
          </g>
        </svg>
      )
    case 'meteor':
      return (
        <svg {...common}>
          <path d="M2 -7 L5 -4 L8 -1" stroke={c ?? '#FFD60A'} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="1" cy="4" r="3.4" fill={c ?? '#FFCC60'} />
          <circle cx="-1" cy="2" r="1.4" fill={c ?? '#FF9F0A'} />
        </svg>
      )
    case 'crown':
      return (
        <svg {...common}>
          <path d="M-7 5 L-7 -3 L-3.5 1 L0 -5 L3.5 1 L7 -3 L7 5 Z" fill={c ?? '#FFD60A'} />
          <circle cx="-7" cy="-4" r="1.3" fill={c ?? '#FF3B30'} />
          <circle cx="7" cy="-4" r="1.3" fill={c ?? '#FF3B30'} />
          <circle cx="0" cy="-6.2" r="1.3" fill={c ?? '#007AFF'} />
        </svg>
      )
    case 'balloon':
      return (
        <svg {...common}>
          <ellipse cy="-1" rx="5.5" ry="6.5" fill={c ?? '#FF9500'} />
          <path d="M0 5.5 L1.5 2 L-1.5 2 Z" fill={c ?? '#FF9500'} />
          <path d="M0 5.5 Q2 8 0 9.5" stroke={c ?? '#8E8E93'} strokeWidth="0.8" fill="none" />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M0 8 Q-7 2 -4 -5 Q0 -8 4 -5 Q7 2 0 8 Z" fill={c ?? '#34C759'} />
          <path d="M0 8 L0 -4" stroke={c ?? '#248A3D'} strokeWidth="0.9" />
        </svg>
      )
    case 'cactus':
      return (
        <svg {...common}>
          <rect x="-2.5" y="-7" width="5" height="14" rx="2.5" fill={c ?? '#34C759'} />
          <path d="M-2.5 -1 Q-6 -1 -6 -4 Q-6 -6 -4 -6 L-4 -4 Q-4 -3 -2.5 -3 Z" fill={c ?? '#34C759'} />
          <path d="M2.5 1 Q6 1 6 -2 Q6 -4 4 -4 L4 -2 Q4 -1 2.5 -1 Z" fill={c ?? '#34C759'} />
        </svg>
      )
    case 'key':
      return (
        <svg {...common}>
          <circle cx="-3" cy="0" r="4" fill="none" stroke={c ?? '#FFD60A'} strokeWidth="2.4" />
          <path d="M0 0 L8 0 M6 0 L6 3 M8 0 L8 3" stroke={c ?? '#FFD60A'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'umbrella':
      return (
        <svg {...common}>
          <path d="M-8 0 Q0 -9 8 0 Z" fill={c ?? '#FF3B30'} />
          <path d="M-8 0 Q-4 3 0 0 Q4 3 8 0" fill={c ?? '#FF3B30'} />
          <path d="M0 0 L0 7 Q0 9 -2 9" stroke={c ?? '#8E8E93'} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </svg>
      )

    // ---- 玩具（t-*，不进收藏室） ----
    case 't-banana':
      return (
        <svg {...common}>
          <path d="M-6 -4 Q0 8 6 -4 Q3 0 0 0 Q-3 0 -6 -4 Z" fill={c ?? '#FFD60A'} />
          <circle cx="-6.2" cy="-4.8" r="1.2" fill={c ?? '#8B6914'} />
        </svg>
      )
    case 't-cherry':
      return (
        <svg {...common}>
          <path d="M-3 -4 Q0 -8 3 -4" stroke={c ?? '#34C759'} strokeWidth="1" fill="none" />
          <circle cx="-3.2" cy="2" r="3" fill={c ?? '#FF2D55'} />
          <circle cx="3.2" cy="2" r="3" fill={c ?? '#FF2D55'} />
        </svg>
      )
    case 't-donut':
      return (
        <svg {...common}>
          <circle r="6.5" fill={c ?? '#FFB7C5'} />
          <circle r="2.4" fill="#FFFFFF" />
          <path d="M-6 -3 L-4 -2 M-2 -5 L-1 -4 M2 -5 L3 -4 M6 -3 L4 -2 M-5 3 L-3 2 M5 3 L3 2" stroke={c ?? '#007AFF'} strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      )
    case 't-egg':
      return (
        <svg {...common}>
          <ellipse cy="1" rx="6" ry="4.6" fill={c ?? '#FFFFFF'} stroke={c ?? '#D1D1D6'} strokeWidth="0.8" />
          <circle cy="-0.5" r="2.2" fill={c ?? '#FFD60A'} />
        </svg>
      )
    case 't-icecream':
      return (
        <svg {...common}>
          <path d="M-4 -1 L4 -1 L0 8 Z" fill={c ?? '#C98A5B'} />
          <circle cy="-3.5" r="3.6" fill={c ?? '#FFB7C5'} />
          <circle cx="-2.4" cy="-6.5" r="2.6" fill={c ?? '#FFF5F7'} />
        </svg>
      )
    case 't-lollipop':
      return (
        <svg {...common}>
          <path d="M2 2 L5 8" stroke={c ?? '#D1D1D6'} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="-1.5" cy="-2.5" r="5" fill={c ?? '#AF52DE'} />
          <path d="M-1.5 -2.5 m-5 0 a5 5 0 1 1 10 0" stroke={c ?? '#FFCC00'} strokeWidth="1.2" fill="none" strokeDasharray="2 2" />
        </svg>
      )
    case 't-ball':
      return (
        <svg {...common}>
          <circle r="6" fill={c ?? '#FF3B30'} />
          <path d="M0 -6 L0 6 M-6 0 L6 0" stroke="#FFFFFF" strokeWidth="1.2" />
          <circle r="6" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
        </svg>
      )
    case 't-duck':
      return (
        <svg {...common}>
          <ellipse cy="1.5" rx="5" ry="4" fill={c ?? '#FFD60A'} />
          <circle cx="1.5" cy="-3.5" r="2.6" fill={c ?? '#FFD60A'} />
          <path d="M3.5 -3.5 L6 -2.8 L3.5 -2.2 Z" fill={c ?? '#FF9500'} />
          <circle cx="2" cy="-4" r="0.7" fill="#1D1D1F" />
        </svg>
      )
    case 't-cat':
      return (
        <svg {...common}>
          <path d="M-5 -3 L-6 -7 L-2 -5 Z M5 -3 L6 -7 L2 -5 Z" fill={c ?? '#FF9F0A'} />
          <circle r="5" fill={c ?? '#FF9F0A'} />
          <circle cx="-1.8" cy="-0.8" r="0.8" fill="#1D1D1F" />
          <circle cx="1.8" cy="-0.8" r="0.8" fill="#1D1D1F" />
          <path d="M-1.2 1.8 Q0 3 1.2 1.8" stroke="#1D1D1F" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 't-frog':
      return (
        <svg {...common}>
          <ellipse cy="1" rx="5.5" ry="4.5" fill={c ?? '#34C759'} />
          <circle cx="-2.6" cy="-3" r="2.2" fill={c ?? '#34C759'} />
          <circle cx="2.6" cy="-3" r="2.2" fill={c ?? '#34C759'} />
          <circle cx="-2.6" cy="-3" r="1" fill="#1D1D1F" />
          <circle cx="2.6" cy="-3" r="1" fill="#1D1D1F" />
          <path d="M-2.5 1.5 Q0 3.5 2.5 1.5" stroke="#248A3D" strokeWidth="0.9" fill="none" />
        </svg>
      )
    case 't-rocket':
      return (
        <svg {...common}>
          <path d="M0 -8 Q3.5 -3 3.5 3 L-3.5 3 Q-3.5 -3 0 -8 Z" fill={c ?? '#FF3B30'} />
          <circle cy="-1" r="1.6" fill="#FFFFFF" />
          <path d="M-3.5 3 L-6 7 L-3.5 5.5 Z M3.5 3 L6 7 L3.5 5.5 Z" fill={c ?? '#007AFF'} />
          <path d="M-2 5 Q0 8 2 5" fill={c ?? '#FFD60A'} />
        </svg>
      )
    case 't-cloud':
      return (
        <svg {...common}>
          <g fill={c ?? '#64D2FF'} opacity="0.9">
            <circle cx="-3" cy="0" r="3.6" />
            <circle cx="1" cy="-1.5" r="4.2" />
            <circle cx="4.5" cy="0.5" r="3" />
            <rect x="-6.5" y="0" width="13" height="3.5" rx="1.75" />
          </g>
        </svg>
      )
    case 't-umbrella':
      return (
        <svg {...common}>
          <path d="M-8 0 Q0 -9 8 0 Z" fill={c ?? '#FF9500'} />
          <path d="M0 0 L0 7 Q0 9 -2 9" stroke={c ?? '#8E8E93'} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 't-mushroom':
      return (
        <svg {...common}>
          <path d="M-7 -1 Q0 -10 7 -1 Z" fill={c ?? '#FF3B30'} />
          <circle cx="-3" cy="-3.5" r="1.2" fill="#FFFFFF" />
          <circle cx="2.5" cy="-4.5" r="1" fill="#FFFFFF" />
          <path d="M-2.5 -1 L-2 7 L2 7 L2.5 -1 Z" fill={c ?? '#FFF5E8'} />
        </svg>
      )
    case 't-gift':
      return (
        <svg {...common}>
          <rect x="-6" y="-2" width="12" height="9" rx="1.2" fill={c ?? '#FF2D55'} />
          <rect x="-6.8" y="-4.5" width="13.6" height="3" rx="1.2" fill={c ?? '#FF2D55'} />
          <rect x="-1.2" y="-4.5" width="2.4" height="11.5" fill={c ?? '#FFD60A'} />
          <path d="M0 -4.5 Q-4 -8 -2 -5.5 Q0 -5 0 -4.5 Z M0 -4.5 Q4 -8 2 -5.5 Q0 -5 0 -4.5 Z" fill={c ?? '#FFD60A'} />
        </svg>
      )
    case 't-bell':
      return (
        <svg {...common}>
          <path d="M-5 4 Q-5 -6 0 -6 Q5 -6 5 4 Z" fill={c ?? '#FFD60A'} />
          <rect x="-6" y="4" width="12" height="2" rx="1" fill={c ?? '#FFD60A'} />
          <circle cy="7" r="1.6" fill={c ?? '#FFD60A'} />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle r="6" fill={c ?? '#C7C7CC'} />
        </svg>
      )
  }
}
