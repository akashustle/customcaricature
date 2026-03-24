import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Sparkles, ArrowRight, ArrowLeft, Lock, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { id: "wedding", label: "Wedding", emoji: "💍", hot: true },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "corporate", label: "Corporate", emoji: "🏢", hot: true },
  { id: "college", label: "College Fest", emoji: "🎓" },
  { id: "engagement", label: "Engagement", emoji: "💑" },
  { id: "reception", label: "Reception", emoji: "🥂" },
  { id: "other", label: "Other", emoji: "🎉" },
];

const CITIES = [
  { id: "mumbai", label: "Mumbai", trending: true },
  { id: "delhi", label: "Delhi NCR", trending: true },
  { id: "bangalore", label: "Bangalore" },
  { id: "pune", label: "Pune", trending: true },
  { id: "hyderabad", label: "Hyderabad" },
  { id: "chennai", label: "Chennai" },
  { id: "kolkata", label: "Kolkata" },
  { id: "other", label: "Other City" },
];

const BUDGET_RANGES = [
  { id: "15k-25k", label: "₹15K – ₹25K", desc: "1 Artist • 2hrs" },
  { id: "25k-40k", label: "₹25K – ₹40K", desc: "1 Artist • 3hrs", popular: true },
  { id: "40k-60k", label: "₹40K – ₹60K", desc: "2 Artists • 3hrs" },
  { id: "60k+", label: "₹60K+", desc: "2+ Artists • Premium" },
];

const STEPS = ["event", "city", "date", "budget", "result"] as const;

const HomepageEnquiryFunnel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ event: "", city: "", date: "", budget: "" });

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const next = () => step < STEPS.length - 1 && setStep(s => s + 1);
  const prev = () => step > 0 && setStep(s => s - 1);

  const canProceed = () => {
    if (currentStep === "event") return !!data.event;
    if (currentStep === "city") return !!data.city;
    if (currentStep === "date") return !!data.date;
    if (currentStep === "budget") return !!data.budget;
    return true;
  };

  const handleProceed = () => {
    if (currentStep === "result") {
      if (!user) {
        navigate("/register");
      } else {
        navigate("/book-event");
      }
      return;
    }
    next();
  };

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-accent/10 text-accent border-accent/20 font-body">
            <Sparkles className="w-3 h-3 mr-1" /> Smart Booking
          </Badge>
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">
            Get Instant Quote
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Find the perfect artist for your event in 30 seconds
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-[10px] font-body text-muted-foreground mb-1.5 px-1">
            {STEPS.map((s, i) => (
              <span key={s} className={cn("transition-colors", i <= step ? "text-accent font-semibold" : "")}>
                {s === "event" ? "Event" : s === "city" ? "City" : s === "date" ? "Date" : s === "budget" ? "Budget" : "Result"}
              </span>
            ))}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-foreground/[0.03] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="p-6 md:p-8"
            >
              {/* Step 1: Event Type */}
              {currentStep === "event" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Calendar className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">What's the occasion?</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EVENT_TYPES.map(t => (
                       <button
                        key={t.id}
                        onClick={() => { setData({ ...data, event: t.id }); setTimeout(() => setStep(1), 300); }}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all font-body",
                          data.event === t.id
                            ? "border-accent bg-accent/5 shadow-md"
                            : "border-border hover:border-accent/40 hover:bg-card"
                        )}
                      >
                        <span className="text-2xl block mb-1">{t.emoji}</span>
                        <span className="text-sm font-semibold text-foreground">{t.label}</span>
                        {t.hot && (
                          <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-red-500 text-white border-none">
                            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />HOT
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: City */}
              {currentStep === "city" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <MapPin className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">Where's your event?</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {CITIES.map(c => (
                       <button
                        key={c.id}
                        onClick={() => { setData({ ...data, city: c.id }); setTimeout(() => setStep(2), 300); }}
                        className={cn(
                          "relative p-3.5 rounded-xl border-2 text-left transition-all font-body",
                          data.city === c.id
                            ? "border-accent bg-accent/5 shadow-md"
                            : "border-border hover:border-accent/40"
                        )}
                      >
                        <span className="text-sm font-semibold text-foreground">{c.label}</span>
                        {c.trending && (
                          <Badge variant="outline" className="ml-2 text-[8px] px-1.5 py-0 border-accent/30 text-accent">
                            Trending
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date */}
              {currentStep === "date" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Clock className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">When is your event?</h3>
                  </div>
                  <Input
                    type="date"
                    value={data.date}
                    onChange={e => setData({ ...data, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="font-body text-base h-12"
                  />
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-body">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Only <strong className="text-red-500">3 slots</strong> left this weekend!</span>
                  </div>
                </div>
              )}

              {/* Step 4: Budget */}
              {currentStep === "budget" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Users className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">What's your budget?</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {BUDGET_RANGES.map(b => (
                       <button
                        key={b.id}
                        onClick={() => { setData({ ...data, budget: b.id }); setTimeout(() => setStep(4), 300); }}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all font-body",
                          data.budget === b.id
                            ? "border-accent bg-accent/5 shadow-md"
                            : "border-border hover:border-accent/40"
                        )}
                      >
                        <span className="text-sm font-bold text-foreground">{b.label}</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">{b.desc}</span>
                        {b.popular && (
                          <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-green-500 text-white border-none">
                            Most Popular
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Result */}
              {currentStep === "result" && (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                    <h3 className="font-body font-bold text-xl text-foreground mb-2">
                      Great Choice! 🎉
                    </h3>
                    <p className="text-muted-foreground font-body text-sm mb-4">
                      We have artists available for your{" "}
                      <strong>{EVENT_TYPES.find(e => e.id === data.event)?.label}</strong> in{" "}
                      <strong>{CITIES.find(c => c.id === data.city)?.label}</strong>
                    </p>
                    <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs font-body font-bold text-foreground">Artist Available</p>
                          <p className="text-[10px] text-muted-foreground font-body">4.9★ rated · 800+ events done</p>
                        </div>
                      </div>
                    </div>
                    {!user && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body justify-center mb-4">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign up to lock your date & see exact pricing</span>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="px-6 md:px-8 pb-6 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={prev} className="font-body">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}
            <Button
              onClick={handleProceed}
              disabled={!canProceed()}
              className="rounded-full font-body font-semibold shadow-md"
            >
              {currentStep === "result"
                ? (user ? "Book Now" : "Sign Up to Continue")
                : "Next"
              }
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground font-body">
          <span>⭐ 4.9 Rating</span>
          <span>•</span>
          <span>800+ Events</span>
          <span>•</span>
          <span>1000+ Happy Clients</span>
        </div>
      </motion.div>
    </section>
  );
};

export default HomepageEnquiryFunnel;
