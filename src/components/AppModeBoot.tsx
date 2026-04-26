import { useEffect } from "react";
import { useAppMode } from "@/hooks/useAppMode";
import "@/lib/app-shell.css";

/**
 * Sets `data-app-mode` on <html> so the app-shell CSS can activate
 * exclusively for Capacitor + installed-PWA contexts.
 *
 * Also exposes a viewport-height CSS var that survives mobile address-bar
 * resize (the classic 100vh-on-mobile bug).
 */
const AppModeBoot = () => {
  const isAppMode = useAppMode();

  useEffect(() => {
    document.documentElement.dataset.appMode = isAppMode ? "true" : "false";
  }, [isAppMode]);

  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--app-vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  return null;
};

export default AppModeBoot;
