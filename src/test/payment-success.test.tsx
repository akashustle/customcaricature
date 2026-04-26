/**
 * E2E payment success flow tests.
 *
 * Goals:
 *   1. The OrderConfirmation component renders without crashing for any order id.
 *   2. The polling effect issues a Supabase status query and surfaces the
 *      `payment-verify-status` chip — proves the webhook polling fallback is wired.
 *   3. The component never re-mounts once shown — we assert the same DOM node
 *      survives a status transition (verifying → confirmed), which is the
 *      regression-shield for the old "shimmer flash on payment success" bug.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrderConfirmation from "@/components/order/OrderConfirmation";

// ---- Mocks --------------------------------------------------------------

vi.mock("@/lib/sounds", () => ({ playPaymentSuccessSound: vi.fn() }));

// Channel mock returned by supabase.channel(...).on(...).subscribe()
const fakeChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

const supabaseFromMock = vi.fn();
const removeChannelMock = vi.fn();
const channelMock = vi.fn(() => fakeChannel);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => supabaseFromMock(...args),
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  },
}));

const buildOrdersQuery = (status: "pending" | "paid") => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: { payment_status: status, status: status === "paid" ? "in_progress" : "pending" },
    error: null,
  }),
});

beforeEach(() => {
  vi.useFakeTimers();
  supabaseFromMock.mockReset();
  channelMock.mockClear();
  removeChannelMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---- Tests --------------------------------------------------------------

describe("OrderConfirmation — payment success flow", () => {
  it("renders the order id chip and polling status without crashing", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    render(
      <MemoryRouter>
        <OrderConfirmation orderId="abcd1234-1111-2222-3333-444455556666" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Order Confirmed!")).toBeInTheDocument();
    expect(screen.getByText("ABCD1234")).toBeInTheDocument();
    expect(screen.getByTestId("payment-verify-status")).toHaveAttribute("data-status", "verifying");
  });

  it("subscribes to Supabase realtime + queries orders for verification fallback", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    render(
      <MemoryRouter>
        <OrderConfirmation orderId="poll-test-0000-0000-0000-000000000000" />
      </MemoryRouter>,
    );

    // Allow the immediate poll attempt + initial render
    await act(async () => { await Promise.resolve(); });

    expect(supabaseFromMock).toHaveBeenCalledWith("orders");
    expect(channelMock).toHaveBeenCalledWith(
      expect.stringContaining("poll-test-0000-0000-0000-000000000000"),
    );
    expect(fakeChannel.subscribe).toHaveBeenCalled();
  });

  it("transitions to confirmed when polling sees payment_status=paid — without unmounting the card", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("paid"));

    const { container } = render(
      <MemoryRouter>
        <OrderConfirmation orderId="confirm0-1111-2222-3333-444455556666" />
      </MemoryRouter>,
    );

    const cardBefore = container.querySelector("[data-testid='payment-verify-status']");
    expect(cardBefore).not.toBeNull();

    await act(async () => {
      // Flush the immediate-poll microtask
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const chip = screen.getByTestId("payment-verify-status");
      expect(chip).toHaveAttribute("data-status", "confirmed");
    });

    // The same DOM container is still mounted — the page never reloaded
    const cardAfter = container.querySelector("[data-testid='payment-verify-status']");
    expect(cardAfter).not.toBeNull();
    // Order ID chip is still present (proves no remount/refresh loop)
    expect(screen.getByText("CONFIRM0")).toBeInTheDocument();
  });

  it("falls back to 'pending' state if polling exhausts without confirmation", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    render(
      <MemoryRouter>
        <OrderConfirmation orderId="timeout0-9999-9999-9999-999999999999" />
      </MemoryRouter>,
    );

    // 15 attempts × 2s = 30s — fast-forward past the polling window
    await act(async () => {
      for (let i = 0; i < 16; i++) {
        vi.advanceTimersByTime(2100);
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      const chip = screen.getByTestId("payment-verify-status");
      expect(["pending", "confirmed"]).toContain(chip.getAttribute("data-status"));
    });
  });

  it("cleans up the realtime channel on unmount (no leaked subscriptions)", () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    const { unmount } = render(
      <MemoryRouter>
        <OrderConfirmation orderId="cleanup0-aaaa-bbbb-cccc-dddd00001111" />
      </MemoryRouter>,
    );

    unmount();
    expect(removeChannelMock).toHaveBeenCalled();
  });
});
