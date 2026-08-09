import { SUMI_WORDMARK } from "./sumi-wordmark.ts";

// One full "write, hold, erase, pause" loop of the wordmark, in ms.
export const CYCLE_MS = 7000;
// The last stroke (the "i" dot) touches down ~6.1s in; the whole word then
// holds fully drawn until the unified erase begins.
export const ERASE_START_MS = 6300;
export const INK_FADE_MS = 140;
export const ERASE_FADE_MS = 500;
// Ghost underlay — the full letter shape at low opacity, so the word is
// readable while the ink is mid-stroke (and as a static fallback).
export const GHOST_OPACITY = 0.14;

const pct = (ms: number) => (ms / CYCLE_MS) * 100;
const round = (n: number) => Math.round(n * 1000) / 1000;

function strokeKeyframes(i: number, start: number, dur: number) {
  const drawStart = round(pct(start * 1000));
  const drawEnd = round(pct((start + dur) * 1000));
  const inkIn = round(Math.min(drawStart + pct(INK_FADE_MS), drawEnd));
  const eraseFrom = round(Math.max(pct(ERASE_START_MS), drawEnd + pct(100)));
  const eraseTo = round(Math.min(eraseFrom + pct(ERASE_FADE_MS), 100 - pct(100)));
  const kf = (off: number, opacity: number, dash: number, timing = "") =>
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

const timings: ReadonlyArray<readonly [number, number]> = [
  ...SUMI_WORDMARK.chains.map((c) => [c.start, c.dur] as const),
  [SUMI_WORDMARK.dotStart, SUMI_WORDMARK.dotDur] as const,
];

/** Number of animated ink strokes (chains + the i-dot). */
export const WORDMARK_INK_COUNT = timings.length;

/**
 * Self-contained CSS for the handwriting loop: per-stroke keyframes plus a
 * reduced-motion fallback. The wordmark rests fully drawn and static; the
 * write → hold → erase loop only runs while the pointer hovers it, so the
 * header never animates on its own. Shared by the React logo component and
 * the standalone SVG exporter so the two can never drift apart.
 */
export const WORDMARK_ANIM_CSS = `.sumi-ink{fill:none;stroke:currentColor;stroke-width:${SUMI_WORDMARK.coverWidth};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:0;opacity:1}
${timings
  .map((_, i) => `.sumi-wordmark:hover .sumi-ink-${i}{animation:sumi-ink-${i} ${CYCLE_MS}ms linear infinite}`)
  .join("\n")}
${timings.map(([start, dur], i) => strokeKeyframes(i, start, dur)).join("\n")}
@media (prefers-reduced-motion:reduce){.sumi-ink{animation:none;stroke-dashoffset:0;opacity:1}}
`;
