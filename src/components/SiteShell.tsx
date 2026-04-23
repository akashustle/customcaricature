import { lazy, Suspense } from "react";

/**
 * SiteShell — wraps any page with the floating site header and the
 * site footer (lazy-loaded). Use this on policy / info / static pages
 * that should consistently expose the brand chrome.
 */
const FloatingNav = lazy(() => import("./FloatingNav"));
const SiteFooter = lazy(() => import("./SiteFooter"));

export const SiteShell = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`min-h-screen bg-background pb-24 md:pb-6 ${className}`}>
    <Suspense fallback={null}><FloatingNav /></Suspense>
    <main className="w-full">{children}</main>
    <Suspense fallback={null}><SiteFooter /></Suspense>
  </div>
);

export default SiteShell;
