// Regenerates the standalone static wordmark SVGs in public/ from the same
// generated skeleton used by the animated component (src/components/sumi-logo.tsx).
// Run: node --experimental-strip-types scripts/sumi-wordmark/export-static.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SUMI_WORDMARK } from "../../src/lib/sumi-wordmark.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../public");

function buildSvg(color) {
  const { viewBox, coverWidth, dot, chains, fill } = SUMI_WORDMARK;
  const [w, h] = viewBox;
  const ink = chains
    .map(
      (c) =>
        `<path d="${c.d}" stroke="currentColor" stroke-width="${coverWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" style="color:${color}">
  <defs>
    <mask id="ink"><path d="${fill}" fill="white" fill-rule="evenodd"/></mask>
  </defs>
  <path d="${fill}" fill="currentColor" fill-rule="evenodd" opacity="0.14"/>
  <g mask="url(#ink)">
  ${ink}
  <path d="${dot}" stroke="currentColor" stroke-width="${coverWidth}" stroke-linecap="round"/>
  </g>
</svg>
`;
}

// Light-background wordmark (site light theme ink).
writeFileSync(resolve(outDir, "sumi-wordmark.svg"), buildSvg("#1e1b16"));
// Dark-background wordmark (site dark theme ink).
writeFileSync(resolve(outDir, "sumi-wordmark-on-dark.svg"), buildSvg("#ece5d8"));
console.log("wrote public/sumi-wordmark.svg and public/sumi-wordmark-on-dark.svg");
