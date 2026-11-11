import { useEffect, useRef } from 'react'

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FF2D55']

/** 完美一天庆祝：全屏纸屑 */
export default function Confetti({ show }: { show: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show || !ref.current) return
    const box = ref.current
    box.innerHTML = ''
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i')
      p.style.cssText = `position:absolute;top:-14px;left:${Math.random() * 100}%;width:${5 + Math.random() * 5}px;height:${8 + Math.random() * 6}px;background:${COLORS[i % COLORS.length]};border-radius:2px;opacity:0.9;animation:confetti-fall ${1 + Math.random() * 0.9}s cubic-bezier(0.3,0.6,0.5,1) ${Math.random() * 0.35}s forwards;transform:rotate(${Math.random() * 360}deg);`
      box.appendChild(p)
    }
    const timer = window.setTimeout(() => {
      box.innerHTML = ''
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [show])

  if (!show) return null
  return <div className="confetti" ref={ref} aria-hidden="true" />
}
