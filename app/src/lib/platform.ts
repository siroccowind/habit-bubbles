/** 平台判断（UA 为主，兼顾 iPadOS 的 MacIntel + 触控点） */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/** 手机/平板（有方向传感器的前提）；桌面端默认不支持体感 */
export function isMobileDevice(): boolean {
  return isIOS() || isAndroid()
}
