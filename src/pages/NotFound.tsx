import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Themed 404 page — uses semantic design tokens so it adapts cleanly to both
 * light and dark themes. Adds a subtle 3D tilt-on-mouse-move on the floating
 * card and a soft animated aurora background.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const compute = () => setIsDark(root.classList.contains("dark"));
    compute();
    const obs = new MutationObserver(compute);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      setTilt({ x, y });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at top, hsl(240 18% 14%) 0%, hsl(240 22% 8%) 60%, hsl(240 26% 5%) 100%)"
          : "radial-gradient(ellipse at top, hsl(220 60% 97%) 0%, hsl(220 30% 92%) 60%, hsl(220 30% 86%) 100%)",
      }}
    >
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist." noindex />

      {/* Aurora blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-50"
        style={{ background: isDark ? "hsl(265 80% 55% / 0.35)" : "hsl(220 90% 65% / 0.35)" }}
        animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-40"
        style={{ background: isDark ? "hsl(195 90% 55% / 0.30)" : "hsl(280 90% 70% / 0.30)" }}
        animate={{ scale: [1.1, 0.9, 1.1], x: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${(i * 73) % 100}%`,
            top: `${(i * 41) % 100}%`,
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            background: isDark ? "hsl(0 0% 100% / 0.45)" : "hsl(240 30% 30% / 0.30)",
            boxShadow: isDark ? "0 0 12px hsl(0 0% 100% / 0.4)" : "0 0 8px hsl(240 30% 30% / 0.25)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.25 }}
        />
      ))}

      {/* 3D tilt card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        className="relative z-10 mx-6 max-w-xl w-full"
        style={{ perspective: 1200 }}
      >
        <motion.div
          className="relative rounded-[28px] p-8 sm:p-12 text-center backdrop-blur-xl border"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${-tilt.y * 0.6}deg) rotateY(${tilt.x * 0.6}deg)`,
            transition: "transform 0.18s ease-out",
            background: isDark
              ? "linear-gradient(145deg, hsl(240 20% 16% / 0.9), hsl(240 24% 10% / 0.85))"
              : "linear-gradient(145deg, hsl(0 0% 100% / 0.9), hsl(220 30% 96% / 0.85))",
            borderColor: isDark ? "hsl(0 0% 100% / 0.08)" : "hsl(240 10% 80% / 0.6)",
            boxShadow: isDark
              ? "0 30px 60px -20px hsl(240 50% 0% / 0.7), inset 0 1px 0 hsl(0 0% 100% / 0.08)"
              : "0 30px 60px -20px hsl(240 30% 30% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.9)",
          }}
        >
          {/* Big gradient 404 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotateX: -50 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
            className="relative mb-2"
            style={{ transform: "translateZ(40px)" }}
          >
            <h1
              className="text-[7rem] sm:text-[10rem] leading-none font-black tracking-tighter text-transparent bg-clip-text"
              style={{
                backgroundImage: isDark
                  ? "linear-gradient(135deg, hsl(265 90% 75%), hsl(195 90% 65%), hsl(320 90% 70%))"
                  : "linear-gradient(135deg, hsl(245 80% 55%), hsl(280 80% 60%), hsl(195 90% 50%))",
                backgroundSize: "200% 200%",
                animation: "gradientShift 5s ease infinite",
                WebkitTextStroke: isDark ? "0" : "0",
              }}
            >
              404
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              background: isDark ? "hsl(0 0% 100% / 0.06)" : "hsl(240 10% 90%)",
              color: isDark ? "hsl(0 0% 90%)" : "hsl(240 20% 30%)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Lost in the canvas
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-xl sm:text-2xl font-bold mb-2"
            style={{ transform: "translateZ(20px)" }}
          >
            This page doesn't exist
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-sm sm:text-base mb-6"
            style={{ color: isDark ? "hsl(0 0% 75%)" : "hsl(240 10% 40%)" }}
          >
            <span className="opacity-70">You tried to reach</span>{" "}
            <span
              className="font-mono text-xs sm:text-sm px-2 py-1 rounded-md align-middle"
              style={{
                background: isDark ? "hsl(0 0% 100% / 0.07)" : "hsl(240 10% 92%)",
                color: isDark ? "hsl(0 0% 95%)" : "hsl(240 30% 25%)",
              }}
            >
              {location.pathname}
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
            style={{ transform: "translateZ(30px)" }}
          >
            <Button
              onClick={() => navigate("/")}
              size="lg"
              className="rounded-full shadow-lg gap-2"
            >
              <Home className="w-4 h-4" /> Go Home
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
              className="rounded-full gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
            <Button
              onClick={() => navigate("/explore")}
              variant="ghost"
              size="lg"
              className="rounded-full gap-2"
            >
              <Compass className="w-4 h-4" /> Explore
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
