/**
 * EventBalanceFullScreen — replaces the modal popup with a fullscreen,
 * 3D, professional permanent page that takes over the entire dashboard
 * whenever the user has ANY completed event with a remaining balance.
 *
 * Behaviour:
 *   • Permanent (no close button) until either:
 *       – Online payment succeeds, OR
 *       – Admin approves the manual claim
 *   • Reverses to "still owed" view if admin marks the event back to
 *     pending / partial (handled by realtime refetch + the eligible flag).
 *   • Cycles automatically through all completed-with-balance events.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard, Banknote, CheckCircle2, Loader2, Upload, Clock,
  AlertTriangle, RefreshCw, Sparkles, Receipt, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { initRazorpay, createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Claim = {
  id: string;
  status: "pending" | "approved" | "rejected";
  claim_type: "cash" | "online";
  amount: number;
  admin_reply: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Step = "menu" | "online_summary" | "paid_method" | "paid_screenshot" | "submitted" | "approved" | "rejected";

interface Props {
  events: any[];          // all events with completed status + remaining balance
  userId: string;
  onAllCleared?: () => void;
}

const MIN_END_BUFFER_MINUTES = 30;

const isEligible = (event: any, remaining: number) => {
  const safe = Math.round(remaining || 0);
  if (safe <= 0) return false;
  if (event.payment_status === "fully_paid") return false;
  if (event.status === "cancelled") return false;
  if (event.status !== "completed") return false;
  try {
    const end = new Date(`${event.event_date}T${event.event_end_time || "23:59:59"}`);
    if (Date.now() < end.getTime() + MIN_END_BUFFER_MINUTES * 60_000) return false;
  } catch {}
  return true;
};

const computeRemaining = (ev: any): number => {
  // Prefer DB column if present, else derive
  if (typeof ev.remaining_amount === "number") return Math.max(0, Math.round(ev.remaining_amount));
  const total = Number(ev.negotiated_total ?? ev.total_price ?? 0);
  const advance = Number(ev.negotiated_advance ?? ev.advance_amount ?? 0);
  return Math.max(0, Math.round(total - advance));
};

const EventBalanceFullScreen = ({ events, userId, onAllCleared }: Props) => {
  const { settings } = useSiteSettings();
  const [activeIdx, setActiveIdx] = useState(0);
  const [step, setStep] = useState<Step>("menu");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paidMethod, setPaidMethod] = useState<"cash" | "online">("cash");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filter events that need attention right now (re-derive on every render so admin reversals reflect instantly)
  const pending = useMemo(
    () => events.filter((e) => isEligible(e, computeRemaining(e))),
    [events]
  );

  const event = pending[Math.min(activeIdx, Math.max(0, pending.length - 1))];
  const remaining = event ? computeRemaining(event) : 0;
  const gatewayPercent = (settings as any)?.gateway_charge_percentage?.percentage || 2.6;
  const fee = Math.ceil(remaining * gatewayPercent / 100);
  const totalPayable = remaining + fee;

  const fetchClaim = async () => {
    if (!event) { setLoadingClaim(false); return; }
    setLoadingClaim(true);
    const { data } = await supabase
      .from("event_payment_claims")
      .select("id, status, claim_type, amount, admin_reply, reviewed_at, created_at")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setClaim(data as Claim);
      if (data.status === "approved") setStep("approved");
      else if (data.status === "pending") setStep("submitted");
      else if (data.status === "rejected") setStep("rejected");
      else setStep("menu");
    } else {
      setClaim(null);
      setStep("menu");
    }
    setLoadingClaim(false);
  };

  // Reset step state whenever we move to a different event
  useEffect(() => {
    setStep("menu");
    setClaim(null);
    setFile(null);
    setNote("");
    setPayError(null);
    setUploadError(null);
    if (event) fetchClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  // Realtime: react instantly to admin claim approval/rejection or status reversal
  useEffect(() => {
    if (!event) return;
    const ch = supabase
      .channel(`evt-balance-fs-${event.id}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_payment_claims", filter: `event_id=eq.${event.id}` }, () => fetchClaim())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, userId]);

  // Notify parent when nothing pending remains (e.g. admin approved everything or reverted state)
  useEffect(() => {
    if (pending.length === 0) onAllCleared?.();
  }, [pending.length, onAllCleared]);

  if (pending.length === 0 || !event) return null;

  const handlePayOnline = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const rzpData = await createRazorpayOrder(supabase, {
        amount: totalPayable,
        order_id: event.id,
        customer_name: event.client_name,
        customer_email: event.client_email,
        customer_mobile: event.client_mobile,
      });
      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club™",
        description: "Event Remaining Balance",
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: event.id,
              is_event_remaining: true,
              remaining_amount: totalPayable,
            });
            toast({ title: "✅ Payment received", description: "Your event is fully settled." });
            // Realtime on event_bookings (parent) will refetch and remove this event from pending
          } catch (err: any) {
            setPayError(err?.message || "Payment verification failed. Please try again or contact support.");
          }
          setPaying(false);
        },
        prefill: { name: event.client_name, email: event.client_email, contact: `+91${event.client_mobile}` },
        theme: { color: "#E3DED3" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setPayError("Payment was cancelled. Tap retry to open the gateway again.");
          },
        },
      };
      await initRazorpay(options);
    } catch (err: any) {
      setPayError(err?.message || "Could not open the payment gateway. Check your connection and retry.");
      setPaying(false);
    }
  };

  const handleSubmitClaim = async () => {
    setUploadError(null);
    if (paidMethod === "online" && !file) {
      setUploadError("Please attach a payment screenshot before submitting.");
      return;
    }
    if (file && file.size > 8 * 1024 * 1024) {
      setUploadError("File too large. Please upload an image under 8 MB.");
      return;
    }
    setSubmitting(true);
    try {
      let screenshotPath: string | null = null;
      if (paidMethod === "online" && file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${event.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-claims").upload(path, file, { upsert: false });
        if (upErr) throw new Error(`Screenshot upload failed: ${upErr.message}`);
        screenshotPath = path;
      }
      const { error } = await supabase.from("event_payment_claims").insert({
        event_id: event.id,
        user_id: userId,
        claim_type: paidMethod,
        amount: remaining,
        screenshot_path: screenshotPath,
        user_note: note || null,
      } as any);
      if (error) throw error;
      toast({ title: "✅ Submitted!", description: "Thanks! We're verifying — usually within 24 hours." });
      setStep("submitted");
      fetchClaim();
    } catch (err: any) {
      setUploadError(err?.message || "Submission failed. Please retry.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-6"
      style={{
        background: "radial-gradient(circle at 20% 10%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(circle at 80% 90%, hsl(var(--primary) / 0.12), transparent 55%), linear-gradient(135deg, #fdfaf3, #f6f1e7 60%, #efe7d6)",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Floating decorative orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        className="relative w-full max-w-xl my-auto"
        style={{ perspective: 1200 }}
      >
        <div
          className="relative rounded-3xl border border-white/60 bg-gradient-to-br from-white via-[#fdfaf3] to-[#f4ead4] shadow-[0_30px_80px_-20px_rgba(60,40,10,0.35),0_10px_25px_-12px_rgba(60,40,10,0.25)] overflow-hidden"
          style={{ transform: "translateZ(0)" }}
        >
          {/* Pearlescent top sheen */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

          {/* Header strip */}
          <div className="relative px-6 pt-6 pb-4 border-b border-amber-100/70">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-rose-300 to-primary text-white flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] font-sans font-semibold text-amber-700/80">
                  Action Required • Event Settlement
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  Final balance for your event
                </h2>
                <p className="text-sm font-sans text-foreground/70 mt-0.5 truncate">
                  {event.event_type ? event.event_type[0].toUpperCase() + event.event_type.slice(1) : "Event"} · {event.event_date} · {event.city}
                </p>
              </div>
            </div>

            {pending.length > 1 && (
              <div className="mt-4 flex items-center justify-between rounded-full bg-white/70 backdrop-blur border border-amber-100 px-3 py-1.5">
                <button
                  className="p-1 rounded-full hover:bg-amber-100/60 disabled:opacity-30"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-[11px] font-sans font-semibold text-foreground/70">
                  {activeIdx + 1} of {pending.length} pending
                </p>
                <button
                  className="p-1 rounded-full hover:bg-amber-100/60 disabled:opacity-30"
                  disabled={activeIdx >= pending.length - 1}
                  onClick={() => setActiveIdx((i) => Math.min(pending.length - 1, i + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {loadingClaim ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {step === "menu" && (
                  <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    {/* 3D balance plate */}
                    <div className="relative rounded-2xl p-5 mb-5 border border-amber-200/70 bg-gradient-to-br from-white to-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_25px_-15px_rgba(120,80,20,0.35)]">
                      <p className="text-[11px] uppercase tracking-widest font-sans font-semibold text-amber-700/80">Remaining Balance</p>
                      <p className="font-display text-4xl sm:text-5xl font-bold bg-gradient-to-br from-amber-700 via-rose-600 to-primary bg-clip-text text-transparent leading-none mt-1">
                        {formatPrice(remaining)}
                      </p>
                      <p className="text-xs font-sans text-foreground/60 mt-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Secure settlement · backed by Razorpay & manual verification
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <Button
                        className="w-full rounded-2xl font-sans h-14 bg-gradient-to-br from-primary to-amber-600 hover:brightness-105 shadow-[0_10px_24px_-10px_rgba(120,80,20,0.55)] text-white"
                        onClick={() => setStep("online_summary")}
                      >
                        <CreditCard className="w-5 h-5 mr-2" /> Pay Online Now
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl font-sans h-14 border-2 border-amber-200 bg-white hover:bg-amber-50"
                        onClick={() => setStep("paid_method")}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" /> I've Already Paid
                      </Button>
                    </div>

                    <p className="text-[11px] text-center text-foreground/50 mt-4">
                      This page stays until your balance is settled or admin approves your manual claim.
                    </p>
                  </motion.div>
                )}

                {step === "online_summary" && (
                  <motion.div key="os" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <h3 className="font-display text-xl font-bold flex items-center gap-2 mb-3">
                      <Receipt className="w-5 h-5 text-primary" /> Payment Summary
                    </h3>
                    <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-4 space-y-2 mb-3 shadow-sm">
                      <Row label="Remaining Balance" value={formatPrice(remaining)} />
                      <Row label={`Gateway Fee (${gatewayPercent}%)`} value={formatPrice(fee)} />
                      <div className="h-px bg-amber-200/70 my-1" />
                      <Row label="Total Payable" value={formatPrice(totalPayable)} bold />
                    </div>
                    {payError && <ErrorBanner title="Payment couldn't be completed" message={payError} />}
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-full" onClick={() => { setPayError(null); setStep("menu"); }}>Back</Button>
                      <Button
                        className="flex-1 rounded-full font-sans bg-gradient-to-br from-primary to-amber-600 text-white hover:brightness-105"
                        disabled={paying}
                        onClick={handlePayOnline}
                      >
                        {paying
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…</>
                          : payError
                          ? <><RefreshCw className="w-4 h-4 mr-2" /> Retry payment</>
                          : <>Pay {formatPrice(totalPayable)}</>}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "paid_method" && (
                  <motion.div key="pm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <h3 className="font-display text-xl font-bold mb-1">How did you pay?</h3>
                    <p className="text-sm font-sans text-foreground/60 mb-3">Pick the method so we can verify it correctly.</p>
                    <RadioGroup value={paidMethod} onValueChange={(v) => setPaidMethod(v as any)} className="space-y-2 mb-4">
                      <Label className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-white p-3.5 cursor-pointer hover:border-primary/40 transition">
                        <RadioGroupItem value="cash" />
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span className="font-sans font-semibold">Cash payment</span>
                      </Label>
                      <Label className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-white p-3.5 cursor-pointer hover:border-primary/40 transition">
                        <RadioGroupItem value="online" />
                        <CreditCard className="w-5 h-5 text-primary" />
                        <span className="font-sans font-semibold">Online (UPI / bank transfer)</span>
                      </Label>
                    </RadioGroup>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-full" onClick={() => setStep("menu")}>Back</Button>
                      <Button className="flex-1 rounded-full font-sans bg-gradient-to-br from-primary to-amber-600 text-white" onClick={() => setStep("paid_screenshot")}>Continue</Button>
                    </div>
                  </motion.div>
                )}

                {step === "paid_screenshot" && (
                  <motion.div key="ps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <h3 className="font-display text-xl font-bold mb-1">
                      {paidMethod === "online" ? "Upload payment proof" : "Confirm cash payment"}
                    </h3>
                    <p className="text-sm font-sans text-foreground/60 mb-3">
                      Amount: <strong className="text-primary">{formatPrice(remaining)}</strong>
                    </p>
                    {paidMethod === "online" && (
                      <div className="mb-3">
                        <Label className="text-xs font-sans">Payment Screenshot * (max 8 MB)</Label>
                        <label className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 cursor-pointer hover:bg-amber-100/50">
                          <Upload className="w-7 h-7 text-amber-700" />
                          <span className="text-xs font-sans">{file ? file.name : "Click to upload screenshot"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { setFile(e.target.files?.[0] || null); setUploadError(null); }}
                          />
                        </label>
                      </div>
                    )}
                    <div className="mb-3">
                      <Label className="text-xs font-sans">Notes (optional)</Label>
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                        placeholder="Reference no., date, or any details…"
                        className="mt-1 rounded-xl bg-white border-amber-200" />
                    </div>
                    {uploadError && <ErrorBanner title="Couldn't submit your claim" message={uploadError} hint="Your file selection is preserved — fix the issue and tap retry." />}
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-full" onClick={() => setStep("paid_method")}>Back</Button>
                      <Button
                        className="flex-1 rounded-full font-sans bg-gradient-to-br from-primary to-amber-600 text-white"
                        disabled={submitting}
                        onClick={handleSubmitClaim}
                      >
                        {submitting
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                          : uploadError
                          ? <><RefreshCw className="w-4 h-4 mr-2" /> Retry submission</>
                          : <>Submit for Verification</>}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "submitted" && claim && (
                  <motion.div key="sub" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-5 text-center">
                      <Clock className="w-10 h-10 text-amber-600 mx-auto mb-2 animate-pulse" />
                      <p className="font-display text-xl font-bold text-amber-900">Verifying your payment</p>
                      <p className="font-sans text-sm text-amber-800/90 mt-2">
                        🙏 Thanks for confirming your <strong>{claim.claim_type === "cash" ? "cash" : "online"}</strong> payment of <strong>{formatPrice(claim.amount)}</strong>.
                      </p>
                      <p className="font-sans text-xs text-amber-800/80 mt-2">
                        Verification usually takes <strong>under 24 hours</strong>. This screen will close automatically once an admin approves.
                      </p>
                    </div>
                  </motion.div>
                )}

                {step === "rejected" && claim && (
                  <motion.div key="rej" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-5 mb-3">
                      <AlertTriangle className="w-7 h-7 text-red-600 mb-1" />
                      <p className="font-display text-lg font-bold text-red-900">Claim rejected</p>
                      <p className="font-sans text-sm text-red-800/90 mt-1">
                        Your last <strong>{claim.claim_type}</strong> claim of <strong>{formatPrice(claim.amount)}</strong> was rejected.
                      </p>
                      {claim.admin_reply && (
                        <p className="font-sans text-xs text-red-800/80 mt-2">
                          <strong>Admin note:</strong> {claim.admin_reply}
                        </p>
                      )}
                    </div>
                    <Button className="w-full rounded-full font-sans bg-gradient-to-br from-primary to-amber-600 text-white" onClick={() => { setClaim(null); setFile(null); setNote(""); setStep("menu"); }}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Resubmit payment proof
                    </Button>
                  </motion.div>
                )}

                {step === "approved" && claim && (
                  <motion.div key="apr" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                      <p className="font-display text-xl font-bold text-emerald-900">Payment Approved!</p>
                      <p className="font-sans text-sm text-emerald-800/90 mt-2">
                        🎉 Your payment of <strong>{formatPrice(claim.amount)}</strong> has been verified. Your event is fully settled.
                      </p>
                    </div>
                    <Button className="w-full rounded-full font-sans bg-gradient-to-br from-primary to-amber-600 text-white mt-3" onClick={() => {
                      // Move to next pending event if any, or close (parent realtime will hide screen)
                      if (activeIdx < pending.length - 1) setActiveIdx(activeIdx + 1);
                    }}>
                      {pending.length > 1 ? "Next pending event" : "Close"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Bottom 3D shadow plate */}
          <div aria-hidden className="absolute -bottom-6 left-6 right-6 h-6 rounded-full bg-amber-900/20 blur-2xl" />
        </div>
      </motion.div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between items-center text-sm font-sans">
    <span className={bold ? "font-bold text-primary" : "text-foreground/70"}>{label}</span>
    <span className={bold ? "font-bold text-primary text-lg" : "font-semibold"}>{value}</span>
  </div>
);

const ErrorBanner = ({ title, message, hint }: { title: string; message: string; hint?: string }) => (
  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-sans text-red-800 flex items-start gap-2">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <div className="flex-1">
      <p className="font-semibold">{title}</p>
      <p>{message}</p>
      {hint && <p className="opacity-70 mt-1">{hint}</p>}
    </div>
  </div>
);

export default EventBalanceFullScreen;
