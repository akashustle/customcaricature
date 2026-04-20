import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_MEMORY_KEY = "ccc_last_route";

// Routes that should NOT be remembered (login pages, etc.)
const EXCLUDED_ROUTES = ["/login", "/register", "/forgot-password", "/customcad75", "/admin-login", "/artistlogin", "/cccworkshop2006", "/CFCAdmin936"];

export const useRouteMemory = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (!EXCLUDED_ROUTES.includes(path) && path !== "/") {
      sessionStorage.setItem(ROUTE_MEMORY_KEY, path);
    }
  }, [location.pathname]);
};

export const getLastRoute = (): string | null => {
  return sessionStorage.getItem(ROUTE_MEMORY_KEY);
};

export const clearRouteMemory = () => {
  sessionStorage.removeItem(ROUTE_MEMORY_KEY);
};
