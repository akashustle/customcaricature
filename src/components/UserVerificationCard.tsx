/**
 * Premium 3D verification card for the User Dashboard.
 * Mirrors the workshop verification UX (ivory / coral / sage palette) and
 * lets users submit themselves for blue-tick verification by completing the
 * required profile fields.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SelectWithOther from "@/components/ui/select-with-other";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, ShieldCheck, Sparkles, Loader2, ArrowRight, Clock, ChevronRight, Camera } from "lucide-react";
import { getStates, INDIA_LOCATIONS } from "@/lib/india-locations";

// Ivory / coral / sage palette to match WorkshopProfile
const palette = {
  ivory: "hsl(38 60% 96%)",
  coral: "hsl(8 78% 70%)",
  gold: "hsl(36 78% 60%)",
  sage: "hsl(150 30% 65%)",
  sky: "hsl(200 70% 70%)",
};

const COUNTRIES = ["India", "USA", "UK", "UAE", "Canada", "Australia", "Singapore", "Germany", "Other"];

type Profile = {
  full_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  instagram_id?: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  why_join?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  verification_status?: string | null;
};

type Props = {
  userId: string;
  profile: Profile | null;
  onProfileSaved?: () => void;
  onBookEvent?: () => void;
  canBookEvent?: boolean;
};

const UserVerificationCard = ({ userId, profile, onProfileSaved, onBookEvent, canBookEvent }: Props) => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"form" | "loading" | "longer">("form");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    mobile: profile?.mobile || "",
    instagram_id: profile?.instagram_id || "",
    age: profile?.age?.toString() || "",
    gender: profile?.gender || "",
    occupation: (profile as any)?.occupation || "",
    why_join: (profile as any)?.why_join || "",
    address: profile?.address || "",
    country: "India",
    state: profile?.state || "",
    city: profile?.city || "",
    pincode: profile?.pincode || "",
  });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      mobile: profile?.mobile || "",
      instagram_id: profile?.instagram_id || "",
      age: profile?.age?.toString() || "",
      gender: profile?.gender || "",
      occupation: (profile as any)?.occupation || "",
      why_join: (profile as any)?.why_join || "",
      address: profile?.address || "",
      country: "India",
      state: profile?.state || "",
      city: profile?.city || "",
      pincode: profile?.pincode || "",
    });
  }, [profile]);

  const verificationStatus = profile?.verification_status || (profile?.is_verified ? "verified" : "unverified");
  const isVerified = profile?.is_verified === true || verificationStatus === "verified";
  const isPending = verificationStatus === "pending";

  const states = getStates();
  const citiesForState = (() => {
    if (!form.state || form.country !== "India") return [];
    const districts = INDIA_LOCATIONS[form.state];
    if (!districts) return [];
    const all = Object.values(districts).flat();
    return Array.from(new Set(all)).sort();
  })();

  // Completeness check
  const completenessFields = [
    form.full_name, form.mobile, form.age, form.gender,
    form.occupation, form.city, form.address, profile?.avatar_url,
    form.why_join, (form.country === "India" ? form.state : true),
  ];
  const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);

  const handleSubmit = async () => {
    // Validation
    if (!form.full_name || form.full_name.trim().length < 2) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!form.mobile || form.mobile.replace(/\D/g, "").length < 10) {
      toast({ title: "Mobile required", description: "Please enter a valid 10-digit mobile.", variant: "destructive" });
      return;
    }
    if (!form.age || !form.gender || !form.occupation) {
      toast({ title: "More details needed", description: "Age, gender and occupation are required.", variant: "destructive" });
      return;
    }
    if (form.country === "India") {
      if (!form.state) {
        toast({ title: "State required", description: "Please select your state.", variant: "destructive" });
        return;
      }
      if (!form.city) {
        toast({ title: "City required", description: "Please select or type your city.", variant: "destructive" });
        return;
      }
    } else {
      if (!form.city) {
        toast({ title: "City required", description: "Please type your city.", variant: "destructive" });
        return;
      }
    }
    if (!profile?.avatar_url) {
      toast({
        title: "📸 Profile photo required",
        description: "Please upload your own profile photo first — verification needs your real face.",
        variant: "destructive",
      });
      return;
    }
    if (completeness < 80) {
      toast({ title: "Profile incomplete", description: "Please complete at least 80% of details.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setStage("loading");

    try {
      // 1. Save profile fields
      const profileUpdate: Record<string, any> = {
        full_name: form.full_name.trim(),
        mobile: form.mobile.replace(/\D/g, ""),
        instagram_id: form.instagram_id?.trim() || null,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender || null,
        occupation: form.occupation?.trim() || null,
        why_join: form.why_join?.trim() || null,
        address: form.address?.trim() || null,
        state: form.country === "India" ? form.state : (form.state || null),
        city: form.city?.trim() || null,
        pincode: form.pincode?.trim() || null,
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase.from("profiles").update(profileUpdate as any).eq("user_id", userId);
      if (upErr) throw upErr;

      // 2. Log verification history (best-effort)
      try {
        await supabase.from("profile_verification_history" as any).insert({
          user_id: userId,
          action: "submit",
          previous_status: verificationStatus,
          new_status: "pending",
          performed_by: form.full_name || "User",
          performed_by_user_id: userId,
        } as any);
      } catch {/* non-fatal */}

      // 3. Notification (best-effort)
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "📨 Verification submitted",
          message: "Thanks! Your profile is under review. You'll get a notification within 24 hours.",
          type: "system",
          link: "/dashboard",
        } as any);
      } catch {/* non-fatal */}

      onProfileSaved?.();

      setTimeout(() => setStage("longer"), 4500);
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
      setStage("form");
    } finally {
      setSubmitting(false);
    }
  };

  if (isVerified) return null;

  return (
    <>
      {/* Outer card — premium ivory + sky 3D */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-5 border-2 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)]"
        style={{
          background: `linear-gradient(135deg, hsl(200 70% 95%), hsl(200 60% 90%))`,
          borderColor: palette.sky,
        }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: palette.sky }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 60%))` }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base md:text-lg flex items-center gap-2" style={{ color: "hsl(220 50% 25%)" }}>
              Get your blue tick <BadgeCheck className="w-5 h-5" style={{ color: palette.sky }} />
            </h3>
            <p className="text-xs md:text-sm mt-0.5" style={{ color: "hsl(220 30% 35%)" }}>
              {isPending
                ? "Your verification is under review. We'll notify you once approved."
                : "Two steps unlock the blue tick — fill in all your profile details and book your first event. We'll verify you automatically once both are done."}
            </p>
          </div>
          {isPending ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex-shrink-0"
              style={{
                background: "hsl(38 95% 92%)",
                color: "hsl(28 80% 22%)",
                border: "1px solid hsl(38 90% 70%)",
              }}
            >
              <Loader2 className="w-3 h-3 animate-spin" /> Pending Review
            </span>
          ) : (
            <Button onClick={() => setOpen(true)} size="sm"
              className="rounded-full font-semibold shadow-md text-white border-0 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
              Complete profile <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>

        {/* Quick book CTA — only show when not yet pending */}
        {!isPending && onBookEvent && (
          <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl border bg-card/70 px-3 py-2.5"
            style={{ borderColor: `${palette.coral}40` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
              style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "hsl(20 40% 25%)" }}>Book your first event</p>
              <p className="text-[11px]" style={{ color: "hsl(20 30% 40%)" }}>
                Booking + a complete profile gives you the blue tick automatically.
              </p>
            </div>
            <Button size="sm" onClick={onBookEvent}
              className="h-8 rounded-full text-white font-semibold shadow"
              style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
              {canBookEvent ? "Book Now" : "Get Quote"}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Verification dialog */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => stage === "form" && setOpen(false)}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="relative w-full max-w-lg rounded-[28px] p-6 shadow-2xl border-2 overflow-hidden max-h-[92vh] overflow-y-auto"
              style={{ background: palette.ivory, borderColor: palette.sky }}
              onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: palette.sky }} />

              {stage === "form" && (
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 60%))` }}>
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: "hsl(220 40% 25%)" }}>
                        Submit for Verification
                      </h3>
                      <p className="text-[11px]" style={{ color: "hsl(220 30% 40%)" }}>
                        Fill all required details to get the blue tick.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Full name *</Label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Mobile *</Label>
                      <Input value={form.mobile} maxLength={10} type="tel" inputMode="numeric"
                        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setForm({ ...form, mobile: d }); }}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Instagram</Label>
                      <Input value={form.instagram_id} onChange={(e) => setForm({ ...form, instagram_id: e.target.value })}
                        placeholder="@yourhandle" className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Age *</Label>
                      <Input value={form.age} type="number" min={1} max={120}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Gender *</Label>
                      <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                        <SelectTrigger className="mt-1 rounded-xl bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="z-[200] bg-popover">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Profession *</Label>
                      <SelectWithOther
                        value={form.occupation}
                        onChange={(v) => setForm({ ...form, occupation: v })}
                        options={["Student", "Designer / Artist", "Engineer / IT", "Business Owner", "Working Professional", "Homemaker"]}
                        placeholder="Select profession"
                        otherLabel="Other (type manually)"
                        otherPlaceholder="e.g. Doctor, Teacher…"
                        triggerClassName="bg-card"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Country</Label>
                      <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v, state: "", city: "" })}>
                        <SelectTrigger className="mt-1 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[200] bg-popover">{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {form.country === "India" ? (
                      <>
                        <div>
                          <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>State *</Label>
                          <SelectWithOther
                            value={form.state}
                            onChange={(v) => setForm({ ...form, state: v, city: "" })}
                            options={states}
                            placeholder="Select state"
                            triggerClassName="mt-1 bg-card"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>City *</Label>
                          <SelectWithOther
                            value={form.city}
                            onChange={(v) => setForm({ ...form, city: v })}
                            options={citiesForState}
                            placeholder={form.state ? "Select city" : "Pick a state first"}
                            disabled={!form.state}
                            triggerClassName="mt-1 bg-card"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-2">
                        <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>City *</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="Your city" className="mt-1 rounded-xl bg-card" />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Address</Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Pincode</Label>
                      <Input value={form.pincode} maxLength={6} type="tel" inputMode="numeric"
                        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setForm({ ...form, pincode: d }); }}
                        className="mt-1 rounded-xl bg-card" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold" style={{ color: "hsl(20 30% 35%)" }}>Why do you want a verified profile?</Label>
                      <Textarea value={form.why_join} onChange={(e) => setForm({ ...form, why_join: e.target.value })}
                        rows={2} className="mt-1 rounded-xl bg-card" placeholder="Tell us a bit about yourself…" />
                    </div>
                  </div>

                  <div className="rounded-xl p-3 text-xs space-y-1"
                    style={{ background: `${palette.sky}15` }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: "hsl(220 30% 40%)" }}>Profile completeness</span>
                      <span className="font-bold" style={{ color: completeness >= 80 ? "hsl(150 60% 35%)" : palette.coral }}>{completeness}%</span>
                    </div>
                    {completeness < 80 && (
                      <p className="text-[11px]" style={{ color: palette.coral }}>
                        ⚠️ Complete at least 80% (avatar, mobile, city, occupation, etc.)
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSubmit} disabled={submitting || completeness < 80}
                      className="flex-1 rounded-full font-bold text-white border-0 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Submit for Review
                    </Button>
                    <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-full">Cancel</Button>
                  </div>
                </div>
              )}

              {stage === "loading" && (
                <div className="relative z-10 py-6 text-center space-y-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto rounded-full border-4 border-transparent shadow-lg"
                    style={{
                      borderTopColor: palette.sky, borderRightColor: palette.coral,
                      borderBottomColor: palette.gold, borderLeftColor: palette.sage,
                    }} />
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: "hsl(220 40% 25%)" }}>Submitting your profile...</h3>
                    <p className="text-sm mt-1" style={{ color: "hsl(220 30% 40%)" }}>Please wait a moment</p>
                  </div>
                </div>
              )}

              {stage === "longer" && (
                <div className="relative z-10 py-4 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${palette.gold}, ${palette.coral})` }}>
                    <Clock className="w-10 h-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: "hsl(20 40% 25%)" }}>⏳ Under Review</h3>
                    <p className="text-sm mt-2" style={{ color: "hsl(20 30% 35%)" }}>
                      Your verification request has been received. Our team will review and approve it within{" "}
                      <span className="font-bold" style={{ color: palette.coral }}>24 hours</span>.
                    </p>
                    <p className="text-xs mt-2 italic" style={{ color: "hsl(20 25% 45%)" }}>
                      You'll get a notification once approved.
                    </p>
                  </div>
                  <Button onClick={() => { setOpen(false); setStage("form"); }}
                    className="w-full rounded-full font-bold text-white border-0 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
                    Got it, thanks! <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserVerificationCard;
