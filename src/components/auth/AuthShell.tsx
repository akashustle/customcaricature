import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

/**
 * Detects "low-power" environments where heavy animation hurts TBT:
 *  - prefers-reduced-motion: reduce
 *  - deviceMemory < 4 GB
 *  - Save-Data header
 *  - hardwareConcurrency < 4
 * On those devices we skip the floating 3D shapes & ambient orbs.
 */
const useLowPowerMode = () => {
  const [low, setLow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const dm = (navigator as any).deviceMemory;
      const hc = navigator.hardwareConcurrency || 8;
      const sd = (navigator as any).connection?.saveData;
      setLow(Boolean(mq.matches || (dm && dm < 4) || hc < 4 || sd));
    } catch { /* ignore */ }
  }, []);
  return low;
};

/**
 * AuthShell — premium 3D split-card auth layout.
 *
 * Desktop: two-column card. Left = branded violet/lavender hero with
 *          floating 3D shapes & illustration. Right = clean white form.
 * Mobile : single rounded white card with subtle brand orbs.
 *
 * Used for Login, Register, ForgotPassword and all admin / workshop /
 * artist login pages so the entire site shares one consistent identity.
 */
export const AuthShell = ({
  title,
  subtitle,
  badge,
  children,
  heroTitle = "Creative Caricature Club",
  heroSubtitle = "Hand-drawn caricature art for weddings, parties & corporate events across India.",
  accent = "violet",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
  /** Optional accent — switches the hero gradient family. */
  accent?: "violet" | "rose" | "emerald" | "amber" | "sky";
}) => {
  const navigate = useNavigate();

  // Each accent maps to a soft pastel hero gradient + 3D shape colors.
  const ACCENTS: Record<
    string,
    { from: string; via: string; to: string; orbA: string; orbB: string }
  > = {
    violet: { from: "#e9e4ff", via: "#d6cdf7", to: "#bfb1ee", orbA: "#a78bfa", orbB: "#f0abfc" },
    rose:   { from: "#ffe4ec", via: "#fbcfe0", to: "#f9a8c8", orbA: "#fb7185", orbB: "#f9a8d4" },
    emerald:{ from: "#dcfce7", via: "#bbf7d0", to: "#86efac", orbA: "#34d399", orbB: "#a7f3d0" },
    amber:  { from: "#fef3c7", via: "#fde68a", to: "#fcd34d", orbA: "#fbbf24", orbB: "#fde68a" },
    sky:    { from: "#dbeafe", via: "#bfdbfe", to: "#93c5fd", orbA: "#60a5fa", orbB: "#a5b4fc" },
  };
  const a = ACCENTS[accent];

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-6 md:py-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, hsl(252 60% 96%) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, hsl(320 70% 96%) 0%, transparent 55%), linear-gradient(180deg, #f7f7fb 0%, #eef0fa 100%)",
      }}
    >
      {/* Ambient floating orbs — desktop only */}
      <motion.div
        aria-hidden
        className="hidden md:block absolute -top-24 -left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-50"
        style={{ background: `radial-gradient(circle, ${a.orbA}, transparent 70%)` }}
        animate={{ y: [0, 22, 0], x: [0, 16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="hidden md:block absolute -bottom-24 -right-16 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none opacity-50"
        style={{ background: `radial-gradient(circle, ${a.orbB}, transparent 70%)` }}
        animate={{ y: [0, -28, 0], x: [0, -14, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Mobile only soft shapes */}
      <div className="md:hidden absolute top-10 right-8 w-24 h-24 rounded-full blur-2xl opacity-50 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${a.orbA}, transparent 70%)` }} />
      <div className="md:hidden absolute bottom-24 left-6 w-32 h-32 rounded-full blur-2xl opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${a.orbB}, transparent 70%)` }} />

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, type: "spring" }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div
          className="rounded-[28px] md:rounded-[36px] overflow-hidden bg-white border border-white shadow-[0_40px_120px_-40px_rgba(80,60,150,0.45),0_12px_30px_-15px_rgba(80,60,150,0.25)]"
          style={{ boxShadow: "0 40px 120px -40px rgba(80,60,150,0.45), 0 12px 30px -15px rgba(80,60,150,0.25)" }}
        >
          <div className="grid md:grid-cols-2 min-h-[560px]">
            {/* ============ LEFT — BRAND HERO (desktop) ============ */}
            <div
              className="hidden md:flex relative flex-col justify-between p-10 overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${a.from} 0%, ${a.via} 55%, ${a.to} 100%)`,
              }}
            >
              {/* logo */}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/90 shadow-lg overflow-hidden ring-1 ring-white">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-700/80">
                    Creative
                  </p>
                  <p className="text-base font-bold text-slate-800 group-hover:text-slate-900">
                    Caricature Club™
                  </p>
                </div>
              </button>

              <div className="relative z-10">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-700/80 mb-3 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> {badge || "Welcome"}
                </p>
                <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 leading-tight">
                  {heroTitle}
                </h1>
                <p className="text-sm xl:text-base text-slate-700/85 mt-3 max-w-sm leading-relaxed">
                  {heroSubtitle}
                </p>
              </div>

              {/* 3D floating shapes — purely decorative */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute right-8 top-24 w-28 h-28 rounded-full"
                  style={{
                    background: "radial-gradient(circle at 30% 30%, #ffffff, #e5e7eb 60%, #c7c9d1)",
                    boxShadow: "inset -10px -10px 24px rgba(0,0,0,0.18), 12px 18px 30px rgba(80,60,150,0.25)",
                  }}
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute right-24 bottom-32 w-20 h-20 rounded-2xl rotate-12"
                  style={{
                    background: `linear-gradient(135deg, ${a.orbA}, ${a.orbB})`,
                    boxShadow: "inset -6px -6px 16px rgba(0,0,0,0.15), 10px 14px 24px rgba(80,60,150,0.3)",
                  }}
                  animate={{ rotate: [12, -6, 12], y: [0, 10, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute left-12 bottom-24 w-16 h-16 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, #fff, ${a.via})`,
                    boxShadow: "inset -4px -4px 10px rgba(0,0,0,0.1), 8px 10px 20px rgba(80,60,150,0.25)",
                  }}
                  animate={{ y: [0, 8, 0], x: [0, 6, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Ring */}
                <motion.div
                  className="absolute right-16 bottom-16 w-32 h-32 rounded-full border-[10px]"
                  style={{
                    borderColor: "#f5d0a9",
                    boxShadow: "8px 12px 24px rgba(80,60,150,0.25)",
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>

            {/* ============ RIGHT — FORM ============ */}
            <div className="bg-white p-6 sm:p-8 md:p-10 flex flex-col justify-center">
              {/* Mobile-only logo header (matches mobile mockup) */}
              <div className="md:hidden flex flex-col items-center text-center mb-6">
                <button onClick={() => navigate("/")} className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-100 mb-3">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
                </button>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-500">
                  Creative Caricature Club™
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
                )}
              </div>

              {children}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthShell;
