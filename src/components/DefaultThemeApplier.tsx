import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Applies the admin-controlled default theme site-wide and reacts to admin
 * changes in real-time.
 *
 * Modes:
 *  - "light"  → force light
 *  - "dark"   → force dark
 *  - "system" → follow OS preference
 *  - "auto"   → time-of-day:
 *       04:00 – 11:00 → "sunlight" (warm light)
 *       11:00 – 18:00 → "light"
 *       18:00 – 04:00 → "dark"
 *
 * The first user toggle is remembered locally so we don't yank the theme
 * away from a user who actively chose; later admin changes still propagate.
 */
const DefaultThemeApplier = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const { settings } = useSiteSettings();
  const lastAdminMode = useRef<string | null>(null);
  const autoIntervalRef = useRef<number | null>(null);

  // Apply "sunlight" body class — a warm tint overlay handled in CSS.
  const applySunlightTint = (on: boolean) => {
    const body = document.body;
    if (!body) return;
    if (on) body.classList.add("theme-sunlight");
    else body.classList.remove("theme-sunlight");
  };

  const computeAutoTheme = (): { theme: "light" | "dark"; sunlight: boolean } => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return { theme: "light", sunlight: true };
    if (hour >= 11 && hour < 18) return { theme: "light", sunlight: false };
    return { theme: "dark", sunlight: false };
  };

  useEffect(() => {
    const adminMode = (settings as any)?.default_theme?.mode as string | undefined;
    if (!adminMode || !["light", "dark", "system", "auto"].includes(adminMode)) return;

    // Clear any previous auto interval whenever mode changes
    if (autoIntervalRef.current) {
      window.clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    applySunlightTint(false);

    const apply = () => {
      if (adminMode === "auto") {
        const { theme, sunlight } = computeAutoTheme();
        setTheme(theme);
        applySunlightTint(sunlight);
      } else {
        setTheme(adminMode);
      }
    };

    if (lastAdminMode.current === null) {
      const userOverride = localStorage.getItem("theme-user-override");
      if (!userOverride) apply();
    } else if (lastAdminMode.current !== adminMode) {
      localStorage.removeItem("theme-user-override");
      apply();
    }

    // For auto mode, re-evaluate every 5 minutes
    if (adminMode === "auto") {
      autoIntervalRef.current = window.setInterval(apply, 5 * 60 * 1000);
    }

    lastAdminMode.current = adminMode;

    return () => {
      if (autoIntervalRef.current) {
        window.clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [(settings as any)?.default_theme?.mode, setTheme]);

  // Update browser theme-color meta tag to match current theme
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#fbf6e9");
    }
  }, [resolvedTheme]);

  return null;
};

export default DefaultThemeApplier;
