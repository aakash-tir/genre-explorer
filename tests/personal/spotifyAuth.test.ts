/**
 * The PKCE pieces are pinned against RFC 7636's own test vector, and the token
 * exchange against a fake fetch — no network, per the testing convention.
 */
import { describe, expect, it } from 'vitest';

import {
  SPOTIFY_SCOPE,
  SpotifyAuthError,
  base64Url,
  buildAuthorizeUrl,
  codeChallenge,
  exchangeCode,
  generateCodeVerifier,
  isExpired,
  parseCallback,
  refreshTokens,
} from '../../src/personal/spotifyAuth';

describe('PKCE primitives', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(codeChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('base64url output never contains +, / or padding', () => {
    // 0xfb 0xff exercises both substitutions; odd length forces padding.
    expect(base64Url(new Uint8Array([251, 255, 191]))).toBe('-_-_');
    expect(base64Url(new Uint8Array([0]))).toBe('AA');
  });

  it('generates a 43-character verifier from 32 bytes', () => {
    const verifier = generateCodeVerifier((length) => new Uint8Array(length).fill(7));
    expect(verifier).toHaveLength(43);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe('buildAuthorizeUrl', () => {
  it('carries the client id, S256 challenge, state and the minimal scope', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'cid',
        redirectUri: 'https://example.test/app/',
        codeChallenge: 'challenge123',
        state: 'nonce456',
      }),
    );
    expect(url.origin).toBe('https://accounts.spotify.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.test/app/');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe('challenge123');
    expect(url.searchParams.get('state')).toBe('nonce456');
    expect(url.searchParams.get('scope')).toBe(SPOTIFY_SCOPE);
  });
});

describe('parseCallback', () => {
  it('reads a code + state pair', () => {
    expect(parseCallback('?code=abc&state=xyz')).toEqual({
      kind: 'code',
      code: 'abc',
      state: 'xyz',
    });
  });

  it('reads a denial', () => {
    expect(parseCallback('?error=access_denied')).toEqual({
      kind: 'error',
      error: 'access_denied',
    });
  });

  it('treats ordinary app URLs as no callback at all', () => {
    expect(parseCallback('?filter=techno,house&zoom=8')).toEqual({ kind: 'none' });
    expect(parseCallback('')).toEqual({ kind: 'none' });
  });
});

function fakeFetch(status: number, body: unknown): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
}

describe('token exchange', () => {
  it('maps a happy response into a TokenSet with an absolute expiry', async () => {
    const before = Date.now();
    const tokens = await exchangeCode(
      { clientId: 'cid', code: 'c', redirectUri: 'r', codeVerifier: 'v' },
      fakeFetch(200, { access_token: 'at', refresh_token: 'rt', expires_in: 3600 }),
    );
    expect(tokens.accessToken).toBe('at');
    expect(tokens.refreshToken).toBe('rt');
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600_000);
  });

  it('keeps the previous refresh token when a refresh response omits one', async () => {
    const tokens = await refreshTokens(
      { clientId: 'cid', refreshToken: 'old-rt' },
      fakeFetch(200, { access_token: 'at2', expires_in: 3600 }),
    );
    expect(tokens.refreshToken).toBe('old-rt');
  });

  it('flags invalid_grant as needing re-auth', async () => {
    const attempt = refreshTokens(
      { clientId: 'cid', refreshToken: 'revoked' },
      fakeFetch(400, {
        error: 'invalid_grant',
        error_description: 'Refresh token revoked',
      }),
    );
    await expect(attempt).rejects.toThrowError(SpotifyAuthError);
    await attempt.catch((error: unknown) => {
      expect(error).toBeInstanceOf(SpotifyAuthError);
      expect((error as SpotifyAuthError).needsReauth).toBe(true);
    });
  });
});

describe('isExpired', () => {
  it('refreshes inside the 60-second margin, not before', () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', expiresAt: 1_000_000 };
    expect(isExpired(tokens, 1_000_000 - 120_000)).toBe(false);
    expect(isExpired(tokens, 1_000_000 - 30_000)).toBe(true);
  });
});
