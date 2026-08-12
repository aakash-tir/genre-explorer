/**
 * The personal lens's stateful spine: connect (ListenBrainz username) →
 * top artists → weights + suggestions, persisted in localStorage.
 *
 * The pure work all lives elsewhere (match.ts, suggest.ts, listenbrainz.ts)
 * per the testing convention; this hook only sequences it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ArtistIndex, GraphDataset } from '../types';
import { loadArtistIndex } from '../lib/dataset';
import { fetchListenBrainzTopArtists } from './listenbrainz';
import { matchGenres, type GenreWeight } from './match';
import { suggestGenres, type Suggestion } from './suggest';
import {
  clearPersonalState,
  initialListenBrainzState,
  loadPersonalState,
  savePersonalState,
  type PersonalState,
} from './storage';

export type PersonalStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Personal {
  status: PersonalStatus;
  error: string | null;
  /** True once a source is wired up, even while a fetch is in flight. */
  connected: boolean;
  source: PersonalState['source'] | null;
  /** ListenBrainz username, when that is the source. */
  username: string | null;
  weights: GenreWeight[];
  suggestions: Suggestion[];
  lensOn: boolean;
  fetchedAt: string | null;
  /** Public path: fetch a ListenBrainz user's top artists. */
  connectListenBrainz: (username: string) => Promise<void>;
  refresh: () => void;
  disconnect: () => void;
  setLensOn: (on: boolean) => void;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function usePersonal(dataset: GraphDataset | null): Personal {
  const [state, setState] = useState<PersonalState | null>(() => loadPersonalState());
  const [status, setStatus] = useState<PersonalStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<ArtistIndex | null>(null);

  const persist = useCallback((next: PersonalState | null) => {
    setState(next);
    if (next === null) clearPersonalState();
    else savePersonalState(next);
  }, []);

  const loadListenBrainzProfile = useCallback(
    async (username: string) => {
      setStatus('loading');
      setError(null);
      try {
        const topArtists = await fetchListenBrainzTopArtists(username);
        persist({
          ...initialListenBrainzState(username),
          topArtists,
          fetchedAt: new Date().toISOString(),
        });
        setStatus('ready');
      } catch (cause) {
        setError(describeError(cause));
        setStatus('error');
      }
    },
    [persist],
  );

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

  const connectListenBrainz = useCallback(
    async (username: string) => {
      const trimmed = username.trim();
      if (trimmed === '') return;
      await loadListenBrainzProfile(trimmed);
    },
    [loadListenBrainzProfile],
  );

  const refresh = useCallback(() => {
    if (state?.source === 'listenbrainz') {
      void loadListenBrainzProfile(state.username);
    }
  }, [state, loadListenBrainzProfile]);

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
    connected: state?.topArtists != null && state.topArtists.length > 0,
    source: state?.source ?? null,
    username: state?.source === 'listenbrainz' ? state.username : null,
    weights,
    suggestions,
    lensOn: state?.lensOn ?? false,
    fetchedAt: state?.fetchedAt ?? null,
    connectListenBrainz,
    refresh,
    disconnect,
    setLensOn,
  };
}

export type { GenreWeight, Suggestion };
