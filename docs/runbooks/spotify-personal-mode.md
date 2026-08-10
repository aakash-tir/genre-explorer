# Runbook — Spotify personal mode (owner setup)

The "Your music" panel connects a Spotify account and lights up the genres you
listen to, plus suggestions to branch out. It runs on a **development-mode**
Spotify app: **at most 5 manually-allowlisted users**, and the app owner must
hold an active Premium subscription. This is a hard Spotify policy for apps
registered in 2026, not a setting — see
`docs/research/listening-history-personalization.md` §2 for the evidence and
the paths to something bigger (ListenBrainz bridge, export upload).

Everything below is a one-time dashboard task for the repo owner. The app code
needs nothing but the resulting **client id** (a public identifier — PKCE apps
have no secret).

## 1. Create the Spotify app

1. Go to <https://developer.spotify.com/dashboard> (log in with the Premium
   account that will own the app) and **Create app**.
2. Name/description: anything (e.g. "Genre Explorer personal mode").
3. **Redirect URIs** — add BOTH, exactly:
   - `https://aakash-tir.github.io/genre-explorer/`
   - `http://127.0.0.1:5173/` (local dev; Spotify requires HTTPS except for
     loopback IPs, and `localhost` is not accepted — use the numeric form)
4. API used: **Web API**. Save.
5. Copy the **Client ID** from the app's settings page.

> Local dev note: Vite binds `localhost` by default. To test the OAuth flow
> locally, run `npm run dev -- --host 127.0.0.1` and open `http://127.0.0.1:5173/`
> so the address bar matches the registered redirect URI.

## 2. Allowlist the listeners (max 5)

Development mode only serves users you name. In the app's settings →
**User Management**, add the Spotify account email + name of every person who
may connect — yourself included. Anyone else gets a 403 from the API after
authorizing; the panel surfaces that with a pointer here.

## 3. Give the app the client id (either way works)

- **Baked into the build (recommended):** repo → Settings → Secrets and
  variables → Actions → **Variables** → New repository variable
  `SPOTIFY_CLIENT_ID` = the client id. The deploy workflow passes it to Vite as
  `VITE_SPOTIFY_CLIENT_ID`; the next merge to `main` picks it up and the panel's
  client-id field is pre-filled.
- **Pasted at runtime:** skip the variable; each allowlisted user pastes the
  client id into the "Your music" panel once. It persists in their browser's
  `localStorage`.

A repository _variable_ (not a secret) is correct: the client id ships in the
public JS bundle either way.

## 4. What connecting looks like

Connect Spotify → Spotify's consent page (scope: `user-top-read` only) →
redirected back → the app fetches your top 50 artists (long-term + medium-term),
matches them against the dataset's artist index in the browser, and stores
everything in `localStorage`. No server, no accounts, nothing leaves the
browser except the calls to `accounts.spotify.com` / `api.spotify.com`.

**Disconnect** in the panel wipes the stored tokens and profile. Revoking the
app entirely: <https://www.spotify.com/account/apps/>.

## Troubleshooting

| Symptom                                | Cause / fix                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `INVALID_CLIENT: Invalid redirect URI` | The address bar doesn't exactly match a registered redirect URI (§1.3).     |
| 403 after authorizing                  | User not in User Management (§2), or the 5-user cap is full.                |
| "Spotify session expired" loops        | Refresh token revoked — Disconnect, then Connect again.                     |
| Panel says connected but no genres     | The user's top artists don't overlap the dataset's panel artists; matching  |
|                                        | is honest about that. More coverage = raise `SEARCH_LIMIT` in the pipeline. |
