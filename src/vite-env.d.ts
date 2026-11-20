/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Solo para pruebas: servicio de reportes simulado. */
  readonly VITE_URL_REPORTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
