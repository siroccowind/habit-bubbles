/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDITION?: 'personal' | 'public'
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_MANIFEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
