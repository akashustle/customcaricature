import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { usePricing } from "@/hooks/usePricing";
import PricingReveal from "@/components/PricingReveal";
import UrgencyTimer from "@/components/UrgencyTimer";
import { ArrowLeft, Users, MapPin, Palette, Clock, Sparkles, Calendar, MessageCircle, Phone, ArrowRight, Calculator } from "lucide-react";

const WHATSAPP_NUMBER = "918369594271";
const INSTAGRAM_URL = "https://www.instagram.com/creativecaricatureclub";

const CaricatureBudgeting = () => {
  const navigate = useNavigate();
  const { types, getPrice } = usePricing();
  const [phase, setPhase] = useState<"intro" | "event" | "caricature">("intro");
  const [introComplete, setIntroComplete] = useState(false);
  const [introStep, setIntroStep] = useState(0);

  // Event calculator state
  const [guestCount, setGuestCount] = useState("");
  const [city, setCity] = useState("");
  const [showEventResult, setShowEventResult] = useState(false);
  const [eventTimerActive, setEventTimerActive] = useState(false);

  // Caricature calculator state
  const [caricType, setCaricType] = useState("single");
  const [faceCount, setFaceCount] = useState(1);
  const [showCaricResult, setShowCaricResult] = useState(false);

  // Intro animation
  const introTexts = [
    "🎨 Welcome to Creative Caricature Club",
    "💰 Let's find the perfect pricing for you...",
    "📊 Calculating best rates...",
    "🎯 Almost there...",
    "✨ Your personalized pricing is ready!"
  ];

  useEffect(() => {
    if (phase !== "intro") return;
    const interval = setInterval(() => {
      setIntroStep(prev => {
        if (prev >= introTexts.length - 1) {
          clearInterval(interval);
          setTimeout(() => setIntroComplete(true), 1500);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  // Price animation during intro
  const [introPrice, setIntroPrice] = useState(25000);
  useEffect(() => {
    if (phase !== "intro" || introComplete) return;
    const interval = setInterval(() => {
      setIntroPrice(Math.round((20000 + Math.random() * 70000) / 1000) * 1000);
    }, 400);
    return () => clearInterval(interval);
  }, [phase, introComplete]);

  // Event pricing logic
  const guests = parseInt(guestCount) || 0;
  const isMumbai = city.toLowerCase().includes("mumbai") || city.toLowerCase().includes("thane") || city.toLowerCase().includes("navi mumbai") || city.toLowerCase().includes("palghar");
  const suggestedArtists = guests <= 50 ? 1 : 2;
  const eventPrice = isMumbai
    ? (suggestedArtists === 1 ? 30000 : 50000)
    : (suggestedArtists === 1 ? 40000 : 70000);

  const logSession = async (action: string, link?: string) => {
    try {
      await supabase.from("calculator_sessions").insert({
        guest_count: guests || null,
        city: city || null,
        region: isMumbai ? "mumbai" : "pan-india",
        artist_count: suggestedArtists,
        suggested_price: showEventResult ? eventPrice : null,
        action_taken: action,
        clicked_link: link || null,
      });
    } catch {}
  };

  const calculateEvent = () => {
    if (!guestCount || !city) return;
    setShowEventResult(true);
    setEventTimerActive(true);
    logSession("calculated");
  };

  const caricaturePrice = getPrice(caricType, faceCount);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead title="Caricature Budgeting Calculator" description="Calculate pricing for custom caricatures and live event bookings." canonical="/caricature-budgeting" />

      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <Calculator className="w-5 h-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Caricature Budgeting</h1>
        </div>
      </div>

      {/* Intro Animation Phase */}
      <AnimatePresence>
        {phase === "intro" && !introComplete && (
          <motion.div exit={{ opacity: 0, scale: 0.9 }} className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
            <motion.div className="text-center space-y-6">
              <AnimatePresence mode="wait">
                <motion.p key={introStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {introTexts[introStep]}
                </motion.p>
              </AnimatePresence>

              {/* Fluctuating price animation */}
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-5xl md:text-7xl font-display font-bold text-primary">
                ₹{introPrice.toLocaleString("en-IN")}
              </motion.div>

              <div className="flex justify-center gap-2">
                {introTexts.map((_, i) => (
                  <motion.div key={i} className={`w-2 h-2 rounded-full ${i <= introStep ? "bg-primary" : "bg-muted"}`}
                    animate={i === introStep ? { scale: [1, 1.5, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase Selection */}
      {(phase === "intro" && introComplete) && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-2">What are you looking for?</h2>
          <p className="text-muted-foreground text-center mb-8 text-sm">Choose to see personalized pricing</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Card className="cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setPhase("event")}>
                <CardContent className="p-8 text-center space-y-3">
                  <Calendar className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-display text-xl font-bold">Live Event Booking</h3>
                  <p className="text-sm text-muted-foreground">Live caricature artist at your event</p>
                  <Badge className="bg-primary/10 text-primary">Starting ₹30,000</Badge>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Card className="cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setPhase("caricature")}>
                <CardContent className="p-8 text-center space-y-3">
                  <Palette className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-display text-xl font-bold">Custom Caricature</h3>
                  <p className="text-sm text-muted-foreground">Personalized caricature artwork</p>
                  <Badge className="bg-primary/10 text-primary">Starting ₹3,499</Badge>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* EVENT CALCULATOR */}
      {phase === "event" && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-lg">
          <Button variant="ghost" size="sm" onClick={() => { setPhase("intro"); setIntroComplete(true); setShowEventResult(false); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>

          {!showEventResult && (
            <PricingReveal finalPrice={35000} revealed={false} showRange rangeMin={30000} rangeMax={90000} label="Event Pricing Range"
              urgencyMessage="Enter details below to get your exact quote" className="mb-6" />
          )}

          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-center">🎪 Event Pricing Calculator</h2>

              <div>
                <Label className="flex items-center gap-1"><Users className="w-4 h-4" />Expected Guest Count</Label>
                <Input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} placeholder="e.g. 50" className="mt-1" />
              </div>

              <div>
                <Label className="flex items-center gap-1"><MapPin className="w-4 h-4" />Event City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai, Pune, Delhi" className="mt-1" />
              </div>

              {!showEventResult && (
                <Button onClick={calculateEvent} className="w-full rounded-full" disabled={!guestCount || !city}>
                  <Sparkles className="w-4 h-4 mr-2" />Get My Pricing
                </Button>
              )}
            </CardContent>
          </Card>

          {/* EVENT RESULT */}
          <AnimatePresence>
            {showEventResult && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                <PricingReveal finalPrice={eventPrice} revealed={true} label="Your Event Price" className="mb-4" />

                {eventTimerActive && (
                  <UrgencyTimer durationMinutes={3} message="🔥 This special rate expires in" onExpire={() => setEventTimerActive(false)} />
                )}

                {/* Suggestion Card */}
                <Card className="border-primary/30">
                  <CardContent className="p-5 space-y-3">
                    <h3 className="font-display font-bold text-lg">
                      {suggestedArtists === 1 ? "🎨 Best for You: 1 Artist" : "🎨🎨 Recommended: 2 Artists"}
                    </h3>

                    <div className="space-y-2 text-sm text-foreground/80">
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><strong>4-hour</strong> live event</p>
                      <p className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />
                        {suggestedArtists === 1
                          ? "1 artist can create 35-45 caricatures comfortably"
                          : "2 artists can create 60-70 caricatures comfortably"}
                      </p>
                      <p className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />
                        Output depends on guest flow & preference (B&W or Color)
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Sometimes output goes beyond expectations — we don't commit exact numbers as it depends on guest engagement!
                      </p>
                    </div>

                    {guests > 30 && guests <= 50 && (
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-300">
                          ✅ For {guests} guests, <strong>1 artist for 4 hours</strong> is perfect! Make your event memorable with funny caricatures! 🎉
                        </p>
                      </div>
                    )}

                    {guests > 50 && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          🌟 For {guests} guests, <strong>2 artists</strong> will ensure every guest gets their caricature! Create lasting memories for all your guests! 🎊
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button className="w-full rounded-full text-base py-6" onClick={() => { logSession("book_event", "/book-event"); navigate("/book-event"); }}>
                    <Calendar className="w-5 h-5 mr-2" />Book Your Event Now <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-full" onClick={() => { logSession("enquiry", "/enquiry"); navigate("/enquiry"); }}>
                      📋 Send Enquiry
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => { logSession("whatsapp", "whatsapp"); window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I checked your pricing calculator. I need an event for ${guests} guests in ${city}.`, "_blank"); }}>
                      💬 WhatsApp
                    </Button>
                  </div>

                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <a href={INSTAGRAM_URL} target="_blank" className="hover:text-primary transition-colors">📸 Instagram</a>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="hover:text-primary transition-colors">📱 WhatsApp Support</a>
                    <button onClick={() => { logSession("enquiry_link", "/enquiry"); navigate("/enquiry"); }} className="hover:text-primary transition-colors">📝 Detailed Enquiry</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* CARICATURE CALCULATOR */}
      {phase === "caricature" && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-lg">
          <Button variant="ghost" size="sm" onClick={() => { setPhase("intro"); setIntroComplete(true); setShowCaricResult(false); }} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>

          {!showCaricResult && (
            <PricingReveal finalPrice={5000} revealed={false} showRange rangeMin={3000} rangeMax={25000} label="Caricature Pricing" urgencyMessage="Select type to see your price" className="mb-6" />
          )}

          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-center">🖼️ Custom Caricature Calculator</h2>

              <div>
                <Label>Caricature Type</Label>
                <Select value={caricType} onValueChange={(v) => { setCaricType(v); setShowCaricResult(false); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.length > 0 ? types.map(t => (
                      <SelectItem key={t.slug} value={t.slug}>{t.name} — ₹{t.price.toLocaleString("en-IN")}{t.per_face ? "/face" : ""}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="single">Single — ₹3,499</SelectItem>
                        <SelectItem value="couple">Couple — ₹9,499</SelectItem>
                        <SelectItem value="group">Group — ₹3,499/face</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {(caricType === "group" || types.find(t => t.slug === caricType)?.per_face) && (
                <div>
                  <Label>Number of Faces</Label>
                  <Input type="number" min={1} max={6} value={faceCount} onChange={(e) => setFaceCount(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))} className="mt-1" />
                </div>
              )}

              <Button onClick={() => setShowCaricResult(true)} className="w-full rounded-full">
                <Sparkles className="w-4 h-4 mr-2" />Calculate Price
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {showCaricResult && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                <PricingReveal finalPrice={caricaturePrice} revealed={true} label="Your Caricature Price" />

                <div className="space-y-3 mt-4">
                  <Button className="w-full rounded-full text-base py-6" onClick={() => navigate("/order")}>
                    <Palette className="w-5 h-5 mr-2" />Order Now <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-full" onClick={() => navigate("/enquiry")}>📋 Enquiry</Button>
                    <Button variant="outline" className="rounded-full" onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")}>💬 WhatsApp</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default CaricatureBudgeting;
