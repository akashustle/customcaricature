/**
 * Payment retry / webhook-delay scenarios for the polling fallback hook.
 *
 * Simulates:
 *   - Razorpay callback never fires → poller flips status when DB updates
 *   - Webhook arrives mid-poll → poller sees confirmed on next tick
 *   - Stuck pending past timeout → poller resolves paid:false (UI shows
 *     "still verifying" message and reconciler cron picks it up later)
 *   - Each tick fires the reconcile-payments edge function (defence in depth)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingleMock = vi.fn();
const eqMock = vi.fn().mockReturnThis();
const selectMock = vi.fn().mockReturnThis();
const fromMock: any = vi.fn(() => ({
  select: selectMock, eq: eqMock, maybeSingle: maybeSingleMock,
}));
const invokeMock: any = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    functions: { invoke: (...a: any[]) => invokeMock(...a) },
  },
}));

beforeEach(() => {
  maybeSingleMock.mockReset();
  invokeMock.mockClear();
  fromMock.mockClear();
});

describe("pollOrderStatus — webhook delay & retry scenarios", () => {
  it("resolves paid=true the moment the row flips to confirmed", async () => {
    let calls = 0;
    maybeSingleMock.mockImplementation(() => {
      calls++;
      // First poll: still pending. Second poll: webhook landed.
      return Promise.resolve({
        data: { payment_status: calls < 2 ? "pending" : "confirmed" },
        error: null,
      });
    });

    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");
    const result = await pollOrderStatus("orders", "ord-1", { intervalMs: 10, timeoutMs: 500 });

    expect(result.paid).toBe(true);
    expect(result.status).toBe("confirmed");
    // Reconciler was nudged at least once during the wait
    expect(invokeMock).toHaveBeenCalledWith(
      "reconcile-payments",
      expect.objectContaining({
        body: expect.objectContaining({
          source: "client_poll",
          target: { table: "orders", id: "ord-1" },
        }),
      }),
    );
  });

  it("recognises 'paid' for shop_orders and 'fully_paid' for event_bookings", async () => {
    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");

    maybeSingleMock.mockResolvedValue({ data: { payment_status: "paid" }, error: null });
    expect((await pollOrderStatus("shop_orders", "s-1", { intervalMs: 5, timeoutMs: 50 })).paid).toBe(true);

    maybeSingleMock.mockResolvedValue({ data: { payment_status: "fully_paid" }, error: null });
    expect((await pollOrderStatus("event_bookings", "e-1", { intervalMs: 5, timeoutMs: 50 })).paid).toBe(true);
  });

  it("returns paid=false when the row stays pending past the timeout (cron will recover)", async () => {
    maybeSingleMock.mockResolvedValue({ data: { payment_status: "pending" }, error: null });
    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");

    const result = await pollOrderStatus("orders", "stuck-1", { intervalMs: 10, timeoutMs: 50 });

    expect(result.paid).toBe(false);
    expect(result.status).toBe("pending");
    // We must have asked the reconciler at least once — otherwise stuck rows would never recover
    expect(invokeMock).toHaveBeenCalled();
  });

  it("invokes onTick with each observed status (UI can show a verifying spinner)", async () => {
    const statuses = ["pending", "pending", "confirmed"];
    let i = 0;
    maybeSingleMock.mockImplementation(() =>
      Promise.resolve({ data: { payment_status: statuses[Math.min(i++, statuses.length - 1)] }, error: null }),
    );
    const onTick = vi.fn();
    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");

    await pollOrderStatus("orders", "ord-tick", { intervalMs: 5, timeoutMs: 200, onTick });

    expect(onTick).toHaveBeenCalled();
    const seen = onTick.mock.calls.map((c) => c[0]);
    expect(seen.some((s) => s === "pending")).toBe(true);
  });

  it("never re-confirms an already-paid row (idempotent — no extra invokes after success)", async () => {
    maybeSingleMock.mockResolvedValue({ data: { payment_status: "confirmed" }, error: null });
    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");

    const result = await pollOrderStatus("orders", "ord-already-paid", { intervalMs: 5, timeoutMs: 100 });

    expect(result.paid).toBe(true);
    // Returned on the very first poll → no reconcile invoke needed
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("survives transient DB errors (returns null status, keeps polling)", async () => {
    let n = 0;
    maybeSingleMock.mockImplementation(() => {
      n++;
      if (n === 1) return Promise.resolve({ data: null, error: { message: "transient" } });
      return Promise.resolve({ data: { payment_status: "confirmed" }, error: null });
    });

    const { pollOrderStatus } = await import("@/hooks/usePaymentReconciliation");
    const result = await pollOrderStatus("orders", "ord-flaky", { intervalMs: 5, timeoutMs: 200 });
    expect(result.paid).toBe(true);
  });
});
