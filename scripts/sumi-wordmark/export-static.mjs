// Regenerates the standalone wordmark SVGs in public/ from the same generated
// skeleton used by the animated component (src/components/sumi-logo.tsx).
// Emits both static exports and a self-contained animated SVG (the handwriting
// stroke timeline is compiled into per-stroke CSS @keyframes, 7s loop).
// Run: node --experimental-strip-types scripts/sumi-wordmark/export-static.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  GHOST_OPACITY,
  WORDMARK_ANIM_CSS,
} from "../../src/lib/sumi-wordmark-anim.ts";
import { SUMI_WORDMARK } from "../../src/lib/sumi-wordmark.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../public");

function buildSvg(color, animated) {
  const { viewBox, coverWidth, dot, chains, fill } = SUMI_WORDMARK;
  const [w, h] = viewBox;
  const ink = animated
    ? [...chains.map((c) => c.d), dot]
        .map(
          (d, i) =>
            `<path class="sumi-ink sumi-ink-${i}" pathLength="1" d="${d}"/>`,
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
    ? `<style>\n${WORDMARK_ANIM_CSS}\n</style>\n`
    : "";
  const cls = animated ? ' class="sumi-wordmark"' : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"${cls} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" style="color:${color}">
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
