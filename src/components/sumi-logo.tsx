"use client";

import { useEffect, useId, useRef } from "react";

import { SUMI_WORDMARK } from "@/lib/sumi-wordmark";

type Props = {
  className?: string;
};

// One full "write, hold, erase, pause" loop of the wordmark, in ms.
const CYCLE_MS = 7000;
const HOLD_END_MS = 4300;
const ERASE_END_MS = 5600;

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
    const paths = svg.querySelectorAll("path");
    const timings: ReadonlyArray<readonly [number, number]> = [
      ...chains.map((c) => [c.start, c.dur] as const),
      [dotStart, dotDur] as const,
    ];
    animsRef.current = Array.from(paths).map((path, i) => {
      const [start, dur] = timings[i] ?? [0, 0.3];
      const drawStart = (start * 1000) / CYCLE_MS;
      const drawEnd = ((start + dur) * 1000) / CYCLE_MS;
      const holdEnd = HOLD_END_MS / CYCLE_MS;
      const eraseEnd = ERASE_END_MS / CYCLE_MS;
      return path.animate(
        [
          { strokeDashoffset: 1, offset: 0 },
          { strokeDashoffset: 1, offset: drawStart },
          { strokeDashoffset: 0, offset: drawEnd, easing: "ease-out" },
          { strokeDashoffset: 0, offset: holdEnd, easing: "linear" },
          { strokeDashoffset: 1, offset: eraseEnd, easing: "ease-in-out" },
          { strokeDashoffset: 1, offset: 1 },
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
