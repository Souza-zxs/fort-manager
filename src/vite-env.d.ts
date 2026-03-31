/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ML_CLIENT_ID?: string;
  readonly VITE_ML_CLIENT_SECRET?: string;
  readonly VITE_ML_REDIRECT_URI?: string;
  readonly VITE_ML_AUTH_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
