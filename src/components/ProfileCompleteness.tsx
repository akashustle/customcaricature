/**
 * Profile completeness + real-time verification status widgets.
 *
 * - <VerificationBadge profile> shows a live pill: Not verified / Verifying /
 *   Verified. It re-reads from the `profile` prop, so it updates instantly
 *   whenever the parent's realtime channel refreshes the profile.
 * - <ProfileCompleteness profile> shows a percentage + missing-field list.
 * - REQUIRED_FIELDS / isProfileComplete are exported so the Verification Card
 *   can disable the "Get Verified" button until everything is filled.
 */
import { BadgeCheck, Loader2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AnyProfile = {
  full_name?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  age?: number | string | null;
  gender?: string | null;
  is_verified?: boolean;
  verification_status?: string | null;
} | null | undefined;

export const REQUIRED_FIELDS: { key: keyof NonNullable<AnyProfile>; label: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "mobile", label: "WhatsApp number" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
];

const isFilled = (v: unknown) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return String(v).trim().length > 0;
};

export const profileCompleteness = (profile: AnyProfile) => {
  if (!profile) return { filled: 0, total: REQUIRED_FIELDS.length, percent: 0, missing: REQUIRED_FIELDS.map(f => f.label) };
  const missing: string[] = [];
  let filled = 0;
  for (const f of REQUIRED_FIELDS) {
    const v = (profile as any)[f.key];
    if (f.key === "mobile") {
      if (typeof v === "string" && v.replace(/\D/g, "").length >= 10) filled++; else missing.push(f.label);
    } else if (isFilled(v)) {
      filled++;
    } else {
      missing.push(f.label);
    }
  }
  const total = REQUIRED_FIELDS.length;
  return { filled, total, percent: Math.round((filled / total) * 100), missing };
};

export const isProfileComplete = (profile: AnyProfile) => profileCompleteness(profile).percent === 100;

type Status = "verified" | "pending" | "unverified";
const resolveStatus = (profile: AnyProfile): Status => {
  if (!profile) return "unverified";
  if (profile.is_verified === true || profile.verification_status === "verified") return "verified";
  if (profile.verification_status === "pending") return "pending";
  return "unverified";
};

export const VerificationBadge = ({ profile, className = "" }: { profile: AnyProfile; className?: string }) => {
  const status = resolveStatus(profile);
  const map: Record<Status, { label: string; icon: JSX.Element; cls: string; ariaLabel: string }> = {
    verified: {
      label: "Verified",
      icon: <BadgeCheck className="w-3.5 h-3.5" />,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50",
      ariaLabel: "Profile verified",
    },
    pending: {
      label: "Verifying…",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      cls: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50",
      ariaLabel: "Profile verification under review",
    },
    unverified: {
      label: "Not verified",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700",
      ariaLabel: "Profile not verified",
    },
  };
  const cfg = map[status];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, y: -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        role="status"
        aria-live="polite"
        aria-label={cfg.ariaLabel}
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${cfg.cls} ${className}`}
      >
        {cfg.icon}
        {cfg.label}
      </motion.span>
    </AnimatePresence>
  );
};

export const ProfileCompleteness = ({ profile, className = "" }: { profile: AnyProfile; className?: string }) => {
  const { percent, missing, filled, total } = profileCompleteness(profile);
  const colour = percent === 100 ? "hsl(150 60% 40%)" : percent >= 60 ? "hsl(36 90% 50%)" : "hsl(8 78% 60%)";
  return (
    <div className={`rounded-2xl border border-border bg-card p-3 ${className}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Complete your profile</p>
          <p className="text-[11px] text-muted-foreground">
            {percent === 100
              ? "All set — you can request verification."
              : `${filled} of ${total} details filled. ${missing.length ? "Missing: " + missing.join(", ") : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums" style={{ color: colour }}>{percent}%</span>
        </div>
      </div>
      {/* Progress track */}
      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${colour}, ${colour})` }}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
