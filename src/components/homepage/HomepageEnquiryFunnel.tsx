import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Sparkles, ArrowRight, ArrowLeft, Lock, CheckCircle, TrendingUp, Clock, AlertCircle, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DEFAULT_EVENT_TYPES = [
  { id: "wedding", label: "Wedding", emoji: "💍", hot: true },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "corporate", label: "Corporate", emoji: "🏢", hot: true },
  { id: "baby_shower", label: "Baby Shower", emoji: "🍼" },
  { id: "engagement", label: "Engagement", emoji: "💑" },
  { id: "reception", label: "Reception", emoji: "🥂" },
  { id: "other", label: "Other", emoji: "🎉" },
];

const DEFAULT_CITIES = [
  { id: "mumbai", label: "Mumbai", trending: true },
  { id: "delhi", label: "Delhi NCR", trending: true },
  { id: "bangalore", label: "Bangalore" },
  { id: "pune", label: "Pune", trending: true },
  { id: "hyderabad", label: "Hyderabad" },
  { id: "chennai", label: "Chennai" },
  { id: "kolkata", label: "Kolkata" },
  { id: "other", label: "Other City" },
];

const DEFAULT_BUDGETS = [
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
  const [data, setData] = useState({ event: "", city: "", date: "", budget: "", otherDetails: "" });
  const [blockedDates, setBlockedDates] = useState<Array<{ blocked_date: string; reason: string | null }>>([]);
  const [funnelConfig, setFunnelConfig] = useState<any>(null);
  const [pricingInfo, setPricingInfo] = useState<any>(null);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      const { data: bd } = await supabase.from("event_blocked_dates").select("blocked_date, reason");
      if (bd) setBlockedDates(bd);
    };
    const fetchConfig = async () => {
      const { data: cfg } = await supabase.from("admin_site_settings").select("value").eq("id", "homepage_funnel_config").maybeSingle();
      if (cfg?.value) setFunnelConfig(cfg.value);
    };
    const fetchPricing = async () => {
      const { data: pr } = await supabase.from("event_pricing").select("*");
      if (pr) setPricingInfo(pr);
    };
    fetchBlockedDates();
    fetchConfig();
    fetchPricing();
  }, []);

  const eventTypes = funnelConfig?.event_types?.length ? funnelConfig.event_types : DEFAULT_EVENT_TYPES;
  const cities = funnelConfig?.cities?.length ? funnelConfig.cities : DEFAULT_CITIES;
  const budgets = funnelConfig?.budgets?.length ? funnelConfig.budgets : DEFAULT_BUDGETS;

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const isOther = data.event === "other" || data.city === "other";
  const showOtherInput = currentStep === "event" && data.event === "other" ||
                         currentStep === "city" && data.city === "other";

  const next = () => step < STEPS.length - 1 && setStep(s => s + 1);
  const prev = () => step > 0 && setStep(s => s - 1);

  const isDateBlocked = (dateStr: string) => blockedDates.some(bd => bd.blocked_date === dateStr);
  const getBlockReason = (dateStr: string) => blockedDates.find(bd => bd.blocked_date === dateStr)?.reason;

  const canProceed = () => {
    if (currentStep === "event") return !!data.event;
    if (currentStep === "city") return !!data.city;
    if (currentStep === "date") return !!data.date && !isDateBlocked(data.date);
    if (currentStep === "budget") return !!data.budget;
    return true;
  };

  const handleProceed = () => {
    if (currentStep === "result") {
      if (!user) { navigate("/register"); } else { navigate("/book-event"); }
      return;
    }
    next();
  };

  return (
    <section className="container mx-auto px-4 py-16 md:py-24" id="section-enquiry-funnel">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-accent/10 text-accent border-accent/20 font-body">
            <Sparkles className="w-3 h-3 mr-1" /> Smart Booking
          </Badge>
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">Get Instant Quote</h2>
          <p className="text-muted-foreground font-body text-sm">Find the perfect artist for your event in 30 seconds</p>
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
            <motion.div className="h-full bg-gradient-to-r from-accent to-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-foreground/[0.03] overflow-hidden">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 md:p-8">
              {/* Step 1: Event Type */}
              {currentStep === "event" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Calendar className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">What's the occasion?</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {eventTypes.map((t: any) => (
                      <button key={t.id}
                        onClick={() => {
                          setData({ ...data, event: t.id });
                          if (t.id !== "other") setTimeout(() => setStep(1), 300);
                        }}
                        className={cn("relative p-4 rounded-xl border-2 text-left transition-all font-body",
                          data.event === t.id ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/40 hover:bg-card"
                        )}>
                        <span className="text-2xl block mb-1">{t.emoji}</span>
                        <span className="text-sm font-semibold text-foreground">{t.label}</span>
                        {t.hot && (
                          <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-destructive text-destructive-foreground border-none">
                            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />HOT
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  {data.event === "other" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <label className="text-xs font-body font-semibold text-muted-foreground mb-1 block">Please describe your event</label>
                      <Textarea value={data.otherDetails} onChange={e => setData({ ...data, otherDetails: e.target.value })}
                        placeholder="E.g., Anniversary party, product launch, festival..." rows={2} className="font-body" />
                    </motion.div>
                  )}
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
                    {cities.map((c: any) => (
                      <button key={c.id}
                        onClick={() => {
                          setData({ ...data, city: c.id });
                          if (c.id !== "other") setTimeout(() => setStep(2), 300);
                        }}
                        className={cn("relative p-3.5 rounded-xl border-2 text-left transition-all font-body",
                          data.city === c.id ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/40"
                        )}>
                        <span className="text-sm font-semibold text-foreground">{c.label}</span>
                        {c.trending && (
                          <Badge variant="outline" className="ml-2 text-[8px] px-1.5 py-0 border-accent/30 text-accent">Trending</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  {data.city === "other" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <label className="text-xs font-body font-semibold text-muted-foreground mb-1 block">Enter your city name</label>
                      <Input value={data.otherDetails} onChange={e => setData({ ...data, otherDetails: e.target.value })}
                        placeholder="Enter city name..." className="font-body" />
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 3: Date */}
              {currentStep === "date" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Clock className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">Select your preferred date</h3>
                  </div>
                  <Input type="date" value={data.date}
                    onChange={e => { setData({ ...data, date: e.target.value }); if (e.target.value && !isDateBlocked(e.target.value)) setTimeout(() => setStep(3), 300); }}
                    min={new Date().toISOString().split("T")[0]}
                    className="font-body text-base h-12" />
                  {data.date && isDateBlocked(data.date) && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-2 text-sm text-destructive font-body bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">This date is unavailable</p>
                        {getBlockReason(data.date) && <p className="text-xs mt-0.5 text-muted-foreground">{getBlockReason(data.date)}</p>}
                      </div>
                    </motion.div>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-body">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>High demand period — we recommend booking at least 2 weeks in advance</span>
                  </div>
                </div>
              )}

              {/* Step 4: Budget */}
              {currentStep === "budget" && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Users className="w-5 h-5 text-accent" />
                    <h3 className="font-body font-bold text-lg text-foreground">Select your investment range</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {budgets.map((b: any) => (
                      <button key={b.id}
                        onClick={() => { setData({ ...data, budget: b.id }); setTimeout(() => setStep(4), 300); }}
                        className={cn("relative p-4 rounded-xl border-2 text-left transition-all font-body",
                          data.budget === b.id ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/40"
                        )}>
                        <span className="text-sm font-bold text-foreground">{b.label}</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">{b.desc}</span>
                        {b.popular && (
                          <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-success text-success-foreground border-none">
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
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }}>
                    <CheckCircle className="w-14 h-14 text-success mx-auto mb-4" />
                    <h3 className="font-body font-bold text-xl text-foreground mb-2">Excellent Match Found! 🎉</h3>
                    <p className="text-muted-foreground font-body text-sm mb-4">
                      Professional artists available for your{" "}
                      <strong>{eventTypes.find((e: any) => e.id === data.event)?.label || data.otherDetails}</strong> in{" "}
                      <strong>{cities.find((c: any) => c.id === data.city)?.label || data.otherDetails}</strong>
                    </p>
                    {/* State-based pricing preview */}
                    {(() => {
                       const MUMBAI_IDS = ["mumbai", "navi_mumbai", "thane", "palghar"];
                       const isMumbai = MUMBAI_IDS.includes(data.city);
                      const region = isMumbai ? "mumbai" : "pan_india";
                      const pricing = pricingInfo?.find((p: any) => p.region === region && p.artist_count === 1);
                      return pricing ? (
                        <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-4 text-left">
                          <p className="text-xs font-body font-semibold text-success mb-1">Estimated Starting Price</p>
                          <p className="text-2xl font-bold money">₹{pricing.total_price?.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground font-body mt-1">
                            Advance: <span className="money">₹{pricing.advance_amount?.toLocaleString("en-IN")}</span> · 1 Artist · {isMumbai ? "Mumbai" : "Pan India"}
                          </p>
                        </div>
                      ) : null;
                    })()}
                    <div className="bg-muted/50 rounded-xl p-4 mb-4 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs font-body font-bold text-foreground">Verified Artist Available</p>
                          <p className="text-[10px] text-muted-foreground font-body">4.9★ rated · 800+ events completed</p>
                        </div>
                      </div>
                    </div>
                    {/* WhatsApp button with prefilled enquiry details */}
                    {(() => {
                      const eventLabel = eventTypes.find((e: any) => e.id === data.event)?.label || data.otherDetails || data.event;
                      const cityLabel = cities.find((c: any) => c.id === data.city)?.label || data.otherDetails || data.city;
                      const budgetLabel = budgets.find((b: any) => b.id === data.budget)?.label || data.budget;
                      const MUMBAI_IDS = ["mumbai", "navi_mumbai", "thane", "palghar"];
                      const isMumbai = MUMBAI_IDS.includes(data.city);
                      const region = isMumbai ? "mumbai" : "pan_india";
                      const pricing = pricingInfo?.find((p: any) => p.region === region && p.artist_count === 1);
                      const pricingLine = pricing ? `Estimated Price: ₹${pricing.total_price?.toLocaleString("en-IN")} (Advance: ₹${pricing.advance_amount?.toLocaleString("en-IN")})` : "";
                      const waMsg = `Hi Creative Caricature Club! 🎨\n\nI'm interested in booking a live caricature artist for my event. Here are my details:\n\n📋 Event Type: ${eventLabel}\n📍 City: ${cityLabel}\n📅 Event Date: ${data.date || "Not selected"}\n💰 Budget Range: ${budgetLabel}\n${pricingLine ? `💵 ${pricingLine}\n` : ""}\nI'd like to know more about availability, pricing, and next steps. Please help me with the booking!\n\nThank you 🙏`;
                      return (
                        <a
                          href={`https://wa.me/918369594271?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-body font-semibold text-sm px-5 py-2.5 rounded-full shadow-md transition-all mb-4"
                        >
                          <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                        </a>
                      );
                    })()}
                    {!user && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body justify-center mb-4">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Create an account to confirm your booking & view personalised pricing</span>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
          </motion.div>

          {/* Footer Actions */}
          <div className="px-6 md:px-8 pb-6 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={prev} className="font-body">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}
            {/* Show Next only for "other" selections or result step */}
            {(showOtherInput || currentStep === "result" || currentStep === "date") && (
              <Button onClick={handleProceed} disabled={!canProceed()} className="rounded-full font-body font-semibold shadow-md">
                {currentStep === "result" ? (user ? "Book Now" : "Sign Up to Continue") : "Continue"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground font-body">
          <span>⭐ 4.9 Rating</span><span>•</span><span>800+ Events</span><span>•</span><span>1000+ Happy Clients</span>
        </div>
      </motion.div>
    </section>
  );
};

export default HomepageEnquiryFunnel;
