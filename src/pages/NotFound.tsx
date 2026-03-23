import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 20, y: (e.clientY / window.innerHeight - 0.5) * 20 });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist." noindex />

      {/* Animated background blobs */}
      <motion.div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.4, 1], x: [0, 60, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/10 blur-3xl"
        animate={{ scale: [1.2, 0.8, 1.2], x: [0, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity }} />
      <motion.div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-destructive/5 blur-3xl"
        animate={{ y: [0, -50, 0], rotate: [0, 180, 360] }}
        transition={{ duration: 15, repeat: Infinity }} />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/20"
          style={{ left: `${8 + i * 8}%`, top: `${10 + (i % 5) * 18}%` }}
          animate={{ y: [0, -40, 0], opacity: [0.1, 0.6, 0.1], scale: [1, 1.8, 1] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}

      <motion.div
        className="text-center relative z-10 px-6"
        style={{ x: mousePos.x * 0.3, y: mousePos.y * 0.3 }}
      >
        {/* Big 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotateX: -60 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 100, duration: 0.8 }}
          className="relative mb-6"
        >
          <h1 className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--destructive)))", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite" }}>
            404
          </h1>
          <motion.div
            className="absolute inset-0 text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-primary/5 blur-xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            404
          </motion.div>
        </motion.div>

        {/* Broken pencil icon animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-6"
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted border border-border"
            animate={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search className="w-8 h-8 text-muted-foreground" />
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl md:text-3xl font-bold text-foreground mb-3"
        >
          Oops! This page got lost
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-2 max-w-md mx-auto"
        >
          The page <span className="font-mono text-sm bg-muted px-2 py-1 rounded-md text-foreground">{location.pathname}</span> doesn't exist.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-muted-foreground mb-8"
        >
          It might have been moved or the URL might be incorrect.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate("/")} size="lg" className="rounded-full shadow-lg gap-2">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate(-1)} variant="outline" size="lg" className="rounded-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
