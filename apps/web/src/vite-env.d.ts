/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_API_MODE?: "mock" | "real";
  readonly VITE_SANDBOX_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
