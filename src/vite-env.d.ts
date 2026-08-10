/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Spotify app client id for personal mode, baked at build time when the
   * repo variable is set (see docs/runbooks/spotify-personal-mode.md). Not a
   * secret — PKCE apps ship their client id publicly. Absent in local builds;
   * the panel then asks for it once and keeps it in localStorage.
   */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
