"use client";

import { useId } from "react";

import { SUMI_WORDMARK } from "@/lib/sumi-wordmark";

type Props = {
  className?: string;
};

/**
 * Handwritten "Sumi" wordmark built from the Alex Brush skeleton. The word is
 * split into stroke segments (chains); each chain reveals along its own path
 * with a staggered delay, so hovering re-“writes” the word left → right in
 * one connected pen line (S → u → m → i). The dot of the "i" is a separate
 * short stroke that touches down last, like a brush lifting off.
 *
 * The full letter shape is used as a mask over the centerline strokes so the
 * ink stays inside the glyphs (counters stay holes).
 */
export function SumiLogo({ className = "" }: Props) {
  const maskId = useId();
  const { viewBox, coverWidth, dot, dotDur, dotStart, fill, chains } =
    SUMI_WORDMARK;

  return (
    <svg
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      fill="none"
      aria-hidden
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
            style={
              {
                "--sw-start": `${chain.start}s`,
                "--sw-dur": `${chain.dur}s`,
              } as React.CSSProperties
            }
          />
        ))}
        {/* i dot — touches down after the word is written */}
        <path
          d={dot}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={coverWidth}
          strokeLinecap="round"
          style={
            {
              "--sw-start": `${dotStart}s`,
              "--sw-dur": `${dotDur}s`,
            } as React.CSSProperties
          }
        />
      </g>
    </svg>
  );
}
