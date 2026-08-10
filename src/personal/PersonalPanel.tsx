/**
 * "Your music" — the personal lens's panel, below the filter in the left aside.
 *
 * Personal mode is honest about its constraints: it works for the ≤5 users on
 * the owner's Spotify dev-mode allowlist (docs/runbooks/spotify-personal-mode.md),
 * so the disconnected state explains itself instead of pretending to be a
 * public login. All decisions (matching, scoring) happen in the pure modules;
 * this component only renders their output and forwards clicks.
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
            Connect Spotify to light up the genres you listen to and see where to branch
            out. Personal mode: only listeners on this app&apos;s Spotify allowlist (max
            5) can connect.
          </p>
          <label className="personal-client-id">
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
            onClick={() => void personal.connect(clientIdDraft)}
          >
            Connect Spotify
          </button>
        </>
      )}

      {busy && <p className="stub">Talking to Spotify…</p>}

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
