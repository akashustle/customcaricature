/**
 * E2E referral funnel tests.
 *
 * Verifies the full chain: ?ref=CODE click → register → login → booking → order.
 * All Supabase calls are mocked so the suite runs in CI without network.
 *
 * Each step is asserted independently so a regression in (say) the booking
 * conversion event is isolated to its own failing test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---- Supabase mock ------------------------------------------------------

const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

const buildProfileLookup = (userId: string | null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: userId ? { user_id: userId, auth_user_id: userId } : null,
    error: null,
  }),
});

const buildEventInsert = () => ({ insert: insertMock });

beforeEach(() => {
  insertMock.mockClear();
  fromMock.mockReset();
  sessionStorage.clear();
  localStorage.clear();
  // Default: profiles lookup returns a referrer, referral_events insert succeeds.
  fromMock.mockImplementation((table: string) => {
    if (table === "referral_events") return buildEventInsert();
    return buildProfileLookup("referrer-uuid-123");
  });
  // Reset URL between tests
  window.history.replaceState({}, "", "/");
});

// ---- Tests --------------------------------------------------------------

describe("Referral funnel — end to end", () => {
  it("step 1 (click): captures ?ref=CCC-XXXX from URL and logs a click event once", async () => {
    window.history.replaceState({}, "", "/?ref=CCC-1234");
    const { useReferralTracking } = await import("@/hooks/useReferralTracking");

    renderHook(() => useReferralTracking());

    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    const payload = insertMock.mock.calls[0][0];
    expect(payload.event_type).toBe("click");
    expect(payload.referral_code).toBe("CCC-1234");
    expect(payload.referrer_user_id).toBe("referrer-uuid-123");
    expect(payload.visitor_session_id).toMatch(/^[0-9a-f-]{36}$/);

    // Re-render: must NOT log a duplicate click for the same session+code
    insertMock.mockClear();
    renderHook(() => useReferralTracking());
    await new Promise((r) => setTimeout(r, 20));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("step 2 (register): logReferralEvent('register') tags the new user", async () => {
    sessionStorage.setItem("ccc_ref_code", "CCC-9999");
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("register", { referredUserId: "new-user-1" });
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.event_type).toBe("register");
    expect(payload.referred_user_id).toBe("new-user-1");
  });

  it("step 3 (login): subsequent login on the same browser still attributes to the code", async () => {
    sessionStorage.setItem("ccc_ref_code", "CCC-9999");
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("login", { referredUserId: "new-user-1" });
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0].event_type).toBe("login");
  });

  it("step 4 (booking): event booking conversion logs with metadata", async () => {
    sessionStorage.setItem("ccc_ref_code", "CCC-9999");
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("booking", {
        referredUserId: "new-user-1",
        metadata: { booking_id: "book-1", amount: 30000 },
      });
    });

    const payload = insertMock.mock.calls[0][0];
    expect(payload.event_type).toBe("booking");
    expect(payload.metadata).toEqual({ booking_id: "book-1", amount: 30000 });
  });

  it("step 5 (order): caricature order conversion is recorded", async () => {
    sessionStorage.setItem("ccc_ref_code", "CCC-9999");
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("order", {
        referredUserId: "new-user-1",
        metadata: { order_id: "ord-1", amount: 1499 },
      });
    });

    expect(insertMock.mock.calls[0][0].event_type).toBe("order");
    expect(insertMock.mock.calls[0][0].metadata.order_id).toBe("ord-1");
  });

  it("graceful: events without a stored code are no-ops (no insert, no throw)", async () => {
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("booking", { referredUserId: "u" });
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("workshop codes (WS-XXXX) resolve via workshop_users.auth_user_id", async () => {
    sessionStorage.setItem("ccc_ref_code", "WS-4242");
    const { logReferralEvent } = await import("@/hooks/useReferralTracking");

    await act(async () => {
      await logReferralEvent("click");
    });

    expect(fromMock).toHaveBeenCalledWith("workshop_users");
    expect(insertMock.mock.calls[0][0].referrer_user_id).toBe("referrer-uuid-123");
  });
});
