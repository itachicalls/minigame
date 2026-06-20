/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SKIP_TOKEN_GATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
