/**
 * DesktopFlashStrip — premium 3D "flash card" hero strip shown above the
 * existing tab content on `lg:` screens for both the booking and workshop
 * user dashboards. Inspired by the user's reference UI (sidebar-style
 * layered card grid with rounded white cards, soft brand-colored gradients
 * and floating mini stat tiles). Uses semantic tokens + the project's
 * existing primary/accent palette so it stays on-brand.
 *
 * IMPORTANT: This is purely additive presentation. It does not replace any
 * existing tab content — it sits at the top of the desktop tab area.
 */
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, BadgeCheck, ArrowUpRight, Activity,
  Calendar, Package, Wallet, GraduationCap, MessageCircle, Bell, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Stat = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  Icon: any;
  tint: string; // tailwind gradient stops e.g. "from-primary/15 to-accent/15"
  iconWrap: string; // icon background gradient
  onClick?: () => void;
};

type Props = {
  greeting: string;
  fullName: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  /** Up to 4 stat tiles (responsive grid handles 2/3/4) */
  stats: Stat[];
  /** Optional CTA shown in the hero card */
  primaryCta?: { label: string; onClick: () => void; Icon?: any };
  /** Optional secondary chip-style links rendered below the CTA */
  quickLinks?: { label: string; Icon: any; onClick: () => void }[];
};

const cardShadow =
  "shadow-[0_28px_60px_-30px_hsl(var(--primary)/0.32),0_8px_24px_-12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]";

export const DesktopFlashStrip = ({
  greeting,
  fullName,
  subtitle,
  avatarUrl,
  isVerified,
  stats,
  primaryCta,
  quickLinks,
}: Props) => {
  const initials = (fullName || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="hidden lg:block mb-6">
      <div className="grid grid-cols-12 gap-5">
        {/* Hero card — 7 cols */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`col-span-7 relative overflow-hidden rounded-[28px] border border-border/50 bg-gradient-to-br from-card via-card to-secondary/40 p-7 ${cardShadow}`}
        >
          {/* Ambient orbs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="relative flex items-start gap-5">
            {/* 3D avatar tile */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent blur-md opacity-40" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center text-2xl font-display font-bold shadow-xl overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                ) : (
                  initials
                )}
              </div>
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-500 ring-4 ring-card flex items-center justify-center shadow-md">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="w-3 h-3" /> {greeting}
                </span>
              </div>
              <h1 className="font-display text-3xl xl:text-4xl font-bold text-foreground mt-1 leading-tight truncate">
                {fullName}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{subtitle}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {primaryCta && (
                  <Button
                    onClick={primaryCta.onClick}
                    className="rounded-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-5 shadow-lg"
                  >
                    {primaryCta.Icon && <primaryCta.Icon className="w-4 h-4 mr-2" />}
                    {primaryCta.label}
                  </Button>
                )}
                {quickLinks?.map((q) => (
                  <button
                    key={q.label}
                    onClick={q.onClick}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 px-3.5 py-1.5 text-xs font-bold transition-colors"
                  >
                    <q.Icon className="w-3.5 h-3.5" /> {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mini insight bar */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            <InsightTile Icon={Activity} label="Account" value={isVerified ? "Verified" : "Active"} />
            <InsightTile Icon={Star} label="Member" value="Premium" />
            <InsightTile Icon={TrendingUp} label="Status" value="On track" />
          </div>
        </motion.div>

        {/* Stat flash cards — 5 cols, 2x2 grid */}
        <div className="col-span-5 grid grid-cols-2 gap-4">
          {stats.slice(0, 4).map((s, idx) => (
            <motion.button
              key={s.key}
              type="button"
              onClick={s.onClick}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * idx }}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-[22px] border border-border/50 bg-gradient-to-br ${s.tint} p-5 text-left ${cardShadow} group`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/40 blur-2xl pointer-events-none" />
              <div className="relative flex items-start justify-between">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.iconWrap} text-white flex items-center justify-center shadow-md`}>
                  <s.Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <p className="relative text-[10px] uppercase tracking-[0.16em] font-bold text-muted-foreground mt-4">
                {s.label}
              </p>
              <p className="relative font-display text-2xl xl:text-3xl font-bold text-foreground mt-1 leading-tight">
                {s.value}
              </p>
              {s.hint && (
                <p className="relative text-[11px] text-muted-foreground mt-0.5 truncate">{s.hint}</p>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

const InsightTile = ({ Icon, label, value }: { Icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2.5 rounded-2xl bg-background/60 backdrop-blur border border-border/50 p-3">
    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className="text-xs font-bold text-foreground truncate">{value}</p>
    </div>
  </div>
);

/* Convenience preset palettes for stat tiles */
export const STAT_PRESETS = {
  events: { tint: "from-primary/15 via-card to-card", iconWrap: "from-primary to-accent", Icon: Calendar },
  orders: { tint: "from-accent/15 via-card to-card", iconWrap: "from-accent to-primary", Icon: Package },
  payments: { tint: "from-emerald-100/60 via-card to-card", iconWrap: "from-emerald-500 to-teal-600", Icon: Wallet },
  workshop: { tint: "from-violet-100/60 via-card to-card", iconWrap: "from-violet-500 to-fuchsia-600", Icon: GraduationCap },
  alerts: { tint: "from-amber-100/60 via-card to-card", iconWrap: "from-amber-500 to-orange-600", Icon: Bell },
  chat: { tint: "from-sky-100/60 via-card to-card", iconWrap: "from-sky-500 to-indigo-600", Icon: MessageCircle },
};

export default DesktopFlashStrip;
