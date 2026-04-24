import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Adymize-style floating white pill navbar.
 * Sits centered, rounded, with a dark CTA on the right.
 */
const FloatingNav = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Scroll-driven background opacity: 0.55 at top → 0.95 after ~200px so the
  // violet hero fade reads through the header initially, then becomes opaque.
  const [bgOpacity, setBgOpacity] = useState(0.55);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        // Map 0..200px → 0.55..0.95
        const t = Math.min(1, Math.max(0, y / 200));
        setBgOpacity(0.55 + t * 0.4);
        // Near top → always show. Scrolling down past threshold → hide. Scrolling up → show.
        if (y < 80) {
          setHidden(false);
        } else if (y > lastY + 4) {
          setHidden(true);
        } else if (y < lastY - 4) {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Services", href: "#services" },
    { label: "Clients", href: "#clients" },
    { label: "Why Us", href: "#why-us" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQs", href: "#faqs" },
  ];

  const goAnchor = (href: string) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(href);
    }
  };

  return (
    <header
      className={`sticky top-0 md:top-3 z-40 w-full px-3 sm:px-4 pt-3 md:pt-0 transition-transform duration-300 will-change-transform ${
        hidden ? "-translate-y-[120%]" : "translate-y-0"
      }`}
    >
      <div
        style={{ backgroundColor: `hsl(var(--card) / ${bgOpacity})` }}
        className={`mx-auto max-w-7xl rounded-2xl border border-border/40 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-[background-color,box-shadow] duration-200 ${
          scrolled ? "shadow-[0_10px_40px_-20px_hsl(252_60%_40%/0.25)]" : "shadow-sm"
        }`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Creative Caricature Club home">
          <img src="/logo.png" alt="CCC" width={32} height={32} className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">
            <span className="text-gradient-violet">Creative Caricature Club</span>
            <span className="align-super text-[0.55em] font-semibold text-foreground/60 ml-0.5">™</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => goAnchor(l.href)}
              className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <button onClick={() => navigate("/dashboard")} className="btn-square-outline text-sm">My Account</button>
          ) : (
            <button onClick={() => navigate("/login")} className="btn-square-outline text-sm">Login</button>
          )}
          <button onClick={() => navigate("/chat-now")} className="btn-square-dark text-sm">
            <MessageCircle className="w-4 h-4" /> Chat Now
          </button>
        </div>

        {/* Mobile / Tablet: direct Chat Now CTA — replaces the hamburger */}
        <button
          onClick={() => navigate("/chat-now")}
          className="md:hidden inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
          aria-label="Chat Now"
        >
          <MessageCircle className="w-4 h-4" />
          Chat Now
        </button>
      </div>
    </header>
  );
};

export default FloatingNav;
