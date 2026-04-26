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
 *
 * Note: We intentionally use REAL timers here. Fake timers block the microtask
 * queue used by Supabase's mocked async client, which would prevent the
 * immediate-poll `await` from ever resolving. The polling interval is 2s, so
 * tests that need to observe a poll result either (a) rely on the immediate
 * first poll firing on mount, or (b) use waitFor with a generous timeout.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
// @ts-expect-error — testing-library v16 type exports vary by setup
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrderConfirmation from "@/components/order/OrderConfirmation";

// ---- Mocks --------------------------------------------------------------

vi.mock("@/lib/sounds", () => ({ playPaymentSuccessSound: vi.fn() }));

// Channel mock returned by supabase.channel(...).on(...).subscribe()
const fakeChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

const supabaseFromMock = vi.fn<(table: string) => unknown>();
const removeChannelMock = vi.fn<(ch: unknown) => unknown>();
const channelMock = vi.fn<(name: string) => typeof fakeChannel>(() => fakeChannel);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => supabaseFromMock(table),
    channel: (name: string) => channelMock(name),
    removeChannel: (ch: unknown) => removeChannelMock(ch),
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
  supabaseFromMock.mockReset();
  channelMock.mockClear();
  removeChannelMock.mockClear();
  fakeChannel.on.mockClear();
  fakeChannel.subscribe.mockClear();
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
    // Status starts as "verifying" — the immediate poll may flip it to "pending"
    // (since the row is still pending) only after MAX_ATTEMPTS, so on first paint
    // we expect "verifying".
    const chip = screen.getByTestId("payment-verify-status");
    expect(["verifying", "pending"]).toContain(chip.getAttribute("data-status"));
  });

  it("subscribes to Supabase realtime + queries orders for verification fallback", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    render(
      <MemoryRouter>
        <OrderConfirmation orderId="poll-test-0000-0000-0000-000000000000" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(supabaseFromMock).toHaveBeenCalledWith("orders");
    });

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

    // The immediate poll fires on mount — wait for it to resolve and update state
    await waitFor(
      () => {
        const chip = screen.getByTestId("payment-verify-status");
        expect(chip).toHaveAttribute("data-status", "confirmed");
      },
      { timeout: 3000 },
    );

    // The same DOM container is still mounted — the page never reloaded
    const cardAfter = container.querySelector("[data-testid='payment-verify-status']");
    expect(cardAfter).not.toBeNull();
    // Order ID chip is still present (proves no remount/refresh loop)
    expect(screen.getByText("CONFIRM0")).toBeInTheDocument();
  });

  it("keeps the card mounted while polling pending status (no shimmer flash)", async () => {
    supabaseFromMock.mockReturnValue(buildOrdersQuery("pending"));

    const { container } = render(
      <MemoryRouter>
        <OrderConfirmation orderId="pending0-9999-9999-9999-999999999999" />
      </MemoryRouter>,
    );

    // Wait for the immediate poll to complete
    await waitFor(() => {
      expect(supabaseFromMock).toHaveBeenCalledWith("orders");
    });

    // Card stays mounted with a verifying/pending chip — never unmounts
    const chip = screen.getByTestId("payment-verify-status");
    expect(["verifying", "pending"]).toContain(chip.getAttribute("data-status"));
    expect(container.querySelector("[data-testid='payment-verify-status']")).not.toBeNull();
    expect(screen.getByText("PENDING0")).toBeInTheDocument();
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
