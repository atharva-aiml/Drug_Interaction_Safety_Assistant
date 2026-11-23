/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployed API origin (no trailing /api/v1), e.g. https://disa-api-xxxx.a.run.app */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
