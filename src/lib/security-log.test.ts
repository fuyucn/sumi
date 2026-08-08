import { expect, test, vi } from "vitest";
import { clientIpFromRequest, logSecurityEvent } from "./security-log";

test("clientIpFromRequest prefers x-forwarded-for first hop", () => {
  const req = new Request("http://localhost/", {
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.2" },
  });
  expect(clientIpFromRequest(req)).toBe("203.0.113.7");
});

test("clientIpFromRequest falls back to x-real-ip and cf-connecting-ip", () => {
  const req1 = new Request("http://localhost/", { headers: { "x-real-ip": "198.51.100.4" } });
  expect(clientIpFromRequest(req1)).toBe("198.51.100.4");
  const req2 = new Request("http://localhost/", { headers: { "cf-connecting-ip": "192.0.2.9" } });
  expect(clientIpFromRequest(req2)).toBe("192.0.2.9");
  expect(clientIpFromRequest(null)).toBeNull();
  expect(clientIpFromRequest(new Request("http://localhost/"))).toBeNull();
});

test("logSecurityEvent emits a greppable audit line for denied logins", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    logSecurityEvent({ event: "login-denied", login: "mallory", ip: "203.0.113.7", path: "/api/auth/sign-in/social" });
    expect(warn).toHaveBeenCalledOnce();
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("[security]");
    expect(line).toContain("event=login-denied");
    expect(line).toContain("login=\"mallory\"");
    expect(line).toContain("ip=\"203.0.113.7\"");
  } finally {
    warn.mockRestore();
  }
});

test("logSecurityEvent omits missing fields", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    logSecurityEvent({ event: "auth-rate-limited", ip: null, path: null });
    const line = String(warn.mock.calls[0][0]);
    expect(line).toBe("[security] event=auth-rate-limited");
  } finally {
    warn.mockRestore();
  }
});
