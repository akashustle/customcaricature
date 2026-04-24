/**
 * Workshop → Booking-Account linker.
 *
 * Lets a logged-in workshop student create or attach an auth-based booking
 * account so they can use both the Workshop dashboard AND the main user
 * dashboard (events, orders, payments) with one identity.
 *
 * Two modes:
 *   1. "Use my workshop details"   — Sign-up using the workshop email/mobile,
 *                                    user picks a password, instant link.
 *   2. "Use different details"     — Custom email/mobile + password.
 *
 * On success we set workshop_users.auth_user_id = newUser.id so both panels
 * see the same person.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Link2, UserPlus, ArrowRight, Loader2, ShieldCheck, Sparkles,
  CheckCircle2, LayoutDashboard, X,
} from "lucide-react";

const palette = {
  ivory: "hsl(38 60% 96%)",
  coral: "hsl(8 78% 70%)",
  gold: "hsl(36 78% 60%)",
  sage: "hsl(150 30% 65%)",
  plum: "hsl(335 45% 55%)",
  sky: "hsl(200 70% 70%)",
};

type Props = {
  workshopUser: any;
  darkMode?: boolean;
  onLinked?: (authUserId: string) => void;
};

const WorkshopBookingLinkCard = ({ workshopUser, darkMode = false, onLinked }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "ws" | "custom" | "linking" | "done">("choose");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: workshopUser.name || "",
    email: workshopUser.email || "",
    mobile: workshopUser.mobile || "",
    password: "",
    confirm: "",
  });

  const isAlreadyLinked = !!workshopUser.auth_user_id;

  const linkExisting = async (authUserId: string) => {
    const { error } = await supabase
      .from("workshop_users" as any)
      .update({ auth_user_id: authUserId } as any)
      .eq("id", workshopUser.id);
    if (error) throw error;
    const next = { ...workshopUser, auth_user_id: authUserId };
    localStorage.setItem("workshop_user", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("workshop-user-updated", { detail: next }));
    onLinked?.(authUserId);
  };

  const handleSignUp = async () => {
    if (!form.full_name || form.full_name.trim().length < 2) {
      toast({ title: "Name required", variant: "destructive" }); return;
    }
    if (!form.email || !form.email.includes("@")) {
      toast({ title: "Email required", description: "Please enter a valid email.", variant: "destructive" }); return;
    }
    if (!form.mobile || form.mobile.replace(/\D/g, "").length < 10) {
      toast({ title: "Mobile required", description: "10-digit mobile.", variant: "destructive" }); return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters.", variant: "destructive" }); return;
    }
    if (form.password !== form.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }

    setSubmitting(true);
    setMode("linking");
    try {
      // 1. Try sign-up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: form.full_name.trim(),
            mobile: form.mobile.replace(/\D/g, ""),
            city: workshopUser.city || "",
            state: workshopUser.state || "",
          },
        },
      });

      let authUserId: string | null = signUpData.user?.id || null;

      // If user already exists, try login
      if (signUpErr && /already registered|already exists|already been/i.test(signUpErr.message)) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
        if (loginErr) {
          throw new Error("An account with this email already exists. Please log in to your booking account first to link it.");
        }
        authUserId = loginData.user?.id || null;
      } else if (signUpErr) {
        throw signUpErr;
      }

      if (!authUserId) throw new Error("Could not create or find your account.");

      await linkExisting(authUserId);

      setMode("done");
      toast({ title: "✅ Accounts linked!", description: "Your workshop and booking accounts are now connected." });
    } catch (e: any) {
      toast({ title: "Linking failed", description: e.message, variant: "destructive" });
      setMode(mode === "linking" ? "ws" : mode);
    } finally {
      setSubmitting(false);
    }
  };

  // ───────── Already linked card ─────────
  if (isAlreadyLinked) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-5 border-2 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]"
        style={{
          background: darkMode
            ? `linear-gradient(135deg, hsl(150 30% 15%), hsl(150 25% 20%))`
            : `linear-gradient(135deg, hsl(150 50% 95%), hsl(150 40% 88%))`,
          borderColor: palette.sage,
        }}>
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: palette.sage }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base flex items-center gap-1.5"
              style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(150 40% 22%)" }}>
              Booking Account Linked <CheckCircle2 className="w-4 h-4" style={{ color: palette.sage }} />
            </h3>
            <p className="text-xs mt-0.5"
              style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(150 30% 35%)" }}>
              Switch over to manage events, orders & payments.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} size="sm"
            className="rounded-full font-semibold shadow-md text-white border-0"
            style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
            <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Switch to Booking
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* CTA card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-5 border-2 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)]"
        style={{
          background: darkMode
            ? `linear-gradient(135deg, hsl(335 30% 15%), hsl(8 25% 20%))`
            : `linear-gradient(135deg, hsl(335 60% 96%), hsl(8 60% 92%))`,
          borderColor: palette.plum,
        }}>
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: palette.plum }} />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: palette.coral }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${palette.plum}, ${palette.coral})` }}>
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base md:text-lg"
              style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(335 40% 25%)" }}>
              Create Your Booking Account
            </h3>
            <p className="text-xs md:text-sm mt-0.5"
              style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(335 30% 35%)" }}>
              Book live caricature artists for your events, with one connected login.
            </p>
          </div>
          <Button onClick={() => { setOpen(true); setMode("choose"); }} size="sm"
            className="rounded-full font-semibold shadow-md text-white border-0 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${palette.plum}, ${palette.coral})` }}>
            Create / Link <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => mode !== "linking" && setOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg rounded-[28px] p-6 shadow-2xl border-2 overflow-hidden max-h-[92vh] overflow-y-auto"
              style={{ background: darkMode ? "hsl(var(--card))" : palette.ivory, borderColor: palette.plum }}
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpen(false)} disabled={mode === "linking"}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center shadow-sm border border-border z-20 disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: palette.plum }} />

              {mode === "choose" && (
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${palette.plum}, ${palette.coral})` }}>
                      <Link2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(335 40% 25%)" }}>
                        Connect Your Accounts
                      </h3>
                      <p className="text-xs" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(335 30% 40%)" }}>
                        Pick how you'd like to set up your booking account.
                      </p>
                    </div>
                  </div>

                  <button onClick={() => {
                    setForm({
                      full_name: workshopUser.name || "",
                      email: workshopUser.email || "",
                      mobile: workshopUser.mobile || "",
                      password: "", confirm: "",
                    });
                    setMode("ws");
                  }} className="w-full text-left rounded-2xl p-4 border-2 transition hover:scale-[1.02] active:scale-100 shadow-md"
                    style={{ background: darkMode ? "hsl(var(--muted) / 0.5)" : "hsl(0 0% 100% / 0.7)", borderColor: `${palette.sky}66` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
                        style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(220 40% 25%)" }}>
                          Use my workshop details
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(220 30% 40%)" }}>
                          Fastest. Re-uses {workshopUser.email || workshopUser.mobile}. Just pick a password.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1" style={{ color: palette.sky }} />
                    </div>
                  </button>

                  <button onClick={() => {
                    setForm({ full_name: workshopUser.name || "", email: "", mobile: "", password: "", confirm: "" });
                    setMode("custom");
                  }} className="w-full text-left rounded-2xl p-4 border-2 transition hover:scale-[1.02] active:scale-100 shadow-md"
                    style={{ background: darkMode ? "hsl(var(--muted) / 0.5)" : "hsl(0 0% 100% / 0.7)", borderColor: `${palette.coral}66` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
                        style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(8 50% 25%)" }}>
                          Use different details
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(8 40% 40%)" }}>
                          Use a different email/mobile for booking events.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1" style={{ color: palette.coral }} />
                    </div>
                  </button>

                  <div className="rounded-xl p-3 text-[11px] flex items-start gap-2"
                    style={{ background: `${palette.sage}15`, color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(150 30% 30%)" }}>
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: palette.sage }} />
                    <span>Both accounts will stay fully connected — switch any time from the profile menu.</span>
                  </div>
                </div>
              )}

              {(mode === "ws" || mode === "custom") && (
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setMode("choose")} className="text-xs font-semibold underline"
                      style={{ color: palette.coral }}>← Back</button>
                    <h3 className="text-base font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(335 40% 25%)" }}>
                      {mode === "ws" ? "Confirm & set password" : "Enter your details"}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold">Full name *</Label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Email *</Label>
                      <Input value={form.email} disabled={mode === "ws"} type="email"
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Mobile *</Label>
                      <Input value={form.mobile} disabled={mode === "ws"} maxLength={10} type="tel" inputMode="numeric"
                        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setForm({ ...form, mobile: d }); }}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Password *</Label>
                      <Input type="password" value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="mt-1 rounded-xl bg-card" placeholder="Min 6 characters" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Confirm Password *</Label>
                      <Input type="password" value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                  </div>
                  <Button onClick={handleSignUp} disabled={submitting}
                    className="w-full mt-3 rounded-full font-bold text-white border-0 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${palette.plum}, ${palette.coral})` }}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Link2 className="w-4 h-4 mr-1.5" />}
                    Create & Link Booking Account
                  </Button>
                </div>
              )}

              {mode === "linking" && (
                <div className="relative z-10 py-8 text-center space-y-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto rounded-full border-4 border-transparent shadow-lg"
                    style={{
                      borderTopColor: palette.plum, borderRightColor: palette.coral,
                      borderBottomColor: palette.gold, borderLeftColor: palette.sky,
                    }} />
                  <h3 className="text-lg font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(335 40% 25%)" }}>
                    Linking your accounts…
                  </h3>
                </div>
              )}

              {mode === "done" && (
                <div className="relative z-10 py-6 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(150 40% 22%)" }}>
                    Accounts Connected!
                  </h3>
                  <p className="text-sm" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(150 30% 35%)" }}>
                    You can now book events and manage everything from one place.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={() => { setOpen(false); navigate("/dashboard"); }}
                      className="flex-1 rounded-full font-bold text-white border-0 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
                      <LayoutDashboard className="w-4 h-4 mr-1.5" /> Go to Booking Dashboard
                    </Button>
                    <Button onClick={() => setOpen(false)} variant="ghost" className="rounded-full">Stay Here</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WorkshopBookingLinkCard;
