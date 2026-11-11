import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** 生产构建注入最小权限 CSP；开发模式不注入，避免影响 HMR / React Refresh。 */
function cspPlugin() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'hb-csp',
    transformIndexHtml(html: string, ctx: { server?: unknown }) {
      if (ctx.server) return html
      return html.replace('</head>', `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`)
    },
  }
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: './',
  build: { outDir: 'dist' },
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: Number((globalThis as any).process?.env?.PORT) || 3000,
  },
})
