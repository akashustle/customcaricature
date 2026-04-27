import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export type SidebarTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
};

interface DesktopTabsSidebarProps {
  tabs: SidebarTab[];
  activeTab: string;
  onChange: (key: string) => void;
  title?: string;
  subtitle?: string;
  /** Optional footer slot (e.g. avatar / sign-out). */
  footer?: React.ReactNode;
}

/**
 * Sticky 3D vertical sidebar shown on lg+ screens for the user dashboards.
 * Pure presentational: it just calls `onChange(key)` so it works with both
 * Radix Tabs (Dashboard.tsx — controlled via value/onValueChange) and the
 * custom button-based tab pattern in WorkshopDashboard.tsx.
 */
const DesktopTabsSidebar = ({
  tabs,
  activeTab,
  onChange,
  title = "Dashboard",
  subtitle,
  footer,
}: DesktopTabsSidebarProps) => {
  return (
    <aside className="hidden lg:block">
      <div
        className="sticky top-6 rounded-3xl border border-border/60 bg-card/90 backdrop-blur-xl p-4 overflow-hidden"
        style={{
          boxShadow:
            "0 30px 60px -30px hsl(var(--primary) / 0.35), 0 10px 25px -10px hsl(var(--foreground) / 0.18), inset 0 1px 0 hsl(var(--background) / 0.6)",
          transform: "perspective(1200px) rotateY(-1.5deg)",
        }}
      >
        {/* Decorative orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-40 blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.55), transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative px-2 pt-2 pb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            {subtitle || "Navigation"}
          </p>
          <h3 className="mt-1 text-xl font-bold text-foreground leading-tight">
            {title}
          </h3>
        </div>

        {/* Tabs */}
        <nav className="relative flex flex-col gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all duration-200 text-left ${
                  isActive
                    ? "text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
                        boxShadow:
                          "0 12px 24px -10px hsl(var(--primary) / 0.55), inset 0 1px 0 hsl(var(--background) / 0.25)",
                        transform: "translateZ(0) scale(1.02)",
                      }
                    : undefined
                }
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                    isActive
                      ? "bg-background/20"
                      : "bg-muted/40 group-hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.badge != null && tab.badge !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      isActive
                        ? "bg-background/25 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="desktop-sidebar-active-dot"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-background"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {footer && (
          <div className="relative mt-5 pt-4 border-t border-border/60">
            {footer}
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesktopTabsSidebar;
