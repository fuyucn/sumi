"use client";
import { useEffect, useState } from "react";

/** Sticky year rail for the archive page. Tracks the section currently in
 * view with an IntersectionObserver so the cinnabar tick follows reading. */
export function ArchiveRail({
  years,
}: {
  years: { year: string; count: number }[];
}) {
  const [active, setActive] = useState(years[0]?.year ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id.replace(/^y/, ""));
          }
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    for (const { year } of years) {
      const el = document.getElementById(`y${year}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [years]);

  return (
    <aside className="archive-rail" aria-label="Years">
      <span className="rail-label">Archive</span>
      {years.map(({ year, count }) => (
        <a
          key={year}
          href={`#y${year}`}
          aria-current={active === year ? "true" : undefined}
          className={active === year ? "on" : undefined}
        >
          {year} <small>{count} {count === 1 ? "essay" : "essays"}</small>
        </a>
      ))}
    </aside>
  );
}
