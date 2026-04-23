import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";

/**
 * Forces the admin / admin-style routes to always render in **light** mode,
 * regardless of the visitor-facing default theme. Restores the previous
 * theme when the admin leaves.
 *
 * Reason: admin widgets (charts, tables, soft 3D cards) were designed for a
 * warm ivory/light surface — dark backgrounds made text & numbers illegible.
 */
const ADMIN_PATH_PREFIXES = [
  "/admin-panel",
  "/admin-login",
  "/customcad75",
  "/shop-admin",
  "/CFCAdmin936",
  "/cccworkshop2006",
  "/workshop-admin-panel",
];

const AdminLightThemeForcer = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isAdminRoute = ADMIN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!isAdminRoute) return;
    const previous = theme;
    if (theme !== "light") setTheme("light");
    return () => {
      // Restore the previous mode (or fall back to light) when leaving admin
      if (previous && previous !== "light") setTheme(previous);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute]);

  return null;
};

export default AdminLightThemeForcer;
