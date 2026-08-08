"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";

export function ProjectGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => {
        if (cur === null) return cur;
        return (cur + dir + images.length) % images.length;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, step]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className="group overflow-hidden rounded-card border border-line bg-paper-raised transition-colors hover:border-seal"
            aria-label={`View ${title} image ${i + 1}`}
          >
            <img
              src={src}
              alt={`${title} image ${i + 1}`}
              width={800}
              height={600}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-short)] motion-reduce:transition-none group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      {active !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/[0.88] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image ${active + 1} of ${images.length}`}
          onClick={close}
        >
          <img
            src={images[active]}
            alt={`${title} image ${active + 1}`}
            width={1600}
            height={1200}
            className="max-h-[82dvh] max-w-full rounded-card border border-line-strong object-contain shadow-card"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close gallery"
            className="absolute right-4 top-4 rounded-full border border-white/20 p-2 text-white transition-colors hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white transition-colors hover:bg-white/10"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white transition-colors hover:bg-white/10"
              >
                <ArrowRight size={18} weight="bold" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                {active + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
