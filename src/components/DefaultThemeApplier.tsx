import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DefaultThemeApplier = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings } = useSiteSettings();

  useEffect(() => {
    // Only apply default theme if user hasn't manually changed it
    const userOverride = localStorage.getItem("theme-user-override");
    if (userOverride) return;

    const defaultMode = (settings as any)?.default_theme?.mode;
    if (defaultMode && ["light", "dark", "system"].includes(defaultMode)) {
      setTheme(defaultMode);
    }
  }, [(settings as any)?.default_theme?.mode]);

  // Update browser theme-color meta tag to match current theme
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#fdf8f3");
    }
  }, [resolvedTheme]);

  return null;
};

export default DefaultThemeApplier;
