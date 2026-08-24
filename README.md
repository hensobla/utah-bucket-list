# Utah Bucket List

A mobile-first checklist microsite for everything left to do in Utah, **September 2026 → June 2027**. Organized by suggested timeline — time-sensitive items, then fall, winter, spring, and early summer, plus an anytime/local-culture section.

**Live site:** https://hensobla.github.io/utah-bucket-list/

## How it works

- Pure static HTML/CSS/JS — no build step, no backend, no accounts.
- Tap any place to mark it done. Progress is saved with `localStorage`, entirely on your device — nothing is uploaded anywhere.
- The "Already Checked Off" section comes pre-checked on first load with everything already done as of the source list.
- Every section is collapsible — tap a header to expand/collapse it, animated, state remembered per device. Everything starts open except "Already Checked Off."
- Filter chips (`All` / `To Do` / `Done`) and an "Act now" shortcut jump to (and opens) the time-sensitive section.
- "Reset all progress" in the footer clears the checklist on that device only.

Because progress lives in the browser's local storage, it's per-device — checking something off on your phone won't show as done on your laptop. That's the tradeoff for keeping this simple, free, and with nothing to sign into.

Editing `data.js` later — adding items, rewording titles/blurbs, moving something to a different section — never touches anyone's saved progress; see the comment above `ITEMS` in `data.js` for the one thing that does (changing an existing item's `id`). The service worker (below) is unrelated to this — it manages its own separate Cache Storage for HTML/CSS/JS/images, never `localStorage`, so deploying updates can't affect saved checklist state either way.

## Design

Look and feel is adapted from [altergresources.com](https://altergresources.com/): white ground, hairline pale-blue-gray borders, soft rounded corners, big two-weight headlines (light + bold in the same line), and color used sparingly — one accent per season instead of a full palette. Type is [Manrope](https://fonts.google.com/specimen/Manrope).

Motion follows the rules in [emilkowalski/skills](https://github.com/emilkowalski/skills) (`animate` + `review-animations`): named easing tokens (`--ease-out`, `--ease-in-out`) instead of hand-rolled curves, `transform`/`opacity` only (the section accordions are the one sanctioned exception — animating `grid-template-rows` is the skill's documented technique for reveal-to-auto-height, since there's no transform equivalent), transitions rather than keyframes for anything rapidly-triggered, hover motion gated behind `(hover: hover) and (pointer: fine)` so touch doesn't fire false hovers, everything under 300ms, and a `prefers-reduced-motion` fallback.

### Hero image

The band under the headline is a CSS `background-image` pointing at `assets/hero.jpg`. If that file is ever removed, the band falls back to a solid ink fill rather than a broken image. To regenerate it, see [`assets/HERO_IMAGE_PROMPT.md`](assets/HERO_IMAGE_PROMPT.md) for the prompt and specs.

### Home screen icon + link previews

- `assets/apple-touch-icon.png` (180×180, opaque — no transparency, since iOS applies its own corner mask) is what shows up if you "Add to Home Screen" from iOS Safari. It's the same Utah-outline mark as the favicon and hero, just rasterized larger. Regenerate it from `styles.css`'s `.hero__mark` path if that mark ever changes.
- `manifest.json` plus the `apple-mobile-web-app-*` meta tags in `index.html` make the home-screen launch open without Safari's browser chrome and use "Utah Bucket List" as the label under the icon.
- `assets/og-image.jpg` (1200×630, cropped from `hero.jpg`) is the `og:image`/`twitter:image` — the thumbnail iMessage, Slack, etc. show when the URL is shared. The `og:image` meta tag uses an **absolute** URL (`https://hensobla.github.io/utah-bucket-list/...`) since link-preview crawlers don't reliably resolve relative ones — that only resolves once this is actually deployed there; it won't preview correctly off a local or differently-hosted copy without updating that URL.

### Staying fresh after "Add to Home Screen"

GitHub Pages caches every file — including `index.html` itself — for 10 minutes server-side (`cache-control: max-age=600`), and there's no way to override that from a static repo. iOS home-screen installs can also hold onto old content more stubbornly than a regular Safari tab. `sw.js` is a minimal service worker that closes that gap: it tries the network first on every same-origin request and only ever falls back to its own cache if there's no connection at all, so an install on your home screen always reflects whatever's actually deployed, not a stale snapshot from whenever you added it. It registers itself from `app.js` and needs no configuration — if you ever change the caching strategy, bump `CACHE_NAME` in `sw.js` so old cached entries get cleared out on activate.

The tiny `v<N>` line at the very bottom of the page is a build number — a quick way to visually confirm you're actually looking at the latest push rather than something cached. It's stamped automatically by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main` (`github.run_number`, which just counts 1, 2, 3, ... — no manual editing, ever). `index.html` itself only ever contains the literal placeholder `v__BUILD_VERSION__`; that's expected if you're looking at the raw file or a local copy instead of the deployed site.

## Source content

[`utah_bucket_list_updated.md`](utah_bucket_list_updated.md) is the original research doc this site was built from. Update `data.js` to change items, sections, or dates.

## Files

- `index.html` — page structure
- `styles.css` — all styling
- `data.js` — the list itself: sections, items, seed "done" state
- `app.js` — rendering, filtering, and localStorage logic
- `assets/HERO_IMAGE_PROMPT.md` — prompt for the hero background image
- `assets/apple-touch-icon.png`, `assets/og-image.jpg` — home-screen icon and link-preview image
- `manifest.json` — web app manifest for the iOS home-screen install
- `sw.js` — service worker; keeps the home-screen install from showing stale code (see below)
- `.github/workflows/deploy.yml` — builds and deploys to GitHub Pages on every push, stamping the build-number footer

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploying

Push to `main` and [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys to GitHub Pages automatically — no separate step. GitHub Pages is configured to deploy from that workflow (Settings → Pages → Source: "GitHub Actions"), not by serving the branch directly, since the workflow needs to stamp the build number in before publishing. Usually live within a minute or two of the push; check the Actions tab for progress or failures.
