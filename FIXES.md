# LunaStream — Problems Found & Fixed

**Goal:** a fully self-contained app to stream movies & series on **PC (Windows/macOS/Linux)**,
**Android mobile** and **Android TV** — no server, no extra installs, only the app itself.

The web app was already converted to a static Next.js export (`output: 'export'`) with direct
client-side API calls (Cinemeta, Stremio add-ons, embeds, WebTorrent). That is the right
architecture. **But every packaged target was still broken.** Here is what was wrong and what
was changed.

---

## 🔴 P0 — Desktop (PC) app never loaded (blank screen)

**File:** `electron/main.js`

1. **Wrong URL parsing in the `lunastream://` protocol handler.**
   The code did `request.url.replace('lunastream://', '')`, which keeps the URL *host* (`app`)
   inside the file path: `lunastream://app/_next/static/x.js` → `out/app/_next/static/x.js`.
   That path never exists, so the SPA fallback served `index.html` for **every** JS/CSS file with
   `Content-Type: text/html`. Chromium refuses to execute scripts / styles with the wrong MIME
   type → the app never hydrated (permanent blank screen).
2. **The custom scheme was never registered as privileged.** Without
   `protocol.registerSchemesAsPrivileged(...)` *before* app ready, the scheme is not
   standard/secure, so absolute `/_next/...` URLs don't resolve against the origin and
   `fetch()` from the app origin misbehaves.
3. `target="_blank"` links (add-on config pages) opened empty Electron windows.

**Fixes**
- Parse paths with `new URL(request.url).pathname` (host excluded).
- `lunastream://` registered as `standard, secure, supportFetchAPI, corsEnabled, stream`.
- Directory-style routes (`/login/` → `login/index.html`) and RSC payloads (`*.txt`) resolve now;
  client-side navigation between pages works.
- External links open in the system browser (`setWindowOpenHandler` / `will-navigate`).
- Dev mode falls back to `http://localhost:3000` when no static export exists.

## 🔴 P0 — Android apps could never load CSS/JS (`_next` missing from the APK!)

**Files:** `android-mobile/app/build.gradle`, `android-tv/app/build.gradle`

AAPT's **default asset ignore pattern contains `<dir>_*`** — it silently excludes every
*directory whose name starts with an underscore*. The entire Next.js **`_next/` folder was never
packaged into the APK**. No amount of `shouldInterceptRequest` fixes could work because the
assets simply weren't there (this is what all the previous "CSS/JS loading" commits were
fighting).

**Fix:** override the ignore pattern without `<dir>_*>`:
```gradle
androidResources {
    ignoreAssetsPattern '!.svn:!.git:!.gitignore:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
}
```
✅ Verified: the APK now contains all `assets/_next/...` files (CSS + all JS chunks).

## 🔴 P0 — Android `file://` origin was fragile

**Files:** `android-mobile/.../MainActivity.java`, `android-tv/.../MainActivity.java`

The app loaded from `file:///android_asset/index.html`, which requires deprecated flags
(`setAllowUniversalAccessFromFileURLs`) and breaks `fetch()` / localStorage reliability on many
OEM WebViews. It also only intercepted `/_next/` and folders — **requests for files with an
extension in a sub-route (e.g. `/watchlist/index.txt`, the RSC payload Next.js fetches on
client-side navigation) fell through and failed**, so navigating to My List / History broke.

**Fix:** serve the bundled web app from an **https virtual host**
(`https://appassets.androidplatform.net/assets/...`) with a generic interceptor:
- `/assets/<path>` → asset `<path>`
- `/<anything with a dot>` → asset (covers `/_next/...`, `/manifest.json`, `/watchlist/index.txt`, …)
- `/<route>` → `<route>/index.html` (static-export folder structure), with `index.html` SPA fallback.

No deprecated flags needed; fetch/CORS/localStorage behave exactly like a normal https site.

## 🔴 P0 — Torrent search (TPB/apibay) always failed (CORS)

**File:** `src/app/page.tsx`

`apibay.org` sends **no CORS headers**, so the browser-side `fetch()` introduced when the server
proxy was removed is blocked — TPB results never appeared.

**Fix:** `fetchJSONWithCorsFallback()` tries the direct request first, then public CORS mirrors
(allorigins → codetabs) with timeouts; failure is non-fatal (streams still come from add-ons +
embeds + WebTorrent).

## 🟠 Broken server references left behind

