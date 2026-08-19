/**
 * The right-hand panel — what a focused genre actually sounds like.
 *
 * Lazy-loads `public/data/genres/<id>.json` through the session cache
 * (`createDetailCache`), so re-focusing a genre never re-fetches. Four lists:
 * popular / obscure tracks, popular / small artists, each linking out to where the
 * music lives. Audio previews arrive in milestone 6.
 *
 * States are explicit: idle (nothing focused), loading, error, loaded-but-thin
 * (a real MusicBrainz condition — a genre can clear the release-group threshold yet
 * have no ranked listens at all).
 */
import { useEffect, useState } from 'react';

import type { Artist, GenreDetail, GenreNode, Track } from '../types';
import { createDetailCache } from '../lib/dataset';
import { trackLinks } from '../lib/trackLinks';

// The wrapper resolves `fetch` at call time, not module-load time — tests stub the
// global after this module is imported.
const cache = createDetailCache((input, init) => globalThis.fetch(input, init));

/** 1234567 → "1.2M" — listens are a magnitude signal, not an accounting figure. */
export function formatListens(listens: number): string {
  if (listens >= 1_000_000) return `${(listens / 1_000_000).toFixed(1)}M`;
  if (listens >= 1_000) return `${Math.round(listens / 1_000)}k`;
  return String(listens);
}

const LINK_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  youtube: 'YouTube',
  discogs: 'Discogs',
  deezer: 'Deezer',
};

function Links({
  links,
}: {
  links: readonly { kind: string; url: string; title?: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <span className="links">
      {links.map((link) => (
        <a
          key={link.kind}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          {...(link.title === undefined ? {} : { title: link.title })}
        >
          {LINK_LABELS[link.kind] ?? link.kind}
        </a>
      ))}
    </span>
  );
}

/**
 * One preview plays at a time, via Deezer's widget player embedded on demand.
 * An embed (not an <audio> tag) because Deezer preview MP3 URLs expire in minutes
 * and cannot live in the static dataset — only the stable track id can.
 */
function TrackList({
  heading,
  tracks,
  playingId,
  onPlay,
}: {
  heading: string;
  tracks: readonly Track[];
  playingId: number | null;
  onPlay: (deezerId: number | null) => void;
}) {
  if (tracks.length === 0) return null;
  return (
    <section>
      <h3>{heading}</h3>
      <ul>
        {tracks.map((track) => (
          <li key={track.mbid}>
            <span className="entity-name">
              {track.deezerId !== undefined && (
                <button
                  type="button"
                  className="preview-toggle"
                  aria-label={
                    playingId === track.deezerId
                      ? `Stop preview of ${track.title}`
                      : `Play preview of ${track.title}`
                  }
                  onClick={() =>
                    onPlay(playingId === track.deezerId ? null : (track.deezerId ?? null))
                  }
                >
                  {playingId === track.deezerId ? '■' : '▶'}
                </button>
              )}
              {track.title}
            </span>
            <span className="entity-sub">
              {track.artistName} · {formatListens(track.listens)} listens
            </span>
            <Links links={trackLinks(track)} />
            {playingId === track.deezerId && track.deezerId !== undefined && (
              <iframe
                title={`Deezer preview: ${track.title}`}
                className="preview-player"
                src={`https://widget.deezer.com/widget/dark/track/${track.deezerId}?tracklist=false&autoplay=true`}
                allow="autoplay; encrypted-media"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArtistList({
  heading,
  artists,
}: {
  heading: string;
  artists: readonly Artist[];
}) {
  if (artists.length === 0) return null;
  return (
    <section>
      <h3>{heading}</h3>
      <ul>
        {artists.map((artist) => (
          <li key={artist.mbid}>
            <span className="entity-name">{artist.name}</span>
            <span className="entity-sub">{formatListens(artist.listens)} listens</span>
            <Links links={artist.links} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tagged with the genre id it belongs to — "loading" is simply "no result for the
 * current id yet", so no synchronous setState is needed when focus changes. */
type PanelResult =
  { id: string; phase: 'error' } | { id: string; phase: 'loaded'; detail: GenreDetail };

export default function DetailPanel({ node }: { node: GenreNode | null }) {
  const [result, setResult] = useState<PanelResult | null>(null);
  // Tagged with the genre id so switching genres implicitly silences the preview —
  // no reset effect needed.
  const [playing, setPlaying] = useState<{ nodeId: string; deezerId: number } | null>(
    null,
  );

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    const id = node.id;
    cache.get(id).then(
      (detail) => {
        if (!cancelled) setResult({ id, phase: 'loaded', detail });
      },
      () => {
        if (!cancelled) setResult({ id, phase: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [node]);

  if (!node) {
    return (
      <div>
        <h2>No genre selected</h2>
        <p className="stub">Click a genre on the map to hear what lives there.</p>
      </div>
    );
  }

  const state =
    result && result.id === node.id ? result : ({ phase: 'loading' } as const);

  if (state.phase === 'loading') {
    return (
      <div>
        <h2>{node.name}</h2>
        <p className="stub" data-testid="panel-loading">
          Loading…
        </p>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div>
        <h2>{node.name}</h2>
        <p className="stub" data-testid="panel-error">
          Could not load this genre's songs and artists.
        </p>
      </div>
    );
  }

  const nodeId = node.id;
  const handlePlay = (deezerId: number | null) => {
    setPlaying(deezerId === null ? null : { nodeId, deezerId });
  };

  const { detail } = state;
  const empty =
    detail.popularTracks.length === 0 &&
    detail.obscureTracks.length === 0 &&
    detail.popularArtists.length === 0 &&
    detail.smallArtists.length === 0;

  return (
    <div data-testid="panel-loaded">
      <h2>{node.name}</h2>
      <p className="entity-sub">{formatListens(node.popularity)} tagged releases</p>
      {empty ? (
        <p className="stub">
          This genre is on the map, but nothing is filed under it clearly enough to list —
          it is a name in MusicBrainz&rsquo;s hierarchy more than a label people actually
          use.
        </p>
      ) : (
        <>
          <TrackList
            heading="Popular songs"
            tracks={detail.popularTracks}
            playingId={playing && playing.nodeId === node.id ? playing.deezerId : null}
            onPlay={handlePlay}
          />
          <TrackList
            heading="Deeper cuts"
            tracks={detail.obscureTracks}
            playingId={playing && playing.nodeId === node.id ? playing.deezerId : null}
            onPlay={handlePlay}
          />
          <ArtistList heading="Popular artists" artists={detail.popularArtists} />
          <ArtistList heading="Small artists" artists={detail.smallArtists} />
        </>
      )}
    </div>
  );
}
