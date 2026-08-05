import { afterEach, describe, expect, test, vi } from "vitest";
import { MAX_SESSIONS, SESSION_TTL_MS, drop, makeCapacity, registry, touch } from "./session-registry";
import type { TrackedSession } from "./session-registry";

function fakeSession(activeAt = Date.now()): TrackedSession {
  return { lastActiveAt: activeAt, close: vi.fn() };
}

function fillToCap(now: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < MAX_SESSIONS; i++) {
    const id = `s${i}`;
    registry.set(id, fakeSession(now - i * 1000));
    ids.push(id);
  }
  return ids;
}

afterEach(() => registry.clear());

describe("touch", () => {
  test("updates lastActiveAt and returns the value for later reads", () => {
    const id = "a";
    registry.set(id, fakeSession(0));
    touch(id, 12345);
    expect(registry.get(id)!.lastActiveAt).toBe(12345);
  });

  test("is a no-op for unknown ids", () => {
    expect(() => touch("nope", 1)).not.toThrow();
  });
});

describe("drop", () => {
  test("closes the session once and removes it", () => {
    const s = fakeSession();
    registry.set("a", s);
    drop("a");
    drop("a");
    expect(s.close).toHaveBeenCalledTimes(1);
    expect(registry.has("a")).toBe(false);
  });
});

describe("makeCapacity — TTL sweep", () => {
  test("removes sessions idle longer than SESSION_TTL_MS", () => {
    const now = 1_000_000;
    registry.set("stale", fakeSession(now - SESSION_TTL_MS - 1));
    registry.set("fresh", fakeSession(now - 1000));
    makeCapacity(now);
    expect(registry.has("stale")).toBe(false);
    expect(registry.has("fresh")).toBe(true);
  });

  test("keeps sessions idle exactly at the TTL boundary", () => {
    const now = 1_000_000;
    registry.set("boundary", fakeSession(now - SESSION_TTL_MS));
    makeCapacity(now);
    expect(registry.has("boundary")).toBe(true);
  });
});

describe("makeCapacity — cap eviction", () => {
  test("does nothing when under the cap", () => {
    registry.set("a", fakeSession(0));
    makeCapacity(1_000_000);
    expect(registry.has("a")).toBe(true);
  });

  test("evicts the oldest-idle sessions when at the cap, keeping the freshest", () => {
    const now = 1_000_000;
    const ids = fillToCap(now); // s0 newest (now), s{MAX-1} oldest
    makeCapacity(now);
    // Every session is fresh (< TTL), so one overflow must be evicted to
    // leave room for a new session: the oldest (sMAX-1).
    expect(registry.has("s0")).toBe(true);
    expect(registry.has(`s${MAX_SESSIONS - 1}`)).toBe(false);
    expect(registry.size).toBe(MAX_SESSIONS - 1);
    expect(ids.length).toBe(MAX_SESSIONS);
  });

  test("a touched session is treated as fresh and survives eviction", () => {
    const now = 1_000_000;
    const ids = fillToCap(now);
    const revived = ids[ids.length - 1]; // the oldest
    touch(revived, now);
    makeCapacity(now);
    expect(registry.has(revived)).toBe(true);
    // Now the second-oldest is evicted instead.
    expect(registry.has(`s${MAX_SESSIONS - 2}`)).toBe(false);
  });
});
