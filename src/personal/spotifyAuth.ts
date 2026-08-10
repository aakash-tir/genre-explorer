/**
 * Spotify OAuth 2.0 Authorization Code with PKCE, entirely client-side.
 *
 * PERSONAL MODE ONLY. A 2026-registered Spotify app lives in development mode:
 * one client id, at most five manually-allowlisted users, owner must hold Premium
 * (see `docs/research/listening-history-personalization.md` §2 and the runbook
 * `docs/runbooks/spotify-personal-mode.md`). PKCE needs no client secret, which is
 * the only reason this can exist on a static site.
 *
 * Together with `spotifyClient.ts` this is the app's ONE sanctioned runtime
 * network exception beyond its own static JSON — user-initiated, and the map
 * never depends on it. See the network rule in `.claude/CLAUDE.md`.
 *
 * Pure pieces (URL building, callback parsing, base64url) are exported for tests;
 * the network calls take a `fetchImpl` like `src/lib/dataset.ts` does.
 */

export const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
/** Top artists is all we read. Ask for nothing more. */
export const SPOTIFY_SCOPE = 'user-top-read';

export class SpotifyAuthError extends Error {
  constructor(
    message: string,
    /** True when re-running the OAuth flow is the fix (expired/revoked grant). */
    readonly needsReauth = false,
  ) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 random bytes → 43-char verifier, the RFC 7636 minimum length. */
export function generateCodeVerifier(
  randomBytes: (length: number) => Uint8Array = (length) =>
    crypto.getRandomValues(new Uint8Array(length)),
): string {
  return base64Url(randomBytes(32));
}

/** S256 code challenge: base64url(sha256(ascii(verifier))). */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  /** Anti-CSRF nonce, verified against the callback. */
  state: string;
}

export function buildAuthorizeUrl(params: AuthorizeParams): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
    state: params.state,
    scope: SPOTIFY_SCOPE,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${query.toString()}`;
}

export type CallbackResult =
  | { kind: 'code'; code: string; state: string }
  | { kind: 'error'; error: string }
  | { kind: 'none' };

/** Read Spotify's redirect-back query. Pure; never throws on garbage. */
export function parseCallback(search: string): CallbackResult {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const error = params.get('error');
  if (error !== null) return { kind: 'error', error };
  const code = params.get('code');
  const state = params.get('state');
  if (code !== null && state !== null) return { kind: 'code', code, state };
  return { kind: 'none' };
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. Refresh when within a minute of this. */
  expiresAt: number;
}

interface TokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  error_description?: unknown;
  error?: unknown;
}

async function requestTokens(
  body: URLSearchParams,
  previousRefreshToken: string | null,
  fetchImpl: typeof fetch,
): Promise<TokenSet> {
  let response: Response;
  try {
    response = await fetchImpl(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (cause) {
    throw new SpotifyAuthError(
      `Could not reach Spotify: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const raw = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok) {
    const detail =
      typeof raw.error_description === 'string'
        ? raw.error_description
        : typeof raw.error === 'string'
          ? raw.error
          : `HTTP ${response.status}`;
    // invalid_grant = the code or refresh token is spent/revoked: only a fresh
    // authorize redirect can recover.
    throw new SpotifyAuthError(
      `Spotify token request failed: ${detail}`,
      response.status === 400,
    );
  }
  if (typeof raw.access_token !== 'string' || typeof raw.expires_in !== 'number') {
    throw new SpotifyAuthError('Spotify token response was malformed');
  }
  return {
    accessToken: raw.access_token,
    // Spotify may omit refresh_token on refresh; the previous one stays valid.
    refreshToken:
      typeof raw.refresh_token === 'string'
        ? raw.refresh_token
        : (previousRefreshToken ?? ''),
    expiresAt: Date.now() + raw.expires_in * 1000,
  };
}

export function exchangeCode(
  params: { clientId: string; code: string; redirectUri: string; codeVerifier: string },
  fetchImpl: typeof fetch = fetch,
): Promise<TokenSet> {
  return requestTokens(
    new URLSearchParams({
      client_id: params.clientId,
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
    null,
    fetchImpl,
  );
}

export function refreshTokens(
  params: { clientId: string; refreshToken: string },
  fetchImpl: typeof fetch = fetch,
): Promise<TokenSet> {
  return requestTokens(
    new URLSearchParams({
      client_id: params.clientId,
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    }),
    params.refreshToken,
    fetchImpl,
  );
}

/** True when the token set needs a refresh before use (60s safety margin). */
export function isExpired(tokens: TokenSet, now: number = Date.now()): boolean {
  return now >= tokens.expiresAt - 60_000;
}
