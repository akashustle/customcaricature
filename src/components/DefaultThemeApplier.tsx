import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DefaultThemeApplier = () => {
  const { setTheme } = useTheme();
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

  return null;
};

export default DefaultThemeApplier;
