/**
 * usePaymentReconciliation
 *
 * Client-side fallback for the rare cases when Razorpay's checkout success
 * callback never fires (network drop, page refresh, mobile browser killing the
 * tab). After we hand off to Razorpay we kick off `pollOrderStatus`, which
 * 1. polls the row directly every 3 s for up to `timeoutMs` (default 60 s),
 * 2. on each poll asks the `reconcile-payments` edge function to talk to
 *    Razorpay if the row is still `pending`,
 * 3. resolves as soon as the row flips to a paid state.
 */

import { supabase } from "@/integrations/supabase/client";

export type ReconcileTable = "orders" | "shop_orders" | "event_bookings";

const PAID_STATES: Record<ReconcileTable, string[]> = {
  orders: ["confirmed"],
  shop_orders: ["paid"],
  event_bookings: ["confirmed", "partial_1_paid", "fully_paid"],
};

export interface PollOptions {
  intervalMs?: number;   // default 3000
  timeoutMs?: number;    // default 60000
  onTick?: (status: string | null) => void;
}

export const pollOrderStatus = async (
  table: ReconcileTable,
  id: string,
  opts: PollOptions = {},
): Promise<{ paid: boolean; status: string | null }> => {
  const interval = opts.intervalMs ?? 3000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60000);

  while (Date.now() < deadline) {
    const { data } = await supabase
      .from(table)
      .select("payment_status")
      .eq("id", id)
      .maybeSingle();

    const status = (data as any)?.payment_status ?? null;
    opts.onTick?.(status);

    if (status && PAID_STATES[table].includes(status)) {
      return { paid: true, status };
    }

    // Still pending → ask the reconciler to query Razorpay directly.
    // Fire-and-forget; the next poll will see the result.
    supabase.functions
      .invoke("reconcile-payments", {
        body: { source: "client_poll", target: { table, id }, min_age_seconds: 0 },
      })
      .catch(() => {});

    await new Promise((r) => setTimeout(r, interval));
  }

  // Final read after the loop ends
  const { data: final } = await supabase
    .from(table)
    .select("payment_status")
    .eq("id", id)
    .maybeSingle();
  const finalStatus = (final as any)?.payment_status ?? null;
  return {
    paid: !!finalStatus && PAID_STATES[table].includes(finalStatus),
    status: finalStatus,
  };
};
