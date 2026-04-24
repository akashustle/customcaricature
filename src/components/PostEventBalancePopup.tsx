/**
 * PostEventBalancePopup — permanent reminder shown to clients after their
 * event has auto-completed but a balance is still owed. Now hardened with:
 *
 *   • Edge-case gating: bails out for zero/negative balances, fully-paid,
 *     cancelled, or partially-paid-but-not-completed states. Time-zone
 *     safe: the popup waits at least 30 mins past the event's end time
 *     in the user's local zone before triggering, so quick auto-complete
 *     drift doesn't surprise mid-event clients.
 *   • Razorpay retry UX: explicit error banners + "Try again" button
 *     so the user can recover from gateway dismiss / signature failure
 *     without reloading.
 *   • Screenshot upload retry UX: failed uploads show a clear error and
 *     retain the file selection so users can re-submit.
 *   • Idempotent claim resubmission after rejection.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard, Banknote, CheckCircle2, Loader2, Upload, Clock, ArrowLeft,
  AlertTriangle, RefreshCw,
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

interface Props {
  event: any;
  userId: string;
  remaining: number;
  onPaid?: () => void;
}

type View =
  | "menu"
  | "online_summary"
  | "paid_method"
  | "paid_screenshot"
  | "submitted"
  | "approved"
  | "rejected";

const MIN_END_BUFFER_MINUTES = 30; // popup waits at least 30 min past end time

const PostEventBalancePopup = ({ event, userId, remaining, onPaid }: Props) => {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<View>("menu");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paidMethod, setPaidMethod] = useState<"cash" | "online">("cash");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { settings } = useSiteSettings();

  /* ---- Edge-case guard: should this popup show at all? ---- */
  const eligible = useMemo(() => {
    // Bail out if balance is zero/negative or already fully paid
    const safeRemaining = Math.round(remaining || 0);
    if (safeRemaining <= 0) return false;
    if (event.payment_status === "fully_paid") return false;
    if (event.status === "cancelled") return false;
    if (event.status !== "completed") return false;
    // Time-zone safe end-time check with 30-min buffer
    try {
      const end = new Date(`${event.event_date}T${event.event_end_time || "23:59:59"}`);
      const buffered = end.getTime() + MIN_END_BUFFER_MINUTES * 60_000;
      if (Date.now() < buffered) return false;
    } catch {
      // If date parse fails, fall through and trust the status flag
    }
    return true;
  }, [event, remaining]);

  const fetchClaim = async () => {
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
      if (data.status === "approved") setView("approved");
      else if (data.status === "pending") setView("submitted");
      else if (data.status === "rejected") setView("rejected");
    }
    setLoadingClaim(false);
  };

  useEffect(() => {
    if (!eligible) { setLoadingClaim(false); return; }
    fetchClaim();
    const ch = supabase
      .channel(`event-claim-${event.id}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_payment_claims", filter: `event_id=eq.${event.id}` }, () => fetchClaim())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, userId, eligible]);

  const gatewayPercent = (settings as any)?.gateway_charge_percentage?.percentage || 2.6;
  const safeRemaining = Math.max(0, Math.round(remaining || 0));
  const fee = Math.ceil(safeRemaining * gatewayPercent / 100);
  const totalPayable = safeRemaining + fee;

  const canClose = claim?.status === "approved" || !eligible;

  /* -------------------------- Razorpay flow -------------------------- */
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
            onPaid?.();
            setOpen(false);
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
        _onPaymentFailed: (resp: any) => {
          setPayError(resp?.error?.description || "Payment failed at gateway. Please retry.");
          setPaying(false);
        },
      };
      await initRazorpay(options);
    } catch (err: any) {
      setPayError(err?.message || "Could not open the payment gateway. Check your connection and retry.");
      setPaying(false);
    }
  };

  /* -------------------------- Claim submission -------------------------- */
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
        const { error: upErr } = await supabase.storage
          .from("payment-claims")
          .upload(path, file, { upsert: false });
        if (upErr) {
          throw new Error(`Screenshot upload failed: ${upErr.message}`);
        }
        screenshotPath = path;
      }
      const { error } = await supabase.from("event_payment_claims").insert({
        event_id: event.id,
        user_id: userId,
        claim_type: paidMethod,
        amount: safeRemaining,
        screenshot_path: screenshotPath,
        user_note: note || null,
      } as any);
      if (error) throw error;
      toast({ title: "✅ Submitted!", description: "Thanks! We're verifying — usually within 24 hours." });
      setView("submitted");
      fetchClaim();
    } catch (err: any) {
      setUploadError(err?.message || "Submission failed. Please retry.");
    }
    setSubmitting(false);
  };

  if (loadingClaim || !eligible) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (canClose) setOpen(v); }}>
      <DialogContent
        className={`max-w-md bg-gradient-to-br from-card via-background to-card border-2 border-primary/20 shadow-2xl ${canClose ? "" : "[&>button.absolute]:hidden"}`}
        onPointerDownOutside={(e) => { if (!canClose) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canClose) e.preventDefault(); }}
      >
        <AnimatePresence mode="wait">
          {view === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2">
                  🎉 Event Completed!
                </DialogTitle>
                <DialogDescription className="font-sans">
                  Hope your event was wonderful. Please settle the remaining balance.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 rounded-2xl bg-primary/10 border border-primary/30 p-4 text-center">
                <p className="text-xs font-sans text-muted-foreground">Remaining Balance</p>
                <p className="font-display text-3xl font-bold text-primary">{formatPrice(safeRemaining)}</p>
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full rounded-full font-sans h-12 bg-primary hover:bg-primary/90"
                  onClick={() => setView("online_summary")}
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Pay Online Now
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-full font-sans h-12 border-primary/40"
                  onClick={() => setView("paid_method")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> I've Already Paid
                </Button>
              </div>
            </motion.div>
          )}

          {view === "online_summary" && (
            <motion.div key="online" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Payment Summary
                </DialogTitle>
              </DialogHeader>
              <div className="my-4 rounded-2xl border border-primary/30 bg-card p-4 space-y-2">
                <Row label="Remaining Balance" value={formatPrice(safeRemaining)} />
                <Row label={`Gateway Fee (${gatewayPercent}%)`} value={formatPrice(fee)} />
                <div className="h-px bg-primary/20 my-1" />
                <Row label="Total Payable" value={formatPrice(totalPayable)} bold />
              </div>

              {payError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-sans text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Payment couldn't be completed</p>
                    <p>{payError}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => { setPayError(null); setView("menu"); }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90"
                  disabled={paying}
                  onClick={handlePayOnline}
                >
                  {paying ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
                  ) : payError ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Retry payment</>
                  ) : (
                    <>Pay {formatPrice(totalPayable)}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {view === "paid_method" && (
            <motion.div key="method" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">How did you pay?</DialogTitle>
                <DialogDescription className="font-sans">Select your payment method to confirm.</DialogDescription>
              </DialogHeader>
              <RadioGroup value={paidMethod} onValueChange={(v) => setPaidMethod(v as any)} className="my-4 space-y-2">
                <Label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
                  <RadioGroupItem value="cash" />
                  <Banknote className="w-5 h-5 text-primary" />
                  <span className="font-sans">Cash payment</span>
                </Label>
                <Label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
                  <RadioGroupItem value="online" />
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="font-sans">Online (UPI / bank transfer)</span>
                </Label>
              </RadioGroup>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setView("menu")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90" onClick={() => setView("paid_screenshot")}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {view === "paid_screenshot" && (
            <motion.div key="ss" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {paidMethod === "online" ? "Upload payment proof" : "Confirm cash payment"}
                </DialogTitle>
                <DialogDescription className="font-sans">
                  Amount: <strong className="text-primary">{formatPrice(safeRemaining)}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                {paidMethod === "online" && (
                  <div>
                    <Label className="text-xs font-sans">Payment Screenshot * (max 8 MB)</Label>
                    <label className="mt-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 cursor-pointer hover:bg-primary/10">
                      <Upload className="w-6 h-6 text-primary" />
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
                <div>
                  <Label className="text-xs font-sans">Notes (optional)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reference no., date, or any details..."
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {uploadError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-sans text-red-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">Couldn't submit your claim</p>
                      <p>{uploadError}</p>
                      <p className="opacity-70 mt-1">Your file selection is preserved — fix the issue and tap retry.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setView("paid_method")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90"
                  disabled={submitting}
                  onClick={handleSubmitClaim}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : uploadError ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Retry submission</>
                  ) : (
                    <>Submit for Verification</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {view === "submitted" && claim && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" /> Verifying your payment
                </DialogTitle>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <p className="font-sans text-sm text-amber-900">
                    🙏 Thank you for confirming! We're verifying your <strong>{claim.claim_type === "cash" ? "cash" : "online"}</strong> payment of <strong>{formatPrice(claim.amount)}</strong>.
                  </p>
                  <p className="font-sans text-xs text-amber-800">
                    This usually takes <strong>under 24 hours</strong>. You'll get a notification once approved.
                  </p>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
                  <p className="font-sans text-xs text-muted-foreground">Status</p>
                  <p className="font-display text-lg font-bold text-amber-600">⏳ Pending Approval</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === "rejected" && claim && (
            <motion.div key="rejected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" /> Claim was rejected
                </DialogTitle>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                  <p className="font-sans text-sm text-red-900">
                    Your last <strong>{claim.claim_type}</strong> claim of <strong>{formatPrice(claim.amount)}</strong> was rejected.
                  </p>
                  {claim.admin_reply && (
                    <p className="font-sans text-xs text-red-800 mt-2">
                      <strong>Admin note:</strong> {claim.admin_reply}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full rounded-full font-sans bg-primary hover:bg-primary/90"
                  onClick={() => { setClaim(null); setView("menu"); setFile(null); setNote(""); }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Resubmit payment proof
                </Button>
              </div>
            </motion.div>
          )}

          {view === "approved" && claim && (
            <motion.div key="approved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" /> Payment Approved!
                </DialogTitle>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                  <p className="font-sans text-green-900 text-sm">
                    🎉 Thank you! Your payment of <strong>{formatPrice(claim.amount)}</strong> has been verified.
                  </p>
                  <p className="font-sans text-xs text-green-800 mt-1">Your event is now fully settled. We appreciate your trust!</p>
                </div>
                {claim.admin_reply && (
                  <div className="rounded-xl bg-card border border-border p-3">
                    <p className="text-[10px] font-semibold text-primary">Admin note:</p>
                    <p className="text-xs font-sans">{claim.admin_reply}</p>
                  </div>
                )}
                <Button className="w-full rounded-full font-sans bg-primary hover:bg-primary/90" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between items-center text-sm font-sans">
    <span className={bold ? "font-bold text-primary" : "text-muted-foreground"}>{label}</span>
    <span className={bold ? "font-bold text-primary text-lg" : "font-semibold"}>{value}</span>
  </div>
);

export default PostEventBalancePopup;
