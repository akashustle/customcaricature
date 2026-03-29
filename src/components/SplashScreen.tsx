import { useEffect, useState } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);

  // Don't show on admin routes or if already visited
  const isAdminRoute = typeof window !== "undefined" && ["/customcad75", "/admin-panel", "/admin-login", "/cccworkshop2006", "/workshop-admin-panel", "/lil-flea"].some(r => window.location.pathname.startsWith(r));
  const alreadyVisited = typeof sessionStorage !== "undefined" && sessionStorage.getItem("ccc_splash_shown");

  useEffect(() => {
    if (isAdminRoute || alreadyVisited) {
      setShow(false);
      onComplete();
      return;
    }
    sessionStorage.setItem("ccc_splash_shown", "1");
    // Ultra-fast splash — 400ms total
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, 400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <img
        src="/logo.png"
        alt="Creative Caricature Club™"
        className="w-20 h-20 rounded-full border-2 border-border shadow-lg"
        width={80}
        height={80}
      />
      <h1 className="mt-4 text-2xl font-bold text-foreground font-calligraphy">
        Creative Caricature Club™
      </h1>
      <p className="mt-1 text-[11px] tracking-[0.3em] uppercase font-semibold text-muted-foreground font-body">
        Art • Events • Workshops
      </p>
      <div className="mt-6 h-0.5 rounded-full overflow-hidden bg-border" style={{ width: 100 }}>
        <div className="h-full rounded-full bg-primary/50 animate-[grow_0.5s_ease-in-out_forwards]" />
      </div>
      <style>{`@keyframes grow{from{width:0}to{width:100%}}`}</style>
    </div>
  );
};

export default SplashScreen;
