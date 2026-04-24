/**
 * Site-wide right-click + copy/inspect deterrent.
 *
 * Active only when the admin enables `disable_right_click` in
 * admin_site_settings. Always disabled on admin & workshop-admin routes so
 * staff can still inspect / copy.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ADMIN_PREFIXES = [
  "/customcad75",
  "/admin-panel",
  "/admin-login",
  "/admin",
  "/CFCAdmin936",
  "/shop-admin",
  "/cccworkshop2006",
  "/workshop-admin-panel",
  "/database-entry-reversal",
];

const RightClickBlocker = () => {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const enabled = (settings as any).disable_right_click?.enabled === true;
  const isAdminRoute = ADMIN_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!enabled || isAdminRoute) return;

    const blockContext = (e: MouseEvent) => { e.preventDefault(); };
    const blockKeys = (e: KeyboardEvent) => {
      // F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault();
      }
    };
    const blockSelect = (e: Event) => e.preventDefault();
    const blockDrag = (e: DragEvent) => e.preventDefault();

    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("selectstart", blockSelect);
    document.addEventListener("dragstart", blockDrag);
    document.body.style.userSelect = "none";
    (document.body.style as any).webkitUserSelect = "none";

    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("dragstart", blockDrag);
      document.body.style.userSelect = "";
      (document.body.style as any).webkitUserSelect = "";
    };
  }, [enabled, isAdminRoute]);

  return null;
};

export default RightClickBlocker;
