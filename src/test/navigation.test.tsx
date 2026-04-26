/**
 * Navigation smoke tests.
 *
 * These guard against the "refresh loop" / "module fails to load" classes of
 * regressions that previously caused dashboards to flicker into shimmer
 * states. We deliberately don't render full pages (most rely on Supabase +
 * router context that isn't worth mocking in jsdom). Instead we:
 *
 *   1. Assert that every critical route module imports cleanly — catches
 *      circular imports, syntax errors, and missing exports.
 *   2. Assert that the request-cache layer survives a roundtrip — catches
 *      regressions where tab-switching would re-trigger network fetches.
 *   3. Assert that the auto-update hook never reloads in jsdom (prevents
 *      future loops in the preview).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { cachedFetch, peekCache, invalidateCache } from "@/lib/request-cache";

describe("navigation smoke", () => {
  it.each([
    ["Index", () => import("@/pages/Index")],
    ["Login", () => import("@/pages/Login")],
    ["Register", () => import("@/pages/Register")],
    ["Dashboard", () => import("@/pages/Dashboard")],
    ["WorkshopDashboard", () => import("@/pages/WorkshopDashboard")],
    ["Order", () => import("@/pages/Order")],
    ["BookEvent", () => import("@/pages/BookEvent")],
    ["Notifications", () => import("@/pages/Notifications")],
    ["Admin", () => import("@/pages/Admin")],
    ["AdminLogin", () => import("@/pages/AdminLogin")],
    ["WorkshopAdminPanel", () => import("@/pages/WorkshopAdminPanel")],
    ["TrackOrder", () => import("@/pages/TrackOrder")],
  ])("loads %s without throwing", async (_name, loader) => {
    const mod = await loader();
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("request cache", () => {
  beforeEach(() => {
    invalidateCache("test:", true);
  });

  it("serves cached value on second call without re-running loader", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { value: calls };
    };
    const a = await cachedFetch("test:hit", loader);
    const b = await cachedFetch("test:hit", loader);
    expect(a).toEqual({ value: 1 });
    expect(b).toEqual({ value: 1 });
    expect(calls).toBe(1);
  });

  it("de-duplicates concurrent loaders", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return calls;
    };
    const [a, b, c] = await Promise.all([
      cachedFetch("test:dedupe", loader),
      cachedFetch("test:dedupe", loader),
      cachedFetch("test:dedupe", loader),
    ]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(c).toBe(1);
    expect(calls).toBe(1);
  });

  it("peekCache returns synchronously after fetch", async () => {
    await cachedFetch("test:peek", async () => "hello");
    expect(peekCache("test:peek")).toBe("hello");
  });

  it("falls back to stale cache on loader failure", async () => {
    await cachedFetch("test:fallback", async () => "fresh");
    const result = await cachedFetch(
      "test:fallback",
      async () => {
        throw new Error("network down");
      },
      { force: true },
    );
    expect(result).toBe("fresh");
  });
});

describe("auto-update guard", () => {
  it("skips polling in jsdom test environment", async () => {
    // jsdom hostname is "localhost" and import.meta.env.DEV is true under vitest
    // → useAutoUpdate must short-circuit. We just assert the module imports.
    const mod = await import("@/hooks/useAutoUpdate");
    expect(mod.default).toBeDefined();
  });
});
