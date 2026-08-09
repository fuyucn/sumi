// Regenerates the standalone wordmark SVGs in public/ from the same generated
// skeleton used by the animated component (src/components/sumi-logo.tsx).
// Emits both static exports and a self-contained animated SVG (the handwriting
// stroke timeline is compiled into per-stroke CSS @keyframes, 7s loop).
// Run: node --experimental-strip-types scripts/sumi-wordmark/export-static.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SUMI_WORDMARK } from "../../src/lib/sumi-wordmark.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../public");

// Mirrors the timeline in src/components/sumi-logo.tsx.
const CYCLE_MS = 7000;
const ERASE_START_MS = 6300;
const INK_FADE_MS = 140;
const ERASE_FADE_MS = 500;
const GHOST_OPACITY = 0.14;

const pct = (ms) => (ms / CYCLE_MS) * 100;
const round = (n) => Math.round(n * 1000) / 1000;

function strokeKeyframes(i, start, dur) {
  const drawStart = round(pct(start * 1000));
  const drawEnd = round(pct((start + dur) * 1000));
  const inkIn = round(Math.min(drawStart + pct(INK_FADE_MS), drawEnd));
  const eraseFrom = round(Math.max(pct(ERASE_START_MS), drawEnd + pct(100)));
  const eraseTo = round(Math.min(eraseFrom + pct(ERASE_FADE_MS), 100 - pct(100)));
  const kf = (off, opacity, dash, timing = "") =>
    `${off}%{stroke-dashoffset:${dash};opacity:${opacity}${timing ? `;animation-timing-function:${timing}` : ""}}`;
  return [
    `@keyframes sumi-ink-${i}{`,
    kf(0, 0, 1),
    kf(drawStart, 0, 1),
    kf(inkIn, 1, 1, "ease-out"),
    kf(drawEnd, 1, 0, "ease-out"),
    kf(eraseFrom, 1, 0),
    kf(eraseTo, 0, 1, "ease-in-out"),
    kf(100, 0, 1),
    "}",
  ].join("");
}

function buildSvg(color, animated) {
  const { viewBox, coverWidth, dot, chains, fill } = SUMI_WORDMARK;
  const [w, h] = viewBox;
  const timings = [
    ...chains.map((c) => [c.start, c.dur]),
    [SUMI_WORDMARK.dotStart, SUMI_WORDMARK.dotDur],
  ];
  const ink = animated
    ? timings
        .map(
          (_, i) =>
            `<path class="sumi-ink sumi-ink-${i}" pathLength="1" d="${i < chains.length ? chains[i].d : dot}"/>`,
        )
        .join("\n  ")
    : [
        ...chains.map(
          (c) =>
            `<path d="${c.d}" stroke="currentColor" stroke-width="${coverWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
        ),
        `<path d="${dot}" stroke="currentColor" stroke-width="${coverWidth}" stroke-linecap="round"/>`,
      ].join("\n  ");
  const extra = animated
    ? `<style>
  .sumi-ink{fill:none;stroke:currentColor;stroke-width:${coverWidth};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
  ${timings.map((_, i) => `.sumi-ink-${i}{animation:sumi-ink-${i} ${CYCLE_MS}ms linear infinite}`).join("\n  ")}
  ${timings.map(([start, dur], i) => strokeKeyframes(i, start, dur)).join("\n  ")}
  @media (prefers-reduced-motion:reduce){.sumi-ink{animation:none;stroke-dashoffset:0;opacity:1}}
</style>
`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" style="color:${color}">
  ${extra}
  <defs>
    <mask id="ink"><path d="${fill}" fill="white" fill-rule="evenodd"/></mask>
  </defs>
  <path d="${fill}" fill="currentColor" fill-rule="evenodd" opacity="${GHOST_OPACITY}"/>
  <g mask="url(#ink)">
  ${ink}
  </g>
</svg>
`;
}

// Light-background wordmark (site light theme ink).
writeFileSync(resolve(outDir, "sumi-wordmark.svg"), buildSvg("#1e1b16", false));
// Dark-background wordmark (site dark theme ink).
writeFileSync(resolve(outDir, "sumi-wordmark-on-dark.svg"), buildSvg("#ece5d8", false));
// Self-contained animated exports (same 7s handwriting loop as the component).
writeFileSync(resolve(outDir, "sumi-wordmark-animated.svg"), buildSvg("#1e1b16", true));
writeFileSync(
  resolve(outDir, "sumi-wordmark-animated-on-dark.svg"),
  buildSvg("#ece5d8", true),
);
console.log(
  "wrote sumi-wordmark.svg, sumi-wordmark-on-dark.svg, sumi-wordmark-animated.svg, sumi-wordmark-animated-on-dark.svg",
);
