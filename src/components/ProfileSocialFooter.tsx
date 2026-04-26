/**
 * ProfileSocialFooter — bottom block on both Booking and Workshop dashboard
 * Profile tabs. Includes:
 *  - Six brand contact buttons (WhatsApp, Call, Email, Instagram, YouTube,
 *    Facebook) with auto-filled messages where applicable.
 *  - A dark-mode toggle (uses next-themes; same store as the rest of the app).
 *  - All links route through `openExternal()` so when the app is installed
 *    as a PWA, they open inside the app shell instead of a separate browser.
 *
 * Uses semantic tokens only (bg-card, text-foreground, etc.) so it stays
 * correct in both light and dark mode.
 */
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle, Phone, Mail, Instagram, Youtube, Facebook, Moon, Sun,
} from "lucide-react";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { openExternal } from "@/lib/pwa-link";

type Variant = "booking" | "workshop";

const DEFAULT_WA_MSG_BOOKING =
  "Hi Creative Caricature Club! 👋 I'm a member and I have a quick question about my booking — could you please help?";
const DEFAULT_WA_MSG_WORKSHOP =
  "Hi Creative Caricature Club! 👋 I'm enrolled in your workshop and I have a quick question — could you please help?";
const DEFAULT_EMAIL_SUBJECT_BOOKING = "Help with my booking";
const DEFAULT_EMAIL_SUBJECT_WORKSHOP = "Help with my workshop";

const ProfileSocialFooter = ({
  variant = "booking",
  userName,
}: {
  variant?: Variant;
  userName?: string;
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Avoid SSR/hydration flicker for the toggle icon
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const contact = useSiteSetting<any>("global_contact", {});
  const wa = (contact?.whatsapp_number || "918369594271").replace(/[^0-9]/g, "");
  const phone = (contact?.phone_number || contact?.whatsapp_number || "918369594271").replace(/[^0-9]/g, "");
  const email = contact?.email || "creativecaricatureclub@gmail.com";
  const igUrl = contact?.instagram_url || "https://instagram.com/creativecaricatureclub";
  const ytUrl = contact?.youtube_url || "https://www.youtube.com/@creativecaricatureclub";
  const fbUrl = contact?.facebook_url || "https://facebook.com/creativecaricatureclub";

  const greeting = userName ? `Hi, this is ${userName}. ` : "";
  const waMsg = greeting + (variant === "workshop" ? DEFAULT_WA_MSG_WORKSHOP : DEFAULT_WA_MSG_BOOKING);
  const emailSubject = variant === "workshop" ? DEFAULT_EMAIL_SUBJECT_WORKSHOP : DEFAULT_EMAIL_SUBJECT_BOOKING;

  const items: {
    key: string;
    label: string;
    icon: any;
    color: string; // brand tint for the icon chip
    onClick: () => void;
  }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      color: "bg-emerald-500/15 text-emerald-600",
      onClick: () => openExternal(`https://wa.me/${wa}?text=${encodeURIComponent(waMsg)}`),
    },
    {
      key: "call",
      label: "Call",
      icon: Phone,
      color: "bg-sky-500/15 text-sky-600",
      onClick: () => openExternal(`tel:+${phone}`),
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      color: "bg-rose-500/15 text-rose-600",
      onClick: () =>
        openExternal(
          `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(greeting)}`
        ),
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: Instagram,
      color: "bg-pink-500/15 text-pink-600",
      onClick: () => openExternal(igUrl),
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: Youtube,
      color: "bg-red-500/15 text-red-600",
      onClick: () => openExternal(ytUrl),
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "bg-blue-500/15 text-blue-600",
      onClick: () => openExternal(fbUrl),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.18)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-primary">
            Stay connected
          </p>
          <h3 className="font-display text-base font-bold text-foreground leading-tight mt-0.5">
            Reach us anywhere
          </h3>
        </div>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 h-9 hover:bg-secondary transition-colors"
        >
          {mounted ? (
            isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />
          ) : (
            <Sun className="w-4 h-4 text-primary" />
          )}
          <span className="text-[11px] font-sans font-bold text-foreground">
            {mounted ? (isDark ? "Dark" : "Light") : "Theme"}
          </span>
        </button>
      </div>

      {/* Social grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it) => (
          <motion.button
            key={it.key}
            type="button"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={it.onClick}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/40 hover:bg-secondary p-3 min-h-[76px] transition-colors"
          >
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${it.color}`}>
              <it.icon className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-sans font-bold text-foreground leading-none">
              {it.label}
            </span>
          </motion.button>
        ))}
      </div>

      <p className="text-[11px] font-sans text-muted-foreground mt-3 text-center">
        Tap any option to chat with us — messages come pre-filled so it's quick.
      </p>
    </motion.div>
  );
};

export default ProfileSocialFooter;
