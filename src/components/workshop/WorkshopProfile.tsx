import React, { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Instagram, Calendar, Clock, Briefcase, Edit2, Save, X,
  MapPin, Key, Camera, Loader2, BadgeCheck, ShieldCheck,
  Sparkles, Globe, ChevronRight, ArrowRight, Cake, Users as UsersIcon, Map, Wallet, IndianRupee,
} from "lucide-react";
import { getStates, INDIA_LOCATIONS } from "@/lib/india-locations";
import WorkshopBookingLinkCard from "@/components/workshop/WorkshopBookingLinkCard";
import EditRequestDialog from "@/components/EditRequestDialog";

/**
 * Premium colourful 3D Workshop Profile Card.
 * Inspired by ivory paper / coral / sage / soft gold palette from the user's
 * reference image. All colours are HSL semantic-friendly so they look great
 * in both dark + light modes, and they don't override the global theme.
 */

const COUNTRIES = ["India", "USA", "UK", "UAE", "Canada", "Australia", "Singapore", "Germany", "Other"];

const WorkshopProfile = ({ user, darkMode: _darkMode = false }: { user: any; darkMode?: boolean }) => {
  // Profile card is always rendered in a light, paper-like palette so all
  // text stays clearly visible regardless of the global theme. Per design
  // request: don't use dark colours here.
  const darkMode = false;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyStage, setVerifyStage] = useState<"idle" | "loading" | "longer">("idle");
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<any>(user);

  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    instagram_id: user.instagram_id || "",
    age: user.age?.toString() || "",
    occupation: user.occupation || "",
    gender: user.gender || "",
    why_join: user.why_join || "",
    country: user.country || "India",
    state: user.state || "",
    city: user.city || "",
  });
  const [cityMode, setCityMode] = useState<"select" | "manual">("select");

  useEffect(() => {
    setProfileData(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      instagram_id: user.instagram_id || "",
      age: user.age?.toString() || "",
      occupation: user.occupation || "",
      gender: user.gender || "",
      why_join: user.why_join || "",
      country: user.country || "India",
      state: user.state || "",
      city: user.city || "",
    });
  }, [user]);

  const states = useMemo(() => getStates(), []);
  // Flatten all cities for the chosen state across districts (city-only dropdown)
  const citiesForState = useMemo(() => {
    if (!form.state || form.country !== "India") return [];
    const districts = INDIA_LOCATIONS[form.state];
    if (!districts) return [];
    const all = Object.values(districts).flat();
    return Array.from(new Set(all)).sort();
  }, [form.state, form.country]);

  const callUpdate = async (extra: Record<string, any>) => {
    const payload = {
      user_id: profileData.id,
      login_mobile: profileData.mobile || "",
      login_email: profileData.email || "",
      ...extra,
    };
    return supabase.functions.invoke("workshop-update-profile", { body: payload });
  };

  const applyUpdated = (updated: any) => {
    setProfileData(updated);
    localStorage.setItem("workshop_user", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("workshop-user-updated", { detail: updated }));
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    // Strict client-side validation prevents long uploads that trigger the
    // Postgres "canceling statement due to statement timeout" error.
    const { validateImageUpload } = await import("@/lib/image-upload-validator");
    const check = await validateImageUpload(file);
    if (check.valid === false) {
      toast({ title: check.title, description: check.message, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profileData.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;

      const { data, error } = await callUpdate({ avatar_url: url });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Upload failed");
      applyUpdated(data.user || { ...profileData, avatar_url: url });
      await consumeEditIfNeeded();
      toast({ title: "✅ Photo updated" });
    } catch (e: any) {
      const msg = e?.message || "";
      const friendly = /timeout|canceling statement/i.test(msg)
        ? "The server took too long. Please try a smaller photo (under 2 MB) or check your internet."
        : msg || "Upload failed";
      toast({ title: "Upload failed", description: friendly, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // India users MUST have both state + city. International users only need city.
    if (form.country === "India") {
      if (!form.state || form.state.trim().length < 2) {
        toast({ title: "State required", description: "Please pick your state from the list.", variant: "destructive" });
        return;
      }
      if (!form.city || form.city.trim().length < 2) {
        toast({ title: "City required", description: "Please pick or type your city.", variant: "destructive" });
        return;
      }
    } else {
      if (!form.city || form.city.trim().length < 2) {
        toast({ title: "City required", description: "Please type the city you live in.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    const { data, error } = await callUpdate({
      name: form.name,
      email: form.email || null,
      mobile: form.mobile,
      instagram_id: form.instagram_id || null,
      age: form.age ? parseInt(form.age, 10) : null,
      occupation: form.occupation || null,
      gender: form.gender || null,
      why_join: form.why_join || null,
      country: form.country || "India",
      state: form.country === "India" ? (form.state || null) : (form.state || null),
      city: form.city || null,
    });
    if (error || !data?.success) {
      toast({ title: "Error updating profile", description: data?.error || error?.message || "Please try again.", variant: "destructive" });
      setSaving(false);
      return;
    }
    applyUpdated(data.user || { ...profileData, ...form, age: form.age ? parseInt(form.age, 10) : null });
    await consumeEditIfNeeded();
    toast({ title: "✅ Profile Updated!" });
    setEditing(false);
    setSaving(false);
  };

  // Verification flow
  const completeness = (() => {
    const fields = [profileData.name, profileData.email, profileData.mobile, profileData.age, profileData.occupation, profileData.country, profileData.city, profileData.gender, profileData.instagram_id, profileData.why_join, profileData.avatar_url];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const handleSubmitVerification = async () => {
    if (!profileData.avatar_url) {
      toast({
        title: "📸 Profile photo required",
        description: "Please upload your own profile photo first — verification needs your real face.",
        variant: "destructive",
      });
      return;
    }
    if (completeness < 100) {
      const missing: string[] = [];
      if (!profileData.name) missing.push("Name");
      if (!profileData.email) missing.push("Email");
      if (!profileData.mobile) missing.push("Mobile");
      if (!profileData.age) missing.push("Age");
      if (!profileData.occupation) missing.push("Occupation");
      if (!profileData.country) missing.push("Country");
      if (!profileData.city) missing.push("City");
      if (!profileData.gender) missing.push("Gender");
      if (!profileData.instagram_id) missing.push("Instagram");
      if (!profileData.why_join) missing.push("Why join");
      if (!profileData.avatar_url) missing.push("Profile photo");
      toast({
        title: "100% profile required",
        description: `Please fill: ${missing.join(", ")} to request the blue tick.`,
        variant: "destructive",
      });
      return;
    }
    setVerifySubmitting(true);
    setVerifyStage("loading");
    try {
      const { data, error } = await callUpdate({
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message);
      applyUpdated(data.user || { ...profileData, verification_status: "pending", verification_submitted_at: new Date().toISOString() });

      // Show 5 sec processing, then "taking longer than expected" message
      setTimeout(() => {
        setVerifyStage("longer");
      }, 5000);
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
      setVerifyStage("idle");
      setVerifyOpen(false);
    } finally {
      setVerifySubmitting(false);
    }
  };

  const verificationStatus: string = profileData.verification_status || (profileData.is_verified ? "verified" : "unverified");
  const isVerified = profileData.is_verified === true || verificationStatus === "verified";
  const isPending = verificationStatus === "pending";
  // Once verified the user can't edit until an admin grants edits_remaining > 0.
  const editsRemaining: number = Number(profileData.edits_remaining ?? 0);
  const editLocked = isVerified && editsRemaining <= 0;
  const consumeEditIfNeeded = async () => {
    if (!isVerified) return;
    if (editsRemaining <= 0) return;
    try {
      await (supabase.from("workshop_users") as any)
        .update({ edits_remaining: Math.max(0, editsRemaining - 1) })
        .eq("id", profileData.id);
      applyUpdated({ ...profileData, edits_remaining: Math.max(0, editsRemaining - 1) });
    } catch {/* non-fatal */}
  };

  // Detail rendering — distinct icon per field so the round chip never looks blank.
  const personalDetails = [
    { icon: User, label: "Name", value: profileData.name, key: "name" },
    { icon: Mail, label: "Email", value: profileData.email, key: "email" },
    { icon: Phone, label: "Mobile", value: profileData.mobile, key: "mobile" },
    { icon: Instagram, label: "Instagram", value: profileData.instagram_id || "—", key: "instagram_id" },
    { icon: Cake, label: "Age", value: profileData.age || "—", key: "age" },
    { icon: Briefcase, label: "Occupation", value: profileData.occupation || "—", key: "occupation" },
    { icon: UsersIcon, label: "Gender", value: profileData.gender || "—", key: "gender" },
    { icon: Sparkles, label: "Why Join", value: profileData.why_join || "—", key: "why_join" },
  ];

  const locationDetails = [
    { icon: Globe, label: "Country", value: profileData.country || "India" },
    { icon: Map, label: "State", value: profileData.state || "—" },
    { icon: MapPin, label: "City", value: profileData.city || "—" },
  ];

  const readOnlyDetails = [
    { icon: Calendar, label: "Workshop Date",
      value: profileData.workshop_date
        ? new Date(profileData.workshop_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
    },
    { icon: Clock, label: "Slot",
      value: profileData.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : profileData.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : profileData.slot,
    },
    { icon: Key, label: "Secret Code", value: profileData.secret_code || "—" },
  ];

  const paymentInfo = [
    { icon: Wallet, label: "Payment Status", value: (profileData.payment_status || "pending").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    { icon: IndianRupee, label: "Amount Paid", value: profileData.payment_amount ? `₹${profileData.payment_amount}` : "—" },
  ];

  const initials = (profileData.name || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  // Lighter, whiter palette — soft accents, white surfaces
  const palette = {
    ivory: "#ffffff",
    coral: "hsl(8 78% 72%)",
    gold: "hsl(36 85% 65%)",
    sage: "hsl(150 45% 68%)",
    plum: "hsl(335 55% 65%)",
    sky: "hsl(210 90% 70%)",
  };

  return (
    <div className="space-y-5">
      {/* ============== HERO PROFILE CARD ============== */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: -5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative overflow-hidden rounded-[28px] p-6 md:p-7 border shadow-[0_30px_60px_-25px_rgba(80,60,150,0.18)]"
        style={{
          background: darkMode
            ? `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.8) 100%)`
            : `linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef2ff 100%)`,
          borderColor: darkMode ? "hsl(var(--border))" : "rgba(255,255,255,0.95)",
          boxShadow: darkMode ? undefined : "0 30px 60px -25px hsl(252 60% 40% / 0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* 3D ambient orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${palette.coral}, transparent 70%)` }} />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${palette.sage}, transparent 70%)` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${palette.gold}, transparent 70%)` }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5">
          {/* Avatar */}
          <motion.div className="relative" whileHover={{ scale: 1.05, rotate: 2 }}>
            <div className="absolute -inset-2 rounded-full blur-md opacity-70"
              style={{ background: `conic-gradient(from 0deg, ${palette.coral}, ${palette.gold}, ${palette.sage}, ${palette.plum}, ${palette.coral})` }} />
            <Avatar className="relative w-28 h-28 md:w-32 md:h-32 border-4 shadow-2xl"
              style={{ borderColor: palette.ivory }}>
              <AvatarImage src={profileData.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl md:text-4xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => {
                if (editLocked) { setEditRequestOpen(true); return; }
                fileRef.current?.click();
              }}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition border-2"
              style={{ background: editLocked ? "hsl(40 90% 55%)" : palette.coral, borderColor: palette.ivory, color: "white" }}
              aria-label={editLocked ? "Request edit to change photo" : "Change profile photo"}
              title={editLocked ? "Request edit access to change photo" : "Change profile photo"}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : editLocked ? <span className="text-[10px] font-bold">🔒</span> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
          </motion.div>

          {/* Identity */}
          <div className="flex-1 min-w-0 w-full text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight break-words"
                style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(20 30% 20%)" }}>
                {profileData.name || "Workshop Student"}
              </h2>
              {isVerified && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring" }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full shadow-xl ring-2 ring-white"
                  style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 60%))` }}
                  title="Verified student"
                  aria-label="Verified"
                >
                  <BadgeCheck className="w-5 h-5 text-white" strokeWidth={2.5} fill="currentColor" />
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 mt-1.5 flex-wrap">
              <Badge
                className="text-[10px] font-semibold border bg-white text-slate-800 border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
              >
                🎨 {profileData.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
              </Badge>
              {profileData.roll_number && (
                <Badge
                  className="text-[10px] font-semibold border bg-white text-slate-800 border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                >
                  Roll #{profileData.roll_number}
                </Badge>
              )}
              {profileData.skill_level && (
                <Badge
                  className="text-[10px] font-semibold border bg-white text-slate-800 border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                >
                  {profileData.skill_level}
                </Badge>
              )}
            </div>

            {/* Email + city — wraps fully, never truncates */}
            <p className="text-xs md:text-sm mt-2 opacity-80 break-all leading-snug"
              style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 25% 22%)" }}>
              {profileData.email || profileData.mobile}
              {(profileData.city || profileData.country) && (
                <span className="opacity-80"> • {profileData.city || "City not set"}, {profileData.country || "India"}</span>
              )}
            </p>

            {/* Profile completeness ring */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: darkMode ? "hsl(var(--muted))" : "hsl(38 30% 80%)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${completeness}%` }} transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${palette.coral}, ${palette.gold}, ${palette.sage})` }} />
              </div>
              <span className="text-xs font-bold"
                style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(20 35% 22%)" }}>
                {completeness}%
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex md:flex-col gap-2">
              {editLocked ? (
                <Button size="sm" onClick={() => setEditRequestOpen(true)}
                  className="rounded-full font-semibold shadow-md text-white border-0"
                  style={{ background: `linear-gradient(135deg, hsl(40 90% 55%), hsl(20 85% 55%))` }}>
                  🔒 Request Edit
                </Button>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}
                  className="rounded-full font-semibold shadow-md text-white border-0"
                  style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit{isVerified && editsRemaining > 0 ? ` (${editsRemaining} left)` : ""}
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ============== VERIFICATION CARD ============== */}
      {!isVerified && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode
              ? `linear-gradient(135deg, hsl(220 30% 12%), hsl(220 25% 18%))`
              : `linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)`,
            borderColor: darkMode ? palette.sky : "rgba(255,255,255,0.9)",
            boxShadow: darkMode ? undefined : "0 20px 45px -25px hsl(210 80% 50% / 0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: palette.sky }} />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 60%))` }}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2"
                style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(220 50% 25%)" }}>
                Become a Verified Student <BadgeCheck className="w-5 h-5" style={{ color: palette.sky }} />
              </h3>
              <p className="text-xs md:text-sm mt-0.5"
                style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(220 35% 28%)" }}>
                {isPending
                  ? "Your verification is under review. We'll notify you once approved."
                  : "Complete your profile and submit for verification to get a blue tick on your profile."}
              </p>
            </div>
            {isPending ? (
              <span
                className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex-shrink-0"
                style={{
                  background: "hsl(38 95% 92%)",
                  color: "hsl(28 80% 22%)",
                  border: "1px solid hsl(38 90% 70%)",
                }}
              >
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Pending Review
              </span>
            ) : (
              <Button onClick={() => setVerifyOpen(true)} size="sm"
                className="rounded-full font-semibold shadow-md text-white border-0 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
                Get Verified <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* ============== EDIT FORM ============== */}
      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode ? "hsl(var(--card))" : "#ffffff",
            borderColor: darkMode ? "hsl(var(--border))" : "rgba(226,232,240,0.9)",
          }}>
          <h3 className="font-bold text-lg mb-4" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(20 30% 20%)" }}>
            ✏️ Edit Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {personalDetails.map((d) => (
              <div key={d.key} className={d.key === "why_join" ? "md:col-span-2" : ""}>
                <Label className="text-xs font-semibold text-slate-600">
                  {d.label}
                </Label>
                {d.key === "why_join" ? (
                  <Textarea
                    value={(form as any)[d.key] || ""}
                    onChange={(e) => setForm({ ...form, [d.key]: e.target.value })}
                    rows={2}
                    className="mt-1 rounded-xl shadow-none bg-white"
                  />
                ) : d.key === "gender" ? (
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger className="mt-1 rounded-xl shadow-none bg-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <IconInput
                    icon={d.icon}
                    value={(form as any)[d.key] || ""}
                    onChange={(e) => setForm({ ...form, [d.key]: e.target.value })}
                    type={d.key === "age" ? "number" : "text"}
                    maxLength={d.key === "mobile" ? 10 : undefined}
                    placeholder={d.label}
                  />
                )}
              </div>
            ))}

            {/* Country / State / City */}
            <div>
              <Label className="text-xs font-semibold" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                Country
              </Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v, state: "", city: "" })}>
                <SelectTrigger className="mt-1 rounded-xl shadow-none bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {form.country === "India" ? (
              <>
                <div>
                  <Label className="text-xs font-semibold" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                    State *
                  </Label>
                  <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                    <SelectTrigger className="mt-1 rounded-xl shadow-none bg-white"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                      City *
                    </Label>
                    <button type="button" onClick={() => setCityMode(cityMode === "select" ? "manual" : "select")}
                      className="text-[10px] font-bold underline" style={{ color: palette.coral }}>
                      {cityMode === "select" ? "Type manually" : "Choose from list"}
                    </button>
                  </div>
                  {cityMode === "select" && form.state && citiesForState.length > 0 ? (
                    <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                      <SelectTrigger className="mt-1 rounded-xl shadow-none bg-white"><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{citiesForState.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Type your city" className="mt-1 rounded-xl shadow-none bg-white" />
                  )}
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                  City *
                </Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Your city" className="mt-1 rounded-xl shadow-none bg-white" />
              </div>
            )}

            {readOnlyDetails.map((d) => (
              <div key={d.label}>
                <Label className="text-xs font-semibold opacity-70" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                  {d.label} (locked)
                </Label>
                <Input value={d.value} disabled className="mt-1 rounded-xl opacity-60 shadow-none bg-white" />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: darkMode ? "hsl(var(--border))" : `${palette.gold}40` }}>
            <Button onClick={handleSave} disabled={saving} className="rounded-full font-bold text-white border-0 shadow-md"
              style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} className="rounded-full">
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* ============== PERSONAL INFO GRID ============== */}
      {!editing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode ? "hsl(var(--card))" : `linear-gradient(135deg, #ffffff 0%, #fff7f5 100%)`,
            borderColor: darkMode ? "hsl(var(--border))" : "rgba(255,255,255,0.9)",
            boxShadow: darkMode ? undefined : "0 20px 45px -25px hsl(8 60% 50% / 0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2"
            style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(8 50% 30%)" }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
              style={{ background: palette.coral }}>👤</span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {personalDetails.map((d, i) => (
              <DetailItem key={d.label} icon={d.icon} label={d.label} value={d.value} darkMode={darkMode}
                color={[palette.coral, palette.gold, palette.sage, palette.plum, palette.sky][i % 5]} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== LOCATION CARD ============== */}
      {!editing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode ? "hsl(var(--card))" : `linear-gradient(135deg, #ffffff 0%, #f3fbf7 100%)`,
            borderColor: darkMode ? "hsl(var(--border))" : "rgba(255,255,255,0.9)",
            boxShadow: darkMode ? undefined : "0 20px 45px -25px hsl(150 50% 40% / 0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2"
            style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(150 40% 25%)" }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
              style={{ background: palette.sage }}>🌍</span>
            Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {locationDetails.map((d, i) => (
              <DetailItem key={d.label} icon={d.icon} label={d.label} value={d.value} darkMode={darkMode}
                color={[palette.sage, palette.sky, palette.gold][i]} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== WORKSHOP DETAILS CARD ============== */}
      {!editing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode ? "hsl(var(--card))" : `linear-gradient(135deg, #ffffff 0%, #fffaf0 100%)`,
            borderColor: darkMode ? "hsl(var(--border))" : "rgba(255,255,255,0.9)",
            boxShadow: darkMode ? undefined : "0 20px 45px -25px hsl(36 60% 45% / 0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2"
            style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(30 50% 25%)" }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
              style={{ background: palette.gold }}>🎨</span>
            Workshop Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {readOnlyDetails.map((d, i) => (
              <DetailItem key={d.label} icon={d.icon} label={d.label} value={d.value} darkMode={darkMode}
                color={[palette.gold, palette.coral, palette.plum][i]} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== PAYMENT CARD ============== */}
      {!editing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-[24px] p-5 border shadow-[0_20px_45px_-25px_rgba(80,60,150,0.15)]"
          style={{
            background: darkMode ? "hsl(var(--card))" : `linear-gradient(135deg, #ffffff 0%, #fdf6fa 100%)`,
            borderColor: darkMode ? "hsl(var(--border))" : "rgba(255,255,255,0.9)",
            boxShadow: darkMode ? undefined : "0 20px 45px -25px hsl(335 50% 45% / 0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2"
            style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(335 40% 25%)" }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
              style={{ background: palette.plum }}>💳</span>
            Payment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {paymentInfo.map((d, i) => (
              <DetailItem key={d.label} icon={d.icon} label={d.label} value={d.value} darkMode={darkMode}
                color={[palette.plum, palette.coral][i]} />
            ))}
          </div>
          {profileData.payment_status === "pending" && (
            <p className="text-xs mt-3 italic" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(335 40% 30%)" }}>
              Payment status will be updated once confirmed by admin.
            </p>
          )}
        </motion.div>
      )}

      {/* ============== BOOKING ACCOUNT LINK CARD ============== */}
      <WorkshopBookingLinkCard
        workshopUser={profileData}
        darkMode={darkMode}
        onLinked={(authId) => setProfileData({ ...profileData, auth_user_id: authId })}
      />

      {/* ============== VERIFICATION MODAL ============== */}
      <AnimatePresence>
        {verifyOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => verifyStage === "idle" && setVerifyOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-[28px] p-6 shadow-2xl border-2 overflow-hidden"
              style={{
                background: darkMode ? "hsl(var(--card))" : palette.ivory,
                borderColor: palette.sky,
              }}
              onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: palette.sky }} />

              {verifyStage === "idle" && (
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 60%))` }}>
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-center"
                    style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(220 40% 25%)" }}>
                    Submit for Verification
                  </h3>
                  <p className="text-sm text-center"
                    style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(220 35% 30%)" }}>
                    By submitting, you confirm all your profile details are accurate. Once approved, you'll get a verified blue tick on your profile.
                  </p>
                  <div className="rounded-xl p-3 text-xs space-y-1"
                    style={{ background: darkMode ? "hsl(var(--muted) / 0.5)" : `${palette.sky}15` }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(220 35% 30%)" }}>Profile completeness</span>
                      <span className="font-bold" style={{ color: completeness >= 80 ? "hsl(150 60% 35%)" : palette.coral }}>{completeness}%</span>
                    </div>
                    {completeness < 80 && (
                      <p className="text-[11px]" style={{ color: palette.coral }}>
                        ⚠️ Complete at least 80% (avatar, mobile, city, occupation, etc.)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSubmitVerification} disabled={verifySubmitting || completeness < 80}
                      className="flex-1 rounded-full font-bold text-white border-0 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${palette.sky}, hsl(220 80% 55%))` }}>
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Submit
                    </Button>
                    <Button variant="ghost" onClick={() => setVerifyOpen(false)} className="rounded-full">Cancel</Button>
                  </div>
                </div>
              )}

              {verifyStage === "loading" && (
                <div className="relative z-10 py-6 text-center space-y-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto rounded-full border-4 border-transparent shadow-lg"
                    style={{
                      borderTopColor: palette.sky,
                      borderRightColor: palette.coral,
                      borderBottomColor: palette.gold,
                      borderLeftColor: palette.sage,
                    }} />
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(220 40% 25%)" }}>
                      Verifying your profile...
                    </h3>
                    <p className="text-sm mt-1" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(220 35% 30%)" }}>
                      Please wait a moment
                    </p>
                  </div>
                </div>
              )}

              {verifyStage === "longer" && (
                <div className="relative z-10 py-4 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${palette.gold}, ${palette.coral})` }}>
                    <Clock className="w-10 h-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: darkMode ? "hsl(var(--foreground))" : "hsl(20 40% 25%)" }}>
                      ⏳ Taking longer than expected
                    </h3>
                    <p className="text-sm mt-2" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 30% 25%)" }}>
                      Your verification request has been received. Our team will review and approve it within <span className="font-bold" style={{ color: palette.coral }}>24 hours</span>.
                    </p>
                    <p className="text-xs mt-2 italic" style={{ color: darkMode ? "hsl(var(--muted-foreground))" : "hsl(20 25% 45%)" }}>
                      You'll get a notification once approved. You can keep using the workshop in the meantime.
                    </p>
                  </div>
                  <Button onClick={() => { setVerifyOpen(false); setVerifyStage("idle"); }}
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

      {/* Edit-request dialog for verified students */}
      <EditRequestDialog
        open={editRequestOpen}
        onClose={() => setEditRequestOpen(false)}
        scope="workshop"
        userId={profileData.id}
        userName={profileData.name}
      />
    </div>
  );
};

const IconInput = ({
  icon: Icon,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: any }) => (
  <div className="relative mt-1">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    <input
      {...props}
      className={
        "flex h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-900 " +
        "pl-10 pr-3 py-2 text-sm placeholder:text-slate-400 " +
        "focus-visible:outline-none focus-visible:border-primary " +
        "focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] " +
        "transition-[box-shadow,border-color] duration-200 " +
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50 " +
        className
      }
    />
  </div>
);

const DetailItem = ({ icon: Icon, label, value, darkMode, color }: any) => (
  <motion.div whileHover={{ scale: 1.02, y: -2 }}
    className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm transition-all"
    style={{
      background: darkMode ? "hsl(var(--muted) / 0.4)" : "hsl(0 0% 100% / 0.7)",
      borderColor: darkMode ? "hsl(var(--border))" : `${color}40`,
      backdropFilter: "blur(8px)",
    }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
      <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-sm font-bold truncate text-slate-900">
        {value}
      </p>
    </div>
  </motion.div>
);

export default WorkshopProfile;
