"use client";

import { useEffect, useId, useRef } from "react";

import { SUMI_WORDMARK } from "@/lib/sumi-wordmark";

type Props = {
  className?: string;
};

// One full "write, hold, erase, pause" loop of the wordmark, in ms.
const CYCLE_MS = 7000;
// The last stroke (the "i" dot) touches down ~6.1s in; the whole word then
// holds fully drawn until the unified erase begins.
const ERASE_START_MS = 6300;
const INK_FADE_MS = 140;
const ERASE_FADE_MS = 500;
// Ghost underlay — the full letter shape at low opacity, so the word is
// readable while the ink is mid-stroke (and as a static fallback).
const GHOST_OPACITY = 0.14;

/**
 * Handwritten "Sumi" wordmark built from the Alex Brush skeleton. The word is
 * split into stroke segments (chains); each chain reveals along its own path
 * with a staggered delay, so the word writes itself left → right in one
 * connected pen line (S → u → m → i), holds, then un-writes — antfu-style
 * stroke-dashoffset animation driven by the Web Animations API so each chain
 * keeps its own timing. Hovering replays the signature instantly. Reduced
 * motion keeps the wordmark static.
 *
 * The full letter shape is used as a mask over the centerline strokes so the
 * ink stays inside the glyphs (counters stay holes).
 */
export function SumiLogo({ className = "" }: Props) {
  const maskId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const animsRef = useRef<Animation[]>([]);
  const { viewBox, coverWidth, dot, dotDur, dotStart, fill, chains } =
    SUMI_WORDMARK;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // Only the ink strokes animate — the mask fill and ghost underlay are
    // plain fills and must stay outside the stroke timeline.
    const paths = svg.querySelectorAll<SVGPathElement>("[data-sumi-ink] path");
    const timings: ReadonlyArray<readonly [number, number]> = [
      ...chains.map((c) => [c.start, c.dur] as const),
      [dotStart, dotDur] as const,
    ];
    animsRef.current = Array.from(paths).map((path, i) => {
      const [start, dur] = timings[i] ?? [0, 0.3];
      const drawStart = (start * 1000) / CYCLE_MS;
      const drawEnd = ((start + dur) * 1000) / CYCLE_MS;
      const inkIn = Math.min(drawStart + INK_FADE_MS / CYCLE_MS, drawEnd);
      // Paths that finish late (the dot) hold a beat past the unified erase
      // start so no keyframe offset ever regresses.
      const eraseFrom = Math.max(
        ERASE_START_MS / CYCLE_MS,
        drawEnd + 100 / CYCLE_MS,
      );
      const eraseTo = Math.min(
        eraseFrom + ERASE_FADE_MS / CYCLE_MS,
        1 - 100 / CYCLE_MS,
      );
      return path.animate(
        [
          { strokeDashoffset: 1, opacity: 0, offset: 0 },
          { strokeDashoffset: 1, opacity: 0, offset: drawStart },
          { strokeDashoffset: 1, opacity: 1, offset: inkIn, easing: "ease-out" },
          { strokeDashoffset: 0, opacity: 1, offset: drawEnd, easing: "ease-out" },
          { strokeDashoffset: 0, opacity: 1, offset: eraseFrom, easing: "linear" },
          { strokeDashoffset: 1, opacity: 0, offset: eraseTo, easing: "ease-in-out" },
          { strokeDashoffset: 1, opacity: 0, offset: 1 },
        ],
        { duration: CYCLE_MS, iterations: Infinity },
      );
    });
    return () => {
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
    };
  }, [chains, dotDur, dotStart]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      fill="none"
      aria-hidden
      onMouseEnter={() => {
        animsRef.current.forEach((a) => {
          a.play();
          a.currentTime = 0;
        });
      }}
      className={`sumi-wordmark ${className}`}
    >
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
      <g mask={`url(#${maskId})`} data-sumi-ink>
        {chains.map((chain, i) => (
          <path
            key={i}
            d={chain.d}
            pathLength={1}
            stroke="currentColor"
            strokeWidth={coverWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* i dot — touches down after the word is written */}
        <path
          d={dot}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={coverWidth}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
