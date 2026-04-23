import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Applies the admin-controlled default theme site-wide and reacts to admin
 * changes in real-time. The very first user choice is remembered locally so
 * we don't yank the theme away from a user who actively toggled it — but
 * subsequent admin updates *do* override stale local preferences.
 */
const DefaultThemeApplier = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const { settings } = useSiteSettings();
  const lastAdminMode = useRef<string | null>(null);

  useEffect(() => {
    const adminMode = (settings as any)?.default_theme?.mode as string | undefined;
    if (!adminMode || !["light", "dark", "system"].includes(adminMode)) return;

    // First load → always honour admin's default unless user actively toggled
    // Subsequent updates → override even stale preferences so realtime works
    if (lastAdminMode.current === null) {
      const userOverride = localStorage.getItem("theme-user-override");
      if (!userOverride) setTheme(adminMode);
    } else if (lastAdminMode.current !== adminMode) {
      // Admin changed mode → propagate live to every visitor
      localStorage.removeItem("theme-user-override");
      setTheme(adminMode);
    }

    lastAdminMode.current = adminMode;
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
