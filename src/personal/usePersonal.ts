/**
 * The personal lens's stateful spine: connect → OAuth round-trip → top artists →
 * weights + suggestions, persisted in localStorage.
 *
 * The pure work all lives elsewhere (match.ts, suggest.ts, spotifyAuth.ts) per
 * the testing convention; this hook only sequences it. The OAuth callback params
 * are captured at module load, BEFORE React mounts — App rewrites the URL from
 * app state on its first effect, which would otherwise eat `?code=` in a race.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ArtistIndex, GraphDataset } from '../types';
import { loadArtistIndex } from '../lib/dataset';
import { matchGenres, type GenreWeight } from './match';
import { suggestGenres, type Suggestion } from './suggest';
import {
  SpotifyAuthError,
  buildAuthorizeUrl,
  codeChallenge,
  exchangeCode,
  generateCodeVerifier,
  isExpired,
  parseCallback,
  refreshTokens,
  type TokenSet,
} from './spotifyAuth';
import { fetchTopArtists, type TopArtist } from './spotifyClient';
import {
  clearPersonalState,
  initialPersonalState,
  loadPersonalState,
  savePendingAuth,
  savePersonalState,
  takePendingAuth,
  type PersonalState,
} from './storage';

/** Captured before React renders anything — see the module doc. */
const INITIAL_CALLBACK = parseCallback(
  typeof window === 'undefined' ? '' : window.location.search,
);

/** Optionally baked at build time (repo variable → deploy workflow). */
const BUILT_IN_CLIENT_ID: string | undefined = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

export type PersonalStatus = 'idle' | 'authorizing' | 'loading' | 'ready' | 'error';

