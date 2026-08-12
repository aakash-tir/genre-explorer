/**
 * Persistence for the personal lens: `localStorage`, nothing else.
 *
 * There are no accounts and no server — "who you are" is "this browser". The
 * stored artist list (not the derived weights) is the source of truth, so
 * matching can re-run against a fresher artist index without re-asking the
 * source. One source exists today — `listenbrainz`, a public username — kept
 * as a tagged object so a future intake path (e.g. a listens-export upload)
 * slots in as another `source` value without a storage migration.
 *
 * All reads are guarded: a corrupt, foreign, or previous-schema value degrades
 * to "not connected", never to a crash. (Values written by the removed Spotify
 * owner mode fail the parse and degrade the same way.)
 */
import { z } from 'zod';

const STORAGE_KEY = 'genre-explorer:personal:v2';

const StoredArtist = z.object({
  mbid: z.string().min(1).optional(),
  spotifyId: z.string().min(1).optional(),
  name: z.string().min(1),
  rank: z.number().int().nonnegative(),
});
export type StoredArtist = z.infer<typeof StoredArtist>;

const ListenBrainzState = z.object({
  source: z.literal('listenbrainz'),
  username: z.string().min(1),
  topArtists: z.array(StoredArtist).nullable(),
  /** ISO datetime of the last successful fetch from the source. */
  fetchedAt: z.string().nullable(),
  lensOn: z.boolean(),
});

const PersonalState = z.discriminatedUnion('source', [ListenBrainzState]);
export type PersonalState = z.infer<typeof PersonalState>;
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

export function initialListenBrainzState(username: string): ListenBrainzPersonalState {
  return {
    source: 'listenbrainz',
    username,
    topArtists: null,
    fetchedAt: null,
    lensOn: true,
  };
}
