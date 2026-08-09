"use client";
/* Remote images (R2 / external) keep unknown intrinsic sizes and there is no
   Cloudflare-safe image optimizer, so plain <img> is intentional here. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

interface Props {
  src?: string | Blob;
  alt?: string;
  /** Disable the click-to-zoom lightbox (e.g. small images inside comments). */
  zoomable?: boolean;
}

/**
 * Markdown body image with a click-to-zoom lightbox. The trigger is a plain
 * `<button>` so keyboard users get a real focus target; the overlay reuses the
 * gallery's `lightbox-zoom` entrance and closes on click / Escape. Rendered
 * closed on the server, so SSR output stays stable (no hydration mismatch).
 */
export function MarkdownImage({ src, alt, zoomable = true }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  const image = (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="media-fade my-2 rounded-card border border-line shadow-card transition-[transform,box-shadow] duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:scale-[1.01] group-hover:shadow-card-hover"
    />
  );

  if (!zoomable) return image;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `放大图片：${alt}` : "放大图片"}
        className="group block w-full cursor-zoom-in rounded-card border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {image}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/[0.88] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt ? `放大图片：${alt}` : "放大的图片"}
          onClick={close}
        >
          <img
            src={src}
            alt={alt ?? ""}
            width={1600}
            height={1200}
            className="lightbox-zoom max-h-[82dvh] max-w-full rounded-card border border-line-strong object-contain shadow-card"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={close}
            aria-label="关闭放大图片"
            className="press absolute right-4 top-4 rounded-full border border-white/20 p-2 text-white transition-colors hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      ) : null}
    </>
  );
}
