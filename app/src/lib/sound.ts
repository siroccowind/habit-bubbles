// WebAudio 合成音效：零音频文件

let ctx: AudioContext | null = null
let muted = false

function ac(): AudioContext | null {
  if (muted) return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function setMuted(v: boolean): void {
  muted = v
}

function tone(freq: number, start: number, dur: number, gain = 0.12, type: OscillatorType = 'sine'): void {
  const c = ac()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.02)
}

/** 戳破气泡：「啵」 */
export function playPop(): void {
  const c = ac()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  const t = c.currentTime
  osc.frequency.setValueAtTime(520, t)
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.09)
  g.gain.setValueAtTime(0.18, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.12)
}

/** 掉落：普通一声叮，稀有双音，史诗小旋律 */
export function playDrop(rarity: 'N' | 'R' | 'SSR'): void {
  if (rarity === 'N') {
    tone(880, 0, 0.14, 0.1)
  } else if (rarity === 'R') {
    tone(784, 0, 0.12, 0.1)
    tone(1046, 0.1, 0.18, 0.1)
  } else {
    tone(523, 0, 0.12, 0.1)
    tone(659, 0.09, 0.12, 0.1)
    tone(784, 0.18, 0.12, 0.1)
    tone(1046, 0.27, 0.26, 0.11)
  }
}

/** 当前设备是否支持网页震动（iOS / Safari 不支持 Vibration API，属系统限制） */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/**
 * 轻微震动。必须在**同步的点击处理里**调用（不要 await 之后再调），
 * 否则 Android Chrome 之类的实现可能因「用户激活」过期而忽略。
 */
export function vibrate(ms = 10): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(ms)
  } catch {
    /* 忽略 */
  }
}