export interface Personal {
  status: PersonalStatus;
  error: string | null;
  /** True once tokens exist, even while a fetch is in flight. */
  connected: boolean;
  clientId: string;
  weights: GenreWeight[];
  suggestions: Suggestion[];
  lensOn: boolean;
  fetchedAt: string | null;
  connect: (clientId: string) => Promise<void>;
  refresh: () => void;
  disconnect: () => void;
  setLensOn: (on: boolean) => void;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function usePersonal(dataset: GraphDataset | null): Personal {
  const [state, setState] = useState<PersonalState | null>(() => loadPersonalState());
  // A declined authorization is known before React renders — start there rather
  // than setting state from an effect.
  const [status, setStatus] = useState<PersonalStatus>(() =>
    INITIAL_CALLBACK.kind === 'error' ? 'error' : 'idle',
  );
  const [error, setError] = useState<string | null>(() =>
    INITIAL_CALLBACK.kind === 'error'
      ? `Spotify authorization was declined (${INITIAL_CALLBACK.error}).`
      : null,
  );
  const [index, setIndex] = useState<ArtistIndex | null>(null);
  // StrictMode double-runs effects in dev; the exchange consumes a one-shot code.
  const exchangedRef = useRef(false);

  const persist = useCallback((next: PersonalState | null) => {
    setState(next);
    if (next === null) clearPersonalState();
    else savePersonalState(next);
  }, []);

  /** Redirect URI = exactly where this app lives; must be listed in the dashboard. */
  const redirectUri = useCallback(
    () => `${window.location.origin}${import.meta.env.BASE_URL}`,
    [],
  );

  const loadProfile = useCallback(
    async (tokens: TokenSet, base: PersonalState) => {
      setStatus('loading');
      setError(null);
      try {
        let fresh = tokens;
        if (isExpired(fresh)) {
          fresh = await refreshTokens({
            clientId: base.clientId,
            refreshToken: fresh.refreshToken,
          });
        }
        const topArtists = await fetchTopArtists(fresh.accessToken);
        persist({
          ...base,
          tokens: fresh,
          topArtists,
          fetchedAt: new Date().toISOString(),
        });
        setStatus('ready');
      } catch (cause) {
        if (cause instanceof SpotifyAuthError && cause.needsReauth) {
          // The grant is gone; keep the client id so reconnecting is one click.
          persist({ ...base, tokens: null });
        }
        setError(describeError(cause));
        setStatus('error');
      }
    },
    [persist],
  );

  // Complete the OAuth round-trip if this page load IS the redirect back. All
  // state updates happen inside the async continuation, never synchronously.
  useEffect(() => {
    if (INITIAL_CALLBACK.kind !== 'code' || exchangedRef.current) return;
    exchangedRef.current = true;

    // Strip code/state from the address bar — a bookmarked callback URL must
    // not retrigger this, and App's URL sync will canonicalise anyway.
    window.history.replaceState(null, '', window.location.pathname);

    void (async () => {
      const pending = takePendingAuth();
      if (pending === null || pending.state !== INITIAL_CALLBACK.state) {
        setError('Sign-in state mismatch — please connect again.');
        setStatus('error');
        return;
      }
      const base = loadPersonalState() ?? initialPersonalState(pending.clientId);
      try {
        setStatus('authorizing');
        const tokens = await exchangeCode({
          clientId: pending.clientId,
          code: INITIAL_CALLBACK.code,
          redirectUri: redirectUri(),
          codeVerifier: pending.codeVerifier,
        });
        await loadProfile(tokens, { ...base, clientId: pending.clientId, tokens });
      } catch (cause) {
        setError(describeError(cause));
        setStatus('error');
      }
    })();
  }, [loadProfile, redirectUri]);

  // The reverse index loads lazily, once, and only when there is a profile to match.
  useEffect(() => {
    if (!state?.topArtists || index !== null) return;
    let cancelled = false;
    loadArtistIndex()
      .then((loaded) => {
        if (!cancelled) setIndex(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describeError(cause));
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state, index]);

  const connect = useCallback(
    async (clientId: string) => {
      const trimmed = clientId.trim();
      if (trimmed === '') return;
      const codeVerifier = generateCodeVerifier();
      const nonce = generateCodeVerifier();
      savePendingAuth({ clientId: trimmed, codeVerifier, state: nonce });
      persist({ ...(state ?? initialPersonalState(trimmed)), clientId: trimmed });
      window.location.assign(
        buildAuthorizeUrl({
          clientId: trimmed,
          redirectUri: redirectUri(),
          codeChallenge: await codeChallenge(codeVerifier),
          state: nonce,
        }),
      );
    },
    [persist, redirectUri, state],
  );

  const refresh = useCallback(() => {
    if (state?.tokens) void loadProfile(state.tokens, state);
  }, [state, loadProfile]);

  const disconnect = useCallback(() => {
    persist(null);
    setIndex(null);
    setStatus('idle');
    setError(null);
  }, [persist]);

  const setLensOn = useCallback(
    (on: boolean) => {
      if (state !== null) persist({ ...state, lensOn: on });
    },
    [state, persist],
  );

  const weights = useMemo(
    () => (state?.topArtists && index ? matchGenres(state.topArtists, index) : []),
    [state, index],
  );

  const suggestions = useMemo(
    () => (dataset && weights.length > 0 ? suggestGenres(weights, dataset.edges) : []),
    [dataset, weights],
  );

  // A stored profile is ready with no network involved — derived, not set.
  const effectiveStatus: PersonalStatus =
    status === 'idle' && state?.topArtists ? 'ready' : status;

  return {
    status: effectiveStatus,
    error,
    connected:
      state?.tokens != null || (state?.topArtists != null && state.topArtists.length > 0),
    clientId: state?.clientId ?? BUILT_IN_CLIENT_ID ?? '',
    weights,
    suggestions,
    lensOn: state?.lensOn ?? false,
    fetchedAt: state?.fetchedAt ?? null,
    connect,
    refresh,
    disconnect,
    setLensOn,
  };
}

export type { GenreWeight, Suggestion, TopArtist };
