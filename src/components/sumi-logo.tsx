"use client";

import { useId, useRef } from "react";

import { GHOST_OPACITY, WORDMARK_ANIM_CSS } from "@/lib/sumi-wordmark-anim";
import { SUMI_WORDMARK } from "@/lib/sumi-wordmark";

type Props = {
  className?: string;
};

/**
 * Handwritten "Sumi" wordmark built from the Alex Brush skeleton. The word is
 * split into stroke segments (chains); each chain reveals along its own path
 * with a staggered delay, so the word writes itself left → right in one
 * connected pen line (S → u → m → i), holds, then un-writes — antfu-style
 * stroke-dashoffset animation. The loop is pure CSS (per-stroke keyframes,
 * shared with the standalone SVG exports), so it runs on mount everywhere —
 * no JS animation API required. Hovering replays the signature instantly.
 * Reduced motion keeps the wordmark fully drawn and static.
 *
 * The full letter shape is used as a mask over the centerline strokes so the
 * ink stays inside the glyphs (counters stay holes).
 */
export function SumiLogo({ className = "" }: Props) {
  const maskId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const { viewBox, coverWidth, dot, fill, chains } = SUMI_WORDMARK;

  // Restart the CSS loop from the first pen stroke on hover. Toggling the
  // animation off and on (with a forced reflow in between) is done inside one
  // synchronous task, so the blank "paused" frame never paints.
  const replay = () => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.add("sumi-replay");
    void svg.getBoundingClientRect();
    svg.classList.remove("sumi-replay");
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      fill="none"
      aria-hidden
      onMouseEnter={replay}
      className={`sumi-wordmark ${className}`}
    >
      <style>{WORDMARK_ANIM_CSS}</style>
      <defs>
        <mask id={maskId}>
          <path d={fill} fill="white" fillRule="evenodd" />
        </mask>
      </defs>
      {/* Ghost underlay keeps the signature legible while the ink draws */}
      <path
        d={fill}
        fill="currentColor"
        fillRule="evenodd"
        opacity={GHOST_OPACITY}
        className="sumi-wordmark-ghost"
      />
      <g mask={`url(#${maskId})`}>
        {chains.map((chain, i) => (
          <path
            key={i}
            d={chain.d}
            pathLength={1}
            stroke="currentColor"
            strokeWidth={coverWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`sumi-ink sumi-ink-${i}`}
          />
        ))}
        {/* i dot — touches down after the word is written */}
        <path
          d={dot}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={coverWidth}
          strokeLinecap="round"
          className={`sumi-ink sumi-ink-${chains.length}`}
        />
      </g>
    </svg>
  );
}
