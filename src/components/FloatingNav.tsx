import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Adymize-style floating white pill navbar.
 * Sits centered, rounded, with a dark CTA on the right.
 */
const FloatingNav = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
    setOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(href);
    }
  };

  return (
    <header className="relative md:sticky md:top-3 z-40 w-full px-3 sm:px-4 pt-3 md:pt-0">
      <div
        className={`mx-auto max-w-6xl rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-shadow ${
          scrolled ? "shadow-[0_10px_40px_-20px_hsl(252_60%_40%/0.25)]" : "shadow-sm"
        }`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Creative Caricature Club home">
          <img src="/logo.png" alt="CCC" width={32} height={32} className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-foreground text-base sm:text-lg tracking-tight">
            Creative <span className="text-gradient-violet">Caricature</span>
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
          <button onClick={() => navigate("/enquiry")} className="btn-square-dark text-sm">
            <MessageCircle className="w-4 h-4" /> Chat Now
          </button>
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden mx-auto max-w-6xl mt-2 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-lg p-3 flex flex-col gap-1">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => goAnchor(l.href)}
              className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-secondary"
            >
              {l.label}
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <button onClick={() => navigate("/dashboard")} className="btn-square-outline flex-1 justify-center text-sm">My Account</button>
            ) : (
              <button onClick={() => navigate("/login")} className="btn-square-outline flex-1 justify-center text-sm">Login</button>
            )}
            <button onClick={() => navigate("/enquiry")} className="btn-square-dark flex-1 justify-center text-sm">
              <MessageCircle className="w-4 h-4" /> Chat Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default FloatingNav;