- `src/components/UserMenu.tsx` called `/api/auth/me` and `/api/auth/logout` — those routes no
  longer exist in a static export. **Fixed** to use the localStorage profile (like login/register).

## 🟠 Watchlist & History were dead features

- Nothing ever wrote `watchlist_*` / `history_*`, no button existed, and the pages weren't even
  linked from the sidebar.
- Pages hard-required sign-in.

**Fixes (`src/app/page.tsx`, `watchlist`, `history`, `analytics` pages)**
- “**Add to My List**” button on every detail view (toggle, per-user or local profile).
- Every playback is recorded to **History** (with S/E for series).
- Sidebar links to **My List** and **History**.
- All pages fall back to a `local` profile — no account needed.

## 🟠 Search ignored series

Search always queried the movie catalog. **Fixed:** queries movies **and** series in parallel and
merges results.

## 🟠 Android TV remote (D-pad) couldn't operate the UI

**Fix:** `public/tv-navigation.js` — spatial navigation that moves focus to the nearest element in
the arrow direction, Enter activates, visible `:focus-visible` outline added in `globals.css`.
Auto-enabled only on TV-class user agents (desktop/phone untouched). Keys are forwarded by the TV
`MainActivity`. (Note: `WebViewFeature.SPATIAL_NAVIGATION` does **not** exist in any
androidx.webkit release — the JS approach works on every WebView.)

## 🟠 Gradle wrapper was a fragile custom script

`gradlew` hard-coded `/tmp/gradle-8.2`, used `unzip` without `-o` (hangs on prompts when re-run).
**Fixed:** robust download with `GRADLE_HOME` override (version 8.2 kept, matching AGP 8.2).

---

## Verified

- `npm run build` → static export OK (10 pages, all asset references resolve).
- Simulated `lunastream://` resolution against the real `out/` tree: index, `/_next/**`,
  `/watchlist/`, `/watchlist/index.txt`, manifest — all resolve; traversal blocked.
- **Both APKs compile and are signed**, and now contain the full web app
  (`assets/index.html`, `assets/_next/static/**` incl. CSS, `tv-navigation.js`).
- `node --check electron/main.js` OK; all routes of the export served via static server → 200.
- Cinemeta & MediaFusion send `Access-Control-Allow-Origin: *`; embed sources reachable.

## How to build / install (no server needed anywhere)

| Target | Command | Output |
|---|---|---|
| Web / PWA | `npm run build` → host `out/` anywhere static (or Vercel/Docker-nginx) | `out/` |
| PC (Win) | `npm run build && npm run dist:win` | `dist/LunaStream-Setup-1.0.0.exe` |
| PC (Linux) | `npm run build && npm run dist:linux` | AppImage / deb |
| PC (macOS) | `npm run build && npm run dist:mac` | dmg |
| Android mobile | `./scripts/build-android-selfcontained.sh` | `LunaStream-mobile-1.0.0.apk` |
| Android TV | same script | `LunaStream-tv-1.0.0.apk` |

Prebuilt (this fix): `release-apks/LunaStream-mobile-1.0.0.apk`, `release-apks/LunaStream-tv-1.0.0.apk`
(debug-signed — reinstall over them or sign with your own keystore for distribution).

## Known runtime notes (external dependencies, not bugs)

- Streams come from public Stremio add-ons (Comet / MediaFusion / AIOStreams), free embeds
  (VidSrc/2Embed/SuperEmbed/AutoEmbed) and TPB torrents played in-browser via WebTorrent (WebRTC).
  These third-party services change availability over time; the app fails gracefully.
- WebTorrent playback needs WebRTC — supported in Electron and Android WebView (Android 5+).
- Public CORS mirrors for apibay are best-effort; if all are down, TPB listings simply don't appear.

---

# Update v1.0.8 — Player stability & subtitles

## 🎬 "This content can't be embedded in a sandboxed frame" — FIXED
The embed iframe carried `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`.
VidSrc / 2Embed / SuperEmbed / AutoEmbed players **detect sandboxed frames and refuse to run**
(their anti-adblock/ad code needs out-of-sandbox behaviour), so Chromium showed the error page.
These providers are designed for plain `<iframe src>` embedding.
**Fix:** removed the `sandbox` attribute. Protection against malicious embed behaviour stays:
- Desktop (Electron): top-level navigation away from the app is intercepted and sent to the
  system browser (`will-navigate`), popups open externally — an ad can never take over the app.
