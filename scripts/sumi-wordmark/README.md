# Sumi wordmark generation pipeline

Recreates the handwritten, animated **Sumi** wordmark data used by the site
header logo (`src/lib/sumi-wordmark.ts`).

## How it works

The wordmark is rendered from **Alex Brush**, a connected script font: the
`s + u + m + i + dot` glyphs already overlap in absolute word space, so the
pipeline treats the whole word as one continuous pen stroke.

1. `manifest.json` — the source input: Alex Brush "sumi" glyph outlines
   (per-glyph SVG `d` paths extracted with `fontTools`, one entry per glyph).
2. `centerline.py` — rasterizes the glyphs (even-odd fill so counters stay
   holes), skeletonizes the union, contracts the skeleton into chains, then
   traces an Eulerian pen trail through the junctions. Writes `centerline.json`
   with the word's stroke path(s), the filled mask path, and the cover stroke
   width.
3. `export_chains.py` — splits the skeleton into ordered stroke chains for the
   stagger dash-reveal: each chain is a clean stroke segment between junctions,
   oriented left-to-right and sorted by start `x`, RDP-simplified and
   Catmull-Rom smoothed. The `i`-dot is its own tiny component, so it is
   dropped here and rendered separately as the final pen lift. Writes
   `chains.json`.

## Reproduce

```bash
python centerline.py && python export_chains.py
```

Dependencies: `numpy`, `scikit-image`, `networkx` (plus `fontTools` if you need
to regenerate `manifest.json` from the font file). Python 3.10+.

The two JSON files are generated artifacts — do not commit them; they are
rebuilt by the commands above (`.gitignore` already excludes them).

## Mapping to `src/lib/sumi-wordmark.ts`

| TS field            | Source                                                  |
| ------------------- | ------------------------------------------------------- |
| `chains[].d`        | `chains.json` → `chains[].d` (exact match, all 30)      |
| `dot`               | `centerline.json` → `paths[1].d` (the `i`-dot stroke)   |
| `fill`              | `manifest.json` glyph `d`s joined (also in `chains.json`) |
| `viewBox`           | `chains.json` → `viewBox`                               |
| `coverWidth`        | `chains.json` → `coverWidth`                            |
| `chains[].start`    | manually tuned rhythm, not in `chains.json`             |
| `chains[].dur`      | manually tuned rhythm, not in `chains.json`             |
| `dotStart` / `dotDur` | manually tuned rhythm, not in `chains.json`           |

`start`/`dur` values stagger the dash-reveal so the word writes itself
left → right (`S → u → m → i`); tweak them in the TS file, never in the
generated JSON.

## Standalone SVG exports

`export-static.mjs` compiles the same skeleton into four standalone SVGs in
`public/`, so the wordmark can be used outside React (README, docs, embeds):

- `sumi-wordmark.svg` / `sumi-wordmark-on-dark.svg` — static ink, light/dark.
- `sumi-wordmark-animated.svg` / `sumi-wordmark-animated-on-dark.svg` —
  self-contained 7s handwriting loop (per-stroke CSS `@keyframes`, no JS);
  honors `prefers-reduced-motion` with a fully drawn fallback.

Regenerate them with:

```bash
node --experimental-strip-types scripts/sumi-wordmark/export-static.mjs
```

The animation timeline constants (`CYCLE_MS`, `ERASE_START_MS`,
`INK_FADE_MS`, `ERASE_FADE_MS`, `GHOST_OPACITY`) mirror the component in
`src/components/sumi-logo.tsx` — keep them in sync when tuning the rhythm.
