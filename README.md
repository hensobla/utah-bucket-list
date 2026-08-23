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

## Design

Look and feel is adapted from [altergresources.com](https://altergresources.com/): white ground, hairline pale-blue-gray borders, soft rounded corners, big two-weight headlines (light + bold in the same line), and color used sparingly — one accent per season instead of a full palette. Type is [Manrope](https://fonts.google.com/specimen/Manrope).

Motion follows the rules in [emilkowalski/skills](https://github.com/emilkowalski/skills) (`animate` + `review-animations`): named easing tokens (`--ease-out`, `--ease-in-out`) instead of hand-rolled curves, `transform`/`opacity` only (the section accordions are the one sanctioned exception — animating `grid-template-rows` is the skill's documented technique for reveal-to-auto-height, since there's no transform equivalent), transitions rather than keyframes for anything rapidly-triggered, hover motion gated behind `(hover: hover) and (pointer: fine)` so touch doesn't fire false hovers, everything under 300ms, and a `prefers-reduced-motion` fallback.

### Hero image

The band under the headline is a CSS `background-image` pointing at `assets/hero.jpg`. If that file is ever removed, the band falls back to a solid ink fill rather than a broken image. To regenerate it, see [`assets/HERO_IMAGE_PROMPT.md`](assets/HERO_IMAGE_PROMPT.md) for the prompt and specs.

## Source content

[`utah_bucket_list_updated.md`](utah_bucket_list_updated.md) is the original research doc this site was built from. Update `data.js` to change items, sections, or dates.

## Files

- `index.html` — page structure
- `styles.css` — all styling
- `data.js` — the list itself: sections, items, seed "done" state
- `app.js` — rendering, filtering, and localStorage logic
- `assets/HERO_IMAGE_PROMPT.md` — prompt for the hero background image

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploying

This repo is set up for GitHub Pages, serving from the `main` branch root. Push to `main` and the live site updates automatically within a minute or two.