- Android/TV: a new `shouldOverrideUrlLoading` guard sends any main-frame navigation away from
  the bundled app to the system browser instead of hijacking the WebView.

## 💬 Subtitles — actually implemented now
Previously `src/lib/subtitle-service.ts` was **never imported** by the real player, and it read
`process.env.OPENSUBTITLES_API_KEY` — a server env var that doesn't exist in a static app, so
searches could never return anything.
New in the built-in player (direct/video streams and torrents):
- **Subtitles button** in the player bar:
  - *Load .srt / .vtt file…* — works fully offline on every platform (SRT is converted to WebVTT
    client-side).
  - *Search OpenSubtitles* — searches api.opensubtitles.com (CORS-enabled, verified) by IMDB id
    + season/episode in your subtitle language. Needs a **free** API key: create an account at
    opensubtitles.com → profile → API key, paste it in **Settings → Subtitles** (stored only on
    the device). Free accounts are rate-limited (~5 downloads/day) — the app shows the API's
    message when that happens.
- Subtitles auto-show on playback; track is reset when the source changes.
- Settings also gained a Greek option in subtitle language.

## 🛡 Stability
- **HLS (.m3u8) playback** via `hls.js` (MSE) — previously HLS streams only played on devices
  with native HLS (Safari); on Windows/Android/Linux they errored. Many add-on streams are HLS.
- **"Next source" failover button** in the player and embed bars + in error banners: one tap
  switches to the next available stream.
- Fixed `<source>` duplication in the video element.

