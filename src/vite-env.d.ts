/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_CODE_HASH?: string;
  readonly VITE_SEASON_YEAR?: string;
  readonly VITE_DEMO_DATE?: string;
  readonly VITE_TITLE?: string;
  readonly VITE_ENC_TOKEN?: string;
  readonly VITE_DATA_REPO?: string;
  readonly VITE_DATA_BRANCH?: string;
  readonly VITE_DEMO?: string;
  readonly VITE_THEME?: string;
}
