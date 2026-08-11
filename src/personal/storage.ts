/**
 * Persistence for the personal lens: `localStorage`, nothing else.
 *
 * There are no accounts and no server — "who you are" is "this browser". The
 * stored artist list (not the derived weights) is the source of truth, so
 * matching can re-run against a fresher artist index without re-asking the
 * source. Two sources exist, as a discriminated union:
 *
 *   - `listenbrainz` — the public path: just a username.
 *   - `spotify`      — personal mode: OAuth tokens for the owner's dev-mode app.
 *
 * All reads are guarded: a corrupt, foreign, or previous-schema value degrades
 * to "not connected", never to a crash. Session-scoped PKCE state (verifier +
 * nonce) lives in `sessionStorage` — it only survives the redirect round-trip.
 */
import { z } from 'zod';

const STORAGE_KEY = 'genre-explorer:personal:v2';
const PENDING_KEY = 'genre-explorer:personal:pkce';

const StoredTokens = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number(),
});

const StoredArtist = z.object({
  mbid: z.string().min(1).optional(),
  spotifyId: z.string().min(1).optional(),
  name: z.string().min(1),
  rank: z.number().int().nonnegative(),
});
export type StoredArtist = z.infer<typeof StoredArtist>;

const Shared = {
  topArtists: z.array(StoredArtist).nullable(),
  /** ISO datetime of the last successful fetch from the source. */
  fetchedAt: z.string().nullable(),
  lensOn: z.boolean(),
};

const SpotifyState = z.object({
  source: z.literal('spotify'),
  clientId: z.string().min(1),
  tokens: StoredTokens.nullable(),
  ...Shared,
});

const ListenBrainzState = z.object({
  source: z.literal('listenbrainz'),
  username: z.string().min(1),
  ...Shared,
});

const PersonalState = z.discriminatedUnion('source', [SpotifyState, ListenBrainzState]);
export type PersonalState = z.infer<typeof PersonalState>;
export type SpotifyPersonalState = z.infer<typeof SpotifyState>;
export type ListenBrainzPersonalState = z.infer<typeof ListenBrainzState>;

export function loadPersonalState(storage: Storage = localStorage): PersonalState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = PersonalState.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function savePersonalState(
  state: PersonalState,
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota: the lens still works for the session, it just won't persist.
  }
}

export function clearPersonalState(storage: Storage = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; there is nothing worse to fall back to.
  }
}

export function initialSpotifyState(clientId: string): SpotifyPersonalState {
  return {
    source: 'spotify',
    clientId,
    tokens: null,
    topArtists: null,
    fetchedAt: null,
    lensOn: true,
  };
}

export function initialListenBrainzState(username: string): ListenBrainzPersonalState {
  return {
    source: 'listenbrainz',
    username,
    topArtists: null,
    fetchedAt: null,
    lensOn: true,
  };
}

const PendingAuth = z.object({
  clientId: z.string().min(1),
  codeVerifier: z.string().min(1),
  state: z.string().min(1),
});
export type PendingAuth = z.infer<typeof PendingAuth>;

export function savePendingAuth(
  pending: PendingAuth,
  storage: Storage = sessionStorage,
): void {
  try {
    storage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // If sessionStorage is unavailable the redirect back will simply not complete.
  }
}

/** One-shot: reading consumes it, so a replayed callback URL cannot re-exchange. */
export function takePendingAuth(storage: Storage = sessionStorage): PendingAuth | null {
  try {
    const raw = storage.getItem(PENDING_KEY);
    storage.removeItem(PENDING_KEY);
    if (raw === null) return null;
    const parsed = PendingAuth.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