## ❓ Why not peerflix?
[peerflix](https://github.com/mafintosh/peerflix) streams torrents by running a **Node.js CLI +
local HTTP server**. That contradicts the goal of a fully self-contained app (Node would have to
be installed/bundled, and it can't run inside Android WebView at all). The app already streams
torrents **in-process** with WebTorrent — the same engine by the same author (mafintosh) that
peerflix wraps, without any server. For stability we instead hardened what's already there:
HLS support, failover, and guard rails around third-party embeds.

---

# Update v1.0.9 — Android fix: app showed HTML source as plain text

## 🔴 Android app rendered raw HTML instead of the UI — FIXED
`WebResourceResponse`'s **mimeType field must contain the bare MIME type**. My interceptor passed
`"text/html; charset=utf-8"`, which Chromium doesn't recognise, so the WebView fell back to
rendering the response as plain text — the whole `index.html` source was shown as text
(desktop/Electron was unaffected because it serves through a different path).
**Fix:** bare MIME type in the mime field, charset moved to the `encoding` parameter
(`new WebResourceResponse("text/html", "utf-8", is)`).

## 🔐 Stable APK signing — updates install over previous versions
CI generated a **fresh random debug keystore on every release**, so every APK had a different
signature and Android refused to update (you had to uninstall and lose your data each time).
A fixed debug keystore is now committed (`android-*/keystore/debug.keystore`) and used by both
local and CI builds — from v1.0.9 on, releases update in place.
(One-time step for v1.0.9: uninstall the old version first since v1.0.8 was signed differently.)

## 🛡 Extra hardening
`shouldOverrideUrlLoading` now also blocks non-web schemes (`intent://`, `market://`, …) that
embedded-player ads use for redirects; http(s) links still go to the system browser.

---

# v1.1.0 — Our own player, end to end (no more third-party embed players by default)

The ad-popup incidents came from the 5 third-party embed players (VidSrc/2Embed/…)
loaded in iframes. v1.1.0 makes playback run through **our own player** wherever
possible, backed by a real torrent engine on every platform:

## A. Sources reordered — our player first
- Streams are now sorted: **torrents (our player, zero ads) → direct URLs (our
  player) → embeds (third-party iframe players) last resort**. Previously embeds
  were deliberately prioritised — that was the wrong trade-off.

## B. Desktop: real torrent engine inside the app (Electron main process)
- New `electron/torrent-engine.js`: WebTorrent in the Electron main process with
  **full TCP/uTP swarm access** (the in-browser build only reaches WebRTC peers).
- Serves the selected file over `http://127.0.0.1` with Range support; the app's
  own `<video>` player streams it. No third-party player, no ads.
- Extra public trackers are appended to magnets automatically (better peer
  discovery for stale TPB magnets).
- Renderer falls back to the in-browser WebTorrent automatically if the engine
  fails (e.g. no peers).
- Includes an install-time compatibility patch (`scripts/patch-webtorrent.js`):
  webtorrent 2.x + parse-torrent 11 is broken in Node/Electron (infoHash hex
  string passed to an arr2hex that requires Uint8Array) — the patch makes
  arr2hex hex-string-tolerant. Verified by loading real torrents and seeking.
- `npmRebuild: false` for electron-builder: `utp-native` cannot be rebuilt for
  the Electron ABI and is loaded defensively by webtorrent (TCP-only fallback).

## C. Android + TV: native libtorrent engine inside the APK
- New `LunaTorrentManager` (jlibtorrent / libtorrent 2.0.12.9): fetches magnet
  metadata, picks the largest video file, downloads it **sequentially** with all
  other files ignored, and serves it over a local HTTP server (127.0.0.1) with
  Range support (blocks until the requested bytes are on disk, boosts requested
  piece ranges for seeks).
- Exposed to the web app via `window.LunaTorrent` (addJavascriptInterface).
- The WebView <video> plays `http://127.0.0.1:<port>/file` — our player, zero ads.
- minSdk raised to 24 on TV (jlibtorrent requirement). APKs are larger (~+38 MB,
  native libs for arm64, armv7, x86_64).
- JS fallback chain on every platform:
  **desktop engine → Android native engine → in-browser WebTorrent → embeds**.

## Verified
- Desktop engine: end-to-end in this workspace — real torrent, HTTP 206 range
  fetches, mid-file seek, mp4 magic bytes, ~6.5 MB/s from live peers/webseed.
- Android: full API sequence executed on the desktop JVM with the same jlibtorrent
  jars (session, metadata, file selection, priorities, sequential flag, progress);
  both APKs compile with the manager wired in; native libs present per ABI;
  stable signing key unchanged (installs over v1.0.9). Live swarm transfer on a
  real device could not be exercised from this sandbox (no emulator, UDP blocked)
  — if anything misbehaves the app automatically falls back to the in-browser
  engine, so playback never regresses.

## Note on reliability
Torrents are not guaranteed to exist for every title (fresh episodes especially).
Embeds are kept as last-resort fallback for that reason — but they now open with
the popup/hijack protections from v1.0.8/1.0.9 in place.

---

# v1.2.0 — Mobile experience, fullscreen, smarter search, new icon

## Fullscreen fixed (all platforms)
- **Android/TV**: the WebView never implemented the HTML5 fullscreen contract
  (`onShowCustomView`/`onHideCustomView`), so the browser fullscreen request was
  silently ignored. Both are now implemented natively: fullscreen video takes
  over the screen, locks to landscape (sensor), keeps the screen on, and Back
  exits fullscreen. Desktop/Electron fullscreen worked and keeps working.
- The web player got a dedicated **Fullscreen** button (plus double-click
  toggle on desktop) that requests fullscreen on the player stage.

## Mobile-friendly UI (phones)
- On phones the desktop sidebar is replaced by a **top app bar** (logo + My
  List + History) and a **bottom navigation bar** (Home / Movies / Series /
  Search / Add-ons) with 48px-class touch targets and safe-area padding.
- Responsive layout throughout: hero 70vh→52vh, smaller paddings, smaller
  poster cards in carousels (128px on phones), responsive detail view
  (backdrop, poster, title sizes), full-width subtitles panel, bigger
  select/episode pickers and stream "Play" buttons.
- Pinch-zoom jitter disabled in the app viewport (feels native, no accidental
  zoom), `viewport-fit=cover` for notched phones. Search input no longer pops
  the keyboard automatically and searches both movies and series.

## Smarter episode search
- Torrent search is now **episode-aware**: it classifies releases as exact
  `SxxEyy` episodes vs season packs, and when a specific episode is requested
  and the IMDb-id search returns no exact episode, it **automatically re-searches
  by series title + SxxEyy** (catches uploads that are not linked to the IMDb
  id). Exact episodes rank above season packs, and packs are hidden entirely
  when exact episodes exist. Episodes that previously only came from embed
  providers can now be played with our own torrent player.
- Sorting within each source tier: exact episode > season pack > untagged,
  then quality, then seeders.

## New app icon
- New moon + play artwork applied everywhere: Android launcher icons (all
  densities, mobile + TV), Android TV banner, desktop/PWA icons (Windows,
  macOS, Linux, favicon), regenerated from a single 1024px master.

## Verified
- Web build compiles and generates all pages; Android assets bundled from the
  same build; all platform installers and APKs are built by CI on the v1.2.0
  tag (same pipeline, same stable signing certificate).

---

# v1.2.1 — PC ads + "movie never starts" hotfix

Root cause of the reported desktop issue (ad banner + movie never starting):
the app had fallen through to a third-party embed player — on desktop there was
(a) no network-level ad blocking, (b) no auto-recovery when a source doesn't
actually start, and (c) only one torrent provider, so torrents were often
missed and embeds were reached at all.

## Auto-failover (all platforms) — a source can never strand you again
- Torrent attempts get a 100s watchdog: no playable stream → the app
  automatically tries the next source.
- Embed players get a visible 20s countdown ("Source not starting? Next source
  in Xs") with "Keep this source" / "Next now"; if the provider never starts
  the movie, the app advances on its own.
- WebTorrent client errors, "no video file" and `<video>` playback errors also
  auto-advance. After all sources are tried, the app explains and returns to
  the detail view instead of showing a dead player.

## Desktop ad blocking (Electron)
- Session-level blocklist: ~50 popunder/redirect/ad networks (popads, popcash,
  adsterra, propellerads, exoclick, hilltopads, clickadu, …) are cancelled at
  the network layer for ALL frames — ad overlays mostly never load, and
  hijack/redirect calls die before they run.
- In-frame suppressor injected into every third-party iframe: removes leftover
  ad overlays (high-z-index popups, ad-network iframes) and clicks through
  ad-gate buttons ("Close" / "Continue to play") automatically.
  (Complements the existing popup-window denial + navigation lockdown.)

## More torrent sources → fewer embeds
- YTS (movies): reliable scene releases with quality/size/seeds, played in our
  own player.
- EZTV (series): episode torrents — and because EZTV's season/episode API
  filters are unreliable (they return unrelated shows), every row is verified
  against BOTH the requested SxxEyy tag AND the series name before use.
- Together with TPB (which now also falls back to a title search), most
  titles resolve to our own ad-free torrent player instead of embeds.

## Verified
- Live provider checks: apibay title search returns 66 seeded results for the
  reported movie; EZTV returns 30 rows for a test episode query and the
  double verification (episode tag + show name) filters out all mismatched
  shows; torrent engine regression test passes.
- Desktop version bumped to 1.2.1; CI builds all installers/APKs on the tag.

---

# v1.2.2 — Hotfix: popups now truly blocked; player no longer hidden

Two defects in v1.2.1 are fixed, plus a deep verification of the whole
desktop playback chain:

## What was actually wrong (root causes, with proof)
1. **Ads were being forwarded to the system browser.** The popup blocker
   denied popups *inside* the app but then passed every blocked http(s) URL
   to `shell.openExternal` — including ad popunders opened by embed players.
   Result: "popup on browser AND inside app". Now: only links that originate
   from OUR OWN UI (referrer = app origin, e.g. add-on config links) open
   externally. Anything opened from inside a provider iframe is denied
   silently and goes nowhere. Top-level navigation blocking no longer
   forwards to the browser either.
2. **The v1.2.1 "in-iframe ad suppressor" did more harm than good** — it
   removed high-z-index overlays and clicked Close/Play buttons inside embed
   pages every 1.2 s, which could hide the real player ("player screen gets
   hidden") while missing popups. It is fully removed. Ad control now happens
   where it is safe and effective: at the network layer (domain blocklist,
   kept) and at the popup/navigation layer (fixed above).
3. **The torrent engine was verified end-to-end in the REAL packaged app**:
   we built the actual Linux bundle and ran the engine from inside the
   packaged (asar) app under a headless display — metadata, streaming and
   HTTP range playback all PASS. The "movie never starts" chain is therefore
   not the engine: with popups no longer reaching the browser and dead embeds
   auto-skipped (30 s, unobtrusive corner countdown with "Stay" / "Next"),
   playback falls forward to a working source instead of stranding.

## Verification performed
- Engine under the real Electron runtime (dev + packaged asar): PASS (206).
- Full packaged app boots headless with the fixed main process: clean.
- Renderer build + engine regression test: PASS.

---

# v1.2.3 — Navigation, My List & History actually work

Broken things found by auditing the standalone routes (fixed):
- **Dead links**: every item in My List and History linked to `/watch/<id>`,
  a route that does not exist in the app (SPA). Both now deep-link into the
  app via `/?open=<imdbId>` (History keeps `&s=&e=` to land on the exact
  episode). The app resolves the id against Cinemeta by querying BOTH types
  and preferring the response with real episode data (Cinemeta returns junk
  matches for the wrong type - verified with Breaking Bad).
- **Settings was unreachable** from the UI (the subtitle panel even says
  "Settings → Subtitles"). It is now in the desktop sidebar and in the
  mobile top bar.
- **Hover-only delete**: the remove button on My List items was invisible
  until mouse-hover (unusable on touch). It is now always visible with a
  proper touch target.
- Responsive paddings on My List / History / Settings; History rows wrap
  gracefully on narrow screens.

Desktop version 1.2.3. All installers/APKs rebuilt by CI on the tag.

---

# v1.3.0 — Real playback progress, auto-resume, Continue Watching

The history page always rendered empty progress bars (progress was hardcoded
to 0 and never updated) and nothing carried your position between sessions.

- **Progress is now tracked for real**: the player saves the watched
  percentage every 5s (throttled, direct localStorage write), on Back, and
  marks 100% on end. My List unaffected.
- **Auto-resume**: reopening a partially watched title (2-95%) seeks straight
  back to the position, with a subtle "Resumed at N%" toast (4s).
- **Continue Watching row** at the top of Home (before Trending): partially
  watched titles, latest first; series continue on the exact episode.
- History page: "Clear all" button (with confirmation).

Desktop version 1.3.0. CI builds all installers/APKs on the tag.

---

# v1.4.0 — Player polish & quality-of-life

- **Auto-hiding player bar**: the top bar (Back / Next / Subtitles /
  Fullscreen) now hides after 4s of playback and reappears on any mouse
  move, touch, key press or pause - the video finally plays unobstructed
  (embed player keeps its bar; iframe events don't bubble out).
- **Screen wake lock** while our player streams on phones (best-effort,
  ignored where unsupported) - the screen no longer dims mid-movie.
- **Deduped stream list**: identical magnets across TPB/YTS/EZTV collapse
  into one entry (most seeded kept) - cleaner list, no double sources.
- **"Retry all sources"** button appears when a title exhausted every
  source, so a transient outage doesn't force leaving the title.
- **Version shown in Settings** (build-stamped version.json) - you can
  always confirm which build you are testing.

Desktop version 1.4.0. CI builds all installers/APKs on the tag.

---

# v1.4.1 — Torrentio preconfigured; addon torrent streams fixed; embeds optional

Answering "why not use Torrentio like Stremio": the app already speaks the
Stremio addon protocol (Comet/MediaFusion/AIOStreams were built in) — but a
mapper bug silently discarded every TORRENT result addons returned: the
Stremio protocol carries torrent streams as `infoHash` (no url), and the
filter required url/externalUrl. So addons could never deliver the
Stremio-like experience until now.

- **Mapper fixed**: addon streams with infoHash become magnets (with
  seeders parsed from the release label) and play in OUR own player -
  zero ads, same as Stremio but without Stremio's server.
- **Torrentio preconfigured** (official + ElfHosted mirror) and merged into
  existing installs automatically (user's own addon choices preserved).
- **Embeds are now optional**: Settings -> "Allow third-party embed
  fallback" (default on, still strictly last resort). Turn OFF to run
  torrents/addons/direct only.
- Note: Torrentio/ElfHosted/Comet apply IP-based anti-abuse filters; from
  home connections they respond normally (as with Stremio). Failures are
  non-fatal - built-in TPB/YTS/EZTV always run in parallel.

Desktop version 1.4.1. CI builds all installers/APKs on the tag.

---

# v1.4.2 — Subtitles fixed (root cause proven with an experiment)

Root cause (reproduced under a real Electron runtime): `<track>` subtitle
data is silently NOT loaded by Chromium when the video source is cross-origin
without CORS. Since v1.1.0, movies play from our local engine servers
(127.0.0.1) which is cross-origin to the app - so native text tracks went
dead (cue list stays empty, video plays fine). Before v1.1.0 playback used
CDN/embed sources, which is why it "used to work".

Fix:
- **LunaStream now renders subtitles itself**: SRT/VTT (file or
  OpenSubtitles download) is parsed into cues and drawn as an overlay
  synced to the video. Zero dependence on origin/CORS - works on desktop
  engine, Android engine, CDN, direct URLs, HLS, and in fullscreen.
  Verified with a unit test (multi-line, tags, Greek text, hour-format
  timestamps).
- Android engine local server now also sends Access-Control-Allow-Origin: *
  (desktop engine already did) for correct cross-origin citizenship.

Desktop version 1.4.2. CI builds all installers/APKs on the tag.

---

# Cross-platform verification audit (v1.4.2)

Every released artifact was opened and inspected for the shipped fixes
(distinctive build markers, not assumptions):

| Fix | Mobile APK | TV APK | Desktop (.deb asar) |
|---|---|---|---|
| Subtitles overlay renderer + VTT parser (v1.4.2) | OK | OK | OK |
| Engine CORS header, Java side (v1.4.2) | OK | OK | OK (already had) |
| Auto-hide player bar / failover banner (v1.4.0/1.2.x) | OK | OK | OK |
| Torrentio + embed kill-switch (v1.4.1) | OK | OK | OK |
| Continue Watching / resume toast (v1.3.0) | OK | OK | OK |
| Deep links, Settings entry (v1.2.3) | OK | OK | OK |
| Native fullscreen (v1.2.0) | OK | OK | OK |
| Torrent bridge (v1.1.0) | OK | OK | OK |
| version.json == 1.4.2 | OK | OK | OK |

- All 9 CI jobs (incl. Docker/web, Windows, macOS, AppImage, deb, both APKs)
  built from the SAME release commit (77d1ccd) - verified per job.
- New permanent guarantee: `scripts/check-parity.sh` runs in CI and FAILS the
  build if the Android Mobile and TV engine files ever drift apart - a fix
  can never silently miss a platform again.

---

# v1.5.0 — Automatic subtitles (Stremio-style) + no-sound sources fixed

## Subtitles: loaded automatically, no external .srt files
- **Built-in OpenSubtitles app key**: subtitle search works out of the box on
  every platform (key validated live against the real API; invalid-key errors
  verified).
- **One-time in-app sign-in** with a FREE OpenSubtitles account (same model as
  Stremio - downloads require a user token by their policy): username +
  password typed directly in the player's Subtitles panel; stored locally,
  Sign out available.
- **Auto-load on playback**: opening any title silently searches OpenSubtitles
  (title + season/episode + preferred language), picks the most-downloaded
  match and renders it via the overlay engine ("Subtitles loaded (Ελληνικά)"
  toast). The .srt picker stays as a fallback.
- **Language preference** persisted (Ελληνικά default, 9 languages).
- **Seamless by design**: 15s hard timeouts on all subtitle fetches, and a
  per-session marker avoids burning the daily OpenSubtitles download quota on
  repeated plays of the same title/episode.
- Fixed a real conflict found during integration: a second settings-loader
  effect used to reset the API key to '' on every title change - unified into
  a single loader with priority (user key > legacy Settings field > built-in).

## Sources with no sound: root cause + two-layer fix
- Root cause: releases with AC-3 / E-AC-3 / DTS / TrueHD audio play SILENT in
  Chromium-based players (Electron desktop + Android WebView - those codecs
  are not licensable in Chromium; Stremio only avoids this via LibVLC).
  YTS/AAC releases play fine - hence "some sources have no sound".
- **Audio-aware ranking**: sources are scored by audio compatibility
  (AAC/Opus > unknown > AC-3/DTS); an audible 720p now outranks a silent 4K
  (unit-tested ordering).
- **Silence detector (proven under Electron)**: if 9s into playback no audio
  bytes have decoded (webkitAudioDecodedByteCount === 0, video advancing,
  not muted), the app announces "no sound (codec not supported)" and
  auto-advances to the next source. Verified experimentally: audio-less
  stream keeps the counter at 0 while a video with an AAC track decodes
  ~165KB - both branches reproduced in the real runtime.

## Verified before commit
- Real API with the shipped key: search by series+season+episode (Breaking
  Bad S01E01 Greek: 12 results), movies (Inception: 50), invalid-key rejection.
  (Mandalorian returns 0 on OpenSubtitles itself - Disney takedowns.)
- Full pipeline vs exact API shapes: 9/9 PASS (login, token, search, ranking,
  authorized download, SRT->VTT->cues, cue timing, error paths).
- Silence detector signal proven in real Electron runtime (both branches).
- Web build, both Android asset bundles, engine regression: PASS.
