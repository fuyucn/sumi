import { expect, test } from "vitest";
import { rankRows, scorePost, type RankablePost } from "./search-rank";

const mk = (over: Partial<RankablePost> & { title: string }): RankablePost => ({
  tags: [],
  ...over,
});

test("scorePost weighs title over tags over excerpt over body", () => {
  const base: RankablePost = mk({ title: "x", body: "x", excerpt: "x", tags: ["x"] });
  const titleOnly: RankablePost = mk({ title: "needle", body: "zzz" });
  const tagOnly: RankablePost = mk({ title: "zzz", tags: ["needle"] });
  const excerptOnly: RankablePost = mk({ title: "zzz", excerpt: "needle" });
  const bodyOnly: RankablePost = mk({ title: "zzz", body: "needle" });
  expect(scorePost(titleOnly, "needle")).toBeGreaterThan(scorePost(tagOnly, "needle"));
  expect(scorePost(tagOnly, "needle")).toBeGreaterThan(scorePost(excerptOnly, "needle"));
  expect(scorePost(excerptOnly, "needle")).toBeGreaterThan(scorePost(bodyOnly, "needle"));
  expect(scorePost(base, "nope")).toBe(0);
  expect(scorePost({ ...mk({ title: "needle" }) }, "needle")).toBe(8);
});

test("rankRows orders by relevance, then recency, and drops zero-score rows", () => {
  const bodyHit = { row: { id: "b", title: "zzz", body: "ramen", publishedAt: "2026-06-12T00:00:00Z" }, rank: mk({ title: "zzz", body: "ramen", publishedAt: "2026-06-12T00:00:00Z" }) };
  const titleHitNewer = { row: { id: "t1", title: "ramen guide", publishedAt: "2026-06-10T00:00:00Z" }, rank: mk({ title: "ramen guide", publishedAt: "2026-06-10T00:00:00Z" }) };
  const titleHitOlder = { row: { id: "t2", title: "ramen", publishedAt: "2026-06-01T00:00:00Z" }, rank: mk({ title: "ramen", publishedAt: "2026-06-01T00:00:00Z" }) };
  const noHit = { row: { id: "n", title: "cooking" }, rank: mk({ title: "cooking" }) };
  const out = rankRows([noHit, bodyHit, titleHitNewer, titleHitOlder], "ramen");
  expect(out.map((x) => x.row.id)).toEqual(["t2", "t1", "b"]);
});

test("rankRows is case-insensitive", () => {
  const a = { row: { id: "a" }, rank: mk({ title: "RAmen" }) };
  const b = { row: { id: "b" }, rank: mk({ title: "zzz", body: "ramen" }) };
  const out = rankRows([b, a], "RaMeN");
  expect(out.map((x) => x.row.id)).toEqual(["a", "b"]);
});
