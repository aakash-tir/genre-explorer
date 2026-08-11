/**
 * "Your music" — the personal lens's panel, below the filter in the left aside.
 *
 * Two ways in, honestly presented: the PUBLIC path is a ListenBrainz username
 * (anyone; free account; auto-imports Spotify listens once linked there), and
 * tucked behind a disclosure is Spotify personal mode — direct OAuth against
 * the owner's dev-mode app, which platform policy caps at 5 allowlisted users
 * (docs/runbooks/spotify-personal-mode.md). All decisions (matching, scoring)
 * happen in the pure modules; this component renders their output and forwards
 * clicks.
 */
import { useState } from 'react';

import type { GenreNode } from '../types';
import type { Personal } from './usePersonal';

/** Genres listed under "Your genres". The map lens itself shows every match. */
const MAX_LISTED = 15;
/** Matched-artist names shown per genre entry. */
const MAX_ARTISTS_SHOWN = 2;

interface PersonalPanelProps {
  personal: Personal;
  nodesById: ReadonlyMap<string, GenreNode>;
  /** Focus a genre on the map (same action as clicking its node). */
  onPick: (genreId: string) => void;
}

export default function PersonalPanel({
  personal,
  nodesById,
  onPick,
}: PersonalPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(personal.username ?? '');
  const [clientIdDraft, setClientIdDraft] = useState(personal.clientId);

  const name = (id: string) => nodesById.get(id)?.name ?? id;

  if (collapsed) {
    return (
      <button
        type="button"
        className="personal-expand"
        onClick={() => setCollapsed(false)}
        aria-expanded="false"
      >
        Your music{personal.weights.length > 0 ? ` (${personal.weights.length})` : ''}
      </button>
    );
  }

  const busy = personal.status === 'authorizing' || personal.status === 'loading';

  return (
    <div className="personal-panel">
      <div className="personal-header">
        <h2>Your music</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-expanded="true"
          aria-label="Collapse your music"
        >
          ‹
        </button>
      </div>

      {!personal.connected && !busy && (
        <>
          <p className="stub">
            See the genres you listen to on the map, and where to branch out.
          </p>
          <label className="personal-field">
            ListenBrainz username
            <input
              type="text"
              value={usernameDraft}
              onChange={(event) => setUsernameDraft(event.target.value)}
              placeholder="your listenbrainz.org name"
              aria-label="ListenBrainz username"
            />
          </label>
          <button
            type="button"
            className="personal-connect"
            disabled={usernameDraft.trim() === ''}
            onClick={() => void personal.connectListenBrainz(usernameDraft)}
          >
            Show my genres
          </button>
          <p className="personal-hint">
            No account? It&apos;s free at{' '}
            <a href="https://listenbrainz.org" target="_blank" rel="noreferrer">
              listenbrainz.org
            </a>{' '}
            — link Spotify there once and your listens flow in automatically.
          </p>

          <details className="personal-owner-mode">
            <summary>Connect Spotify directly (owner mode, max 5 users)</summary>
            <label className="personal-field">
              Spotify app client id
              <input
                type="text"
                value={clientIdDraft}
                onChange={(event) => setClientIdDraft(event.target.value)}
                placeholder="from the Spotify developer dashboard"
                aria-label="Spotify app client id"
              />
            </label>
            <button
              type="button"
              className="personal-connect"
              disabled={clientIdDraft.trim() === ''}
              onClick={() => void personal.connectSpotify(clientIdDraft)}
            >
              Connect Spotify
            </button>
          </details>
        </>
      )}

      {busy && (
        <p className="stub">
          {personal.status === 'authorizing'
            ? 'Talking to Spotify…'
            : 'Fetching your listening history…'}
        </p>
      )}

      {personal.error !== null && <p className="personal-error">{personal.error}</p>}

      {personal.connected &&
        personal.error === null &&
        personal.weights.length === 0 &&
        !busy && (
          <p className="stub">
            Connected, but none of your top artists matched the map&apos;s panels yet.
          </p>
        )}

      {personal.weights.length > 0 && (
        <>
          {personal.source === 'listenbrainz' && personal.username !== null && (
            <p className="personal-source">
              ListenBrainz · <strong>{personal.username}</strong>
            </p>
          )}
          {personal.source === 'spotify' && (
            <p className="personal-source">Spotify · personal mode</p>
          )}

          <label className="personal-lens-toggle">
            <input
              type="checkbox"
              checked={personal.lensOn}
              onChange={(event) => personal.setLensOn(event.target.checked)}
            />
            Highlight my genres on the map
          </label>

          <h3>Your genres</h3>
          <ul className="personal-genres" aria-label="Your genres">
            {personal.weights.slice(0, MAX_LISTED).map((genre) => (
              <li key={genre.id}>
                <button type="button" onClick={() => onPick(genre.id)}>
                  <span
                    className="personal-weight"
                    style={{ width: `${Math.round(genre.weight * 100)}%` }}
                    aria-hidden="true"
                  />
                  <span className="entity-name">{name(genre.id)}</span>
                  <span className="entity-sub">
                    {genre.artistNames.slice(0, MAX_ARTISTS_SHOWN).join(', ')}
                    {genre.artistNames.length > MAX_ARTISTS_SHOWN ? '…' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {personal.suggestions.length > 0 && (
            <>
              <h3>Branch out</h3>
              <ul className="personal-suggestions" aria-label="Suggested genres">
                {personal.suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button type="button" onClick={() => onPick(suggestion.id)}>
                      <span className="entity-name">{name(suggestion.id)}</span>
                      <span className="entity-sub">
                        via {suggestion.because.map(name).join(', ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="personal-actions">
            <button type="button" onClick={personal.refresh} disabled={busy}>
              Refresh
            </button>
            <button type="button" onClick={personal.disconnect}>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
