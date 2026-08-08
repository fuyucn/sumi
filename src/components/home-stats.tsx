"use client";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";

export function HomeStats({ posts, writers, tags }: { posts: number; writers: number; tags: number }) {
  const stats = [
    { label: "Posts", value: posts },
    { label: "Writers", value: writers },
    { label: "Tags", value: tags },
  ];
  return (
    <Reveal as="section">
      <dl className="mt-14 grid grid-cols-3 divide-x divide-line border-y border-line">
        {stats.map((stat) => (
          <div key={stat.label} className="px-5 py-5 sm:px-8">
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
              {stat.label}
            </dt>
            <dd className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink tabular-nums">
              <CountUp value={stat.value} />
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}
