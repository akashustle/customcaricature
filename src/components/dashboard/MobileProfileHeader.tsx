/**
 * MobileProfileHeader — refreshed mobile-only profile header inspired by the
 * "Perfect Profile Menu" reference (avatar + verified tick + name/handle,
 * dark plan card, then a list of icon menu rows).
 *
 * Drop this at the very top of the Profile tab on mobile. Desktop renders
 * unchanged. Uses semantic tokens; do not hardcode colors.
 */
import { motion } from "framer-motion";
import {
  BadgeCheck, QrCode, Sparkles, ChevronRight, HelpCircle, Settings,
  FileText, Inbox, Share2, MessageCircle,
} from "lucide-react";

type MenuItem = {
  key: string;
  label: string;
  Icon: any;
  badge?: string | number;
  onClick: () => void;
};

type Props = {
  fullName: string;
  handle?: string; // e.g. @display_id
  avatarUrl?: string | null;
  isVerified?: boolean;
  planLabel?: string; // e.g. "Member"
  planSub?: string; // e.g. "Joined Oct 10"
  onShareProfile?: () => void;
  onUpgrade?: () => void;
  /** Menu rows. If omitted a sensible default is used. */
  items?: MenuItem[];
};

export const MobileProfileHeader = ({
  fullName,
  handle,
  avatarUrl,
  isVerified,
  planLabel = "Member",
  planSub,
  onShareProfile,
  onUpgrade,
  items,
}: Props) => {
  const initials = (fullName || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const defaultItems: MenuItem[] = [
    { key: "help", label: "Help & Support", Icon: HelpCircle, onClick: () => window.open("https://wa.me/918433843725", "_blank") },
    { key: "settings", label: "Account settings", Icon: Settings, onClick: () => {} },
    { key: "docs", label: "Documents & receipts", Icon: FileText, onClick: () => {} },
    { key: "inbox", label: "Inbox", Icon: Inbox, badge: undefined, onClick: () => {} },
  ];
  const menu = items && items.length > 0 ? items : defaultItems;

  return (
    <div className="md:hidden mb-4 space-y-3">
      {/* Avatar + actions row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent blur-md opacity-30" />
          <div className="relative w-[72px] h-[72px] rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center font-display text-xl font-bold shadow-xl overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover"  loading="lazy" decoding="async" /> : initials}
          </div>
          {isVerified && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 ring-[3px] ring-card flex items-center justify-center shadow">
              <BadgeCheck className="w-3.5 h-3.5 text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 grid gap-1.5">
          <ActionChip Icon={QrCode} label="Share profile" onClick={onShareProfile} />
          <ActionChip Icon={Sparkles} label="Upgrade plan" onClick={onUpgrade} highlight />
        </div>
      </motion.div>

      {/* Name + handle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="px-1"
      >
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-2xl font-bold text-foreground truncate">{fullName}</h2>
          {isVerified && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" />}
        </div>
        {handle && <p className="text-sm text-muted-foreground truncate">{handle}</p>}
      </motion.div>

      {/* Plan card (dark) */}
      <motion.button
        type="button"
        onClick={onUpgrade}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="relative w-full overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-foreground via-foreground to-foreground/90 text-background shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-background/15 backdrop-blur border border-background/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{planLabel}</p>
            {planSub && <p className="text-[11px] text-background/70 truncate">{planSub}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-background/70" />
        </div>
      </motion.button>

      {/* Grouped menu list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 shadow-sm overflow-hidden"
      >
        {menu.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={m.onClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center flex-shrink-0">
              <m.Icon className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-semibold text-foreground truncate">{m.label}</span>
            {m.badge !== undefined && (
              <span className="text-[10px] font-bold rounded-full bg-destructive/10 text-destructive px-2 py-0.5">
                {m.badge}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </motion.div>
    </div>
  );
};

const ActionChip = ({
  Icon, label, onClick, highlight,
}: { Icon: any; label: string; onClick?: () => void; highlight?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors w-full justify-start ${
      highlight
        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
        : "bg-card border-border/60 text-foreground hover:bg-secondary"
    }`}
  >
    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? "bg-primary/20" : "bg-secondary"}`}>
      <Icon className="w-3.5 h-3.5" />
    </span>
    <span className="truncate">{label}</span>
  </button>
);

export default MobileProfileHeader;
