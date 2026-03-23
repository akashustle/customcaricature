import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight, Sparkles, Star, Users, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ONBOARDING_KEY = "ccc_onboarding_done_v2";

const slides = [
  {
    icon: Palette,
    title: "Hand-Crafted Art",
    desc: "Custom caricatures drawn by professional artists from your photos",
    gradient: "from-primary/20 to-accent/10",
  },
  {
    icon: Calendar,
    title: "Live Event Artists",
    desc: "Book caricature artists for weddings, parties & corporate events",
    gradient: "from-accent/20 to-primary/10",
  },
  {
    icon: Star,
    title: "Premium Quality",
    desc: "Framed artwork delivered to your doorstep across India",
    gradient: "from-primary/15 to-primary/5",
  },
];

const AppOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Don't show during OAuth callback or if user is already logged in
    if (loading) return;
    if (user) { localStorage.setItem(ONBOARDING_KEY, "done"); return; }
    if (location.pathname.includes("~oauth") || location.hash.includes("access_token")) return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setVisible(true);
  }, [user, loading, location]);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "done");
    setVisible(false);
  };

  const handleGetStarted = () => {
    finish();
    navigate("/register");
  };

  const handleSkip = () => {
    finish();
  };

  if (!visible) return null;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100002] bg-background flex flex-col"
      >
        {/* Skip button */}
        <div className="flex justify-end p-4">
          <button onClick={handleSkip} className="text-sm text-muted-foreground font-body hover:text-foreground transition-colors">
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center max-w-sm"
            >
              {/* Icon with animated gradient bg */}
              <motion.div
                className={`w-32 h-32 rounded-[2rem] bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-10 shadow-lg`}
                animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <slide.icon className="w-16 h-16 text-primary" />
              </motion.div>

              <h2 className="font-calligraphy text-3xl font-bold text-foreground mb-4">{slide.title}</h2>
              <p className="text-base text-muted-foreground font-body leading-relaxed">{slide.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots + Actions */}
        <div className="px-8 pb-12 space-y-6">
          {/* Dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          {isLast ? (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full rounded-2xl h-14 text-base font-semibold shadow-lg shadow-primary/20"
                onClick={handleGetStarted}
              >
                Get Started <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              {(
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full rounded-2xl h-12 text-sm"
                  onClick={() => { finish(); navigate("/login"); }}
                >
                  Already have an account? Login
                </Button>
              )}
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full rounded-2xl h-14 text-base font-semibold"
              onClick={() => setCurrentSlide(c => c + 1)}
            >
              Next <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppOnboarding;
