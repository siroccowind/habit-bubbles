// 习惯气泡 · Service Worker（轻量 runtime cache，零依赖）
// 策略（v6 起）：
//  · 导航请求 **网络优先 + 1 秒 head start**：网络快就拿最新 index.html（固定到桌面的图标会跟着发版更新），
//    网络慢/离线就立刻用缓存渲染，结果在后台刷新缓存。
//  · **门禁兜底**：这个应用部署在带分享码门禁的域名上；从桌面图标启动（start_url="./"）时地址不带分享码，
//    网络会返回「链接不完整」的拦截页。检测到返回的不是应用外壳（没有 #root）时，直接改用缓存的应用页。
//  · 静态资源 cache-first：文件名带 hash，内容变化即换名，不会被旧缓存套住。
//  · 新版本安装后立刻 skipWaiting + claim，并删掉旧版本缓存（坏缓存随之消失）。

const CACHE = 'habit-bubbles-v6'
const SHELL = [
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
]
// 导航时先给网络 1 秒：拿到最新 HTML 就直接用（发版即生效）；
// 超过 1 秒还没回来就先用缓存渲染（不卡白屏），网络结果继续在后台刷新缓存。
const NAV_HEADSTART = 1000

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE)
      // 逐个缓存：任何一个静态资源失败都不能让整个 install 失败（否则 SW 装不上）
      await Promise.all(SHELL.map((u) => c.add(u).catch(() => undefined)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function notifyUpdate() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((c) => c.postMessage({ type: 'hb-update' }))
  } catch {
    /* 忽略 */
  }
}

/** 判断响应是不是真正的应用 HTML（门禁页/错误页没有 #root） */
async function isAppShell(res) {
  try {
    const text = await res.clone().text()
    return /id=["']root["']/.test(text)
  } catch {
    return false
  }
}

/**
 * 导航：网络优先 + 1 秒 head start。
 *  · 网络在 1 秒内回来 → 直接用最新的（顺便刷新缓存，HTML 变了通知页面）；
 *  · 网络返回的是门禁/错误页 → 若有缓存，直接用缓存的应用页（桌面图标启动不丢参数也能进）；
 *  · 超时/离线 → 立刻用缓存渲染，网络结果回头再更新缓存。
 */
async function handleNavigate(req) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match('./index.html')

  const net = fetch(req, { cache: 'no-store' }).then(async (res) => {
    if (!res || !res.ok) throw new Error('bad-status')
    if (cached && !(await isAppShell(res))) return cached
    await cache.put('./index.html', res.clone())
    if (cached) {
      try {
        const [oldText, newText] = await Promise.all([cached.clone().text(), res.clone().text()])
        if (oldText && oldText !== newText) void notifyUpdate()
      } catch {
        /* 比较失败不影响返回 */
      }
    }
    return res
  })

  // 没有缓存：只能等网络（离线时抛出，浏览器显示离线页）
  if (!cached) return net

  const timer = new Promise((resolve) => setTimeout(() => resolve(null), NAV_HEADSTART))
  const winner = await Promise.race([net.catch(() => null), timer])
  if (winner) return winner

  // 超时：先拿缓存顶上，网络回来后由上面的 then 继续刷新缓存
  void net.catch(() => undefined)
  return cached
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigate(req))
    return
  }

  // 静态资源：cache-first，未命中则网络并存入
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
    }),
  )
})
