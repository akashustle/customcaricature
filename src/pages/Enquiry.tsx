import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, User, Palette, Calendar, MessageCircle, CheckCircle2, Instagram, IndianRupee } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";
import InternationalLocationDropdowns from "@/components/InternationalLocationDropdowns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addYears } from "date-fns";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

type Step = "info" | "type" | "caricature_details" | "event_details" | "help";

const Enquiry = () => {
  const [step, setStep] = useState<Step>("info");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [enquiryId, setEnquiryId] = useState("");

  // Form data
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [eventType, setEventType] = useState("");
  const [enquiryType, setEnquiryType] = useState<"custom_caricature" | "event_booking" | "">("");
  const [caricatureType, setCaricatureType] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  // Settings from admin
  const [descriptions, setDescriptions] = useState<any>({});
  const [contactInfo, setContactInfo] = useState<any>({ whatsapp: "", instagram: "" });
  const [maxEvents, setMaxEvents] = useState(2);
  const [bookedDates, setBookedDates] = useState<Record<string, number>>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Pricing from DB
  const [pricing, setPricing] = useState<any[]>([]);

  // Event pricing
  const [eventPricingRules, setEventPricingRules] = useState<any[]>([]);
  const [resolvedPrice, setResolvedPrice] = useState<{ price: number; source: string; currency: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchPricing();
    fetchBookedDates();
    fetchBlockedDates();
    fetchEventPricingRules();
  }, []);

  // Resolve price when location changes
  useEffect(() => {
    resolveEventPrice();
  }, [state, district, city, eventPricingRules]);

  const fetchSettings = async () => {
    const { data } = await supabase.from("enquiry_settings" as any).select("*");
    if (data) {
      const settings: any = {};
      (data as any[]).forEach((s: any) => { settings[s.id] = s.value; });
      if (settings.caricature_descriptions) setDescriptions(settings.caricature_descriptions);
      if (settings.contact_info) setContactInfo(settings.contact_info);
      if (settings.event_max_per_date) setMaxEvents(settings.event_max_per_date.max_events || 2);
    }
  };

  const fetchPricing = async () => {
    const { data } = await supabase.from("caricature_types").select("*").eq("is_active", true).order("sort_order");
    if (data) setPricing(data);
  };

  const fetchBookedDates = async () => {
    const { data } = await supabase.from("event_bookings").select("event_date").in("status", ["upcoming", "confirmed"]);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((b: any) => { counts[b.event_date] = (counts[b.event_date] || 0) + 1; });
      setBookedDates(counts);
    }
  };

  const fetchBlockedDates = async () => {
    const { data } = await supabase.from("event_blocked_dates" as any).select("blocked_date");
    if (data) setBlockedDates((data as any[]).map((d: any) => d.blocked_date));
  };

  const fetchEventPricingRules = async () => {
    const { data } = await supabase.from("enquiry_event_pricing" as any).select("*").eq("is_active", true).order("priority", { ascending: false });
    if (data) setEventPricingRules(data as any[]);
  };

  const resolveEventPrice = () => {
    if (!state && !district && !city) {
      setResolvedPrice(null);
      return;
    }

    const activeRules = eventPricingRules.filter((r: any) => r.is_active);

    // Priority: city > district > state > default (null/null/null)
    // 1. City match
    if (city) {
      const cityMatch = activeRules.find((r: any) => r.city && r.city.toLowerCase() === city.toLowerCase());
      if (cityMatch) {
        setResolvedPrice({ price: cityMatch.price, source: "City", currency: cityMatch.currency });
        return;
      }
    }

    // 2. District match
    if (district) {
      const distMatch = activeRules.find((r: any) => r.district && r.district.toLowerCase() === district.toLowerCase() && !r.city);
      if (distMatch) {
        setResolvedPrice({ price: distMatch.price, source: "District", currency: distMatch.currency });
        return;
      }
    }

    // 3. State match
    if (state) {
      const stateMatch = activeRules.find((r: any) => r.state && r.state.toLowerCase() === state.toLowerCase() && !r.district && !r.city);
      if (stateMatch) {
        setResolvedPrice({ price: stateMatch.price, source: "State", currency: stateMatch.currency });
        return;
      }
    }

    // 4. Default (all null)
    const defaultRule = activeRules.find((r: any) => !r.state && !r.district && !r.city);
    if (defaultRule) {
      setResolvedPrice({ price: defaultRule.price, source: "Default", currency: defaultRule.currency });
      return;
    }

    setResolvedPrice(null);
  };

  const stepProgress: Record<Step, number> = {
    info: 20, type: 40, caricature_details: 70, event_details: 70, help: 100,
  };

  const handleSubmitInfo = async () => {
    if (!name.trim() || !mobile.trim()) {
      toast({ title: "Please enter your name and mobile number", variant: "destructive" });
      return;
    }
    if (mobile.length < 10) {
      toast({ title: "Please enter a valid mobile number", variant: "destructive" });
      return;
    }
    setStep("type");
  };

  const submitEnquiry = async () => {
    setSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const { data, error } = await supabase.from("enquiries" as any).insert({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        instagram_id: instagramId.trim() || null,
        enquiry_type: enquiryType,
        caricature_type: caricatureType || null,
        event_type: eventType || null,
        country,
        state: state || null,
        district: district || null,
        city: city || null,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
        user_id: userId,
        estimated_price: resolvedPrice?.price || null,
        pricing_source: resolvedPrice?.source || null,
      } as any).select("enquiry_number").single();

      if (error) throw error;
      setEnquiryId((data as any)?.enquiry_number || "");
      setSubmitted(true);
      setStep("help");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (date > addYears(today, 2)) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    if (blockedDates.includes(dateStr)) return true;
    if ((bookedDates[dateStr] || 0) >= maxEvents) return true;
    return false;
  };

  const getDateSlots = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const booked = bookedDates[dateStr] || 0;
    return maxEvents - booked;
  };

  if (submitted) {
    return (
      <>
        <SEOHead title="Enquiry Submitted | Creative Caricature Club" description="Your enquiry has been submitted successfully." />
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20 text-center">
            <CardContent className="p-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-display text-2xl font-bold">Enquiry Submitted!</h2>
              <p className="text-muted-foreground font-sans">Your enquiry ID: <span className="font-bold text-foreground">{enquiryId}</span></p>
              {resolvedPrice && enquiryType === "event_booking" && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground font-sans">Estimated Event Price</p>
                  <p className="font-display text-xl font-bold text-primary">₹{resolvedPrice.price.toLocaleString("en-IN")}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground font-sans">Our team will contact you shortly.</p>
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={() => window.open(`https://wa.me/${contactInfo.whatsapp}`, "_blank")} className="w-full font-sans bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp
                </Button>
                <Button variant="outline" onClick={() => window.open(contactInfo.instagram, "_blank")} className="w-full font-sans">
                  <Instagram className="w-4 h-4 mr-2" /> Instagram
                </Button>
                <Button variant="ghost" onClick={() => window.location.href = "/"} className="font-sans">
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Enquiry | Creative Caricature Club" description="Submit your enquiry for custom caricatures or event bookings." />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Palette className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Creative Caricature Club</CardTitle>
            <p className="text-sm text-muted-foreground font-sans">Tell us what you're looking for</p>
            <Progress value={stepProgress[step]} className="mt-3 h-2" />
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {/* Step 1: Visitor Info */}
            {step === "info" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Your Information
                </h3>
                <div>
                  <Label className="font-sans">Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="mt-1" />
                </div>
                <div>
                  <Label className="font-sans">Mobile Number *</Label>
                  <Input value={mobile} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setMobile(v); }} placeholder="10-digit mobile number" className="mt-1" maxLength={10} />
                </div>
                <div>
                  <Label className="font-sans">Email Address <span className="text-muted-foreground">(optional)</span></Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
                </div>
                <div>
                  <Label className="font-sans">Instagram ID <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={instagramId} onChange={(e) => setInstagramId(e.target.value)} placeholder="@your_instagram" className="mt-1" />
                </div>
                <Button onClick={handleSubmitInfo} className="w-full rounded-full font-sans h-12 text-base">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Enquiry Type */}
            {step === "type" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold">What are you looking for?</h3>
                <div className="grid gap-3">
                  <button
                    onClick={() => { setEnquiryType("custom_caricature"); setStep("caricature_details"); }}
                    className="p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Palette className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-sans font-semibold text-foreground">Custom Caricature from Photo</p>
                        <p className="text-xs text-muted-foreground font-sans">Personalized artwork from your photos</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setEnquiryType("event_booking"); setStep("event_details"); }}
                    className="p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-sans font-semibold text-foreground">Event Booking</p>
                        <p className="text-xs text-muted-foreground font-sans">Live caricature artist at your event</p>
                      </div>
                    </div>
                  </button>
                </div>
                <Button variant="ghost" onClick={() => setStep("info")} className="font-sans">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
            )}

            {/* Step 3a: Caricature Details */}
            {step === "caricature_details" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold">Select Caricature Type</h3>
                <div className="grid gap-3">
                  {pricing.map((p: any) => {
                    const desc = descriptions[p.slug] || {};
                    return (
                      <button
                        key={p.slug}
                        onClick={() => setCaricatureType(p.slug)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left",
                          caricatureType === p.slug
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-sans font-semibold text-foreground">{desc.title || p.name}</p>
                            <p className="text-xs text-muted-foreground font-sans mt-1">{desc.description || ""}</p>
                            {desc.delivery_days && (
                              <p className="text-xs text-primary font-sans mt-1">📦 Delivery: ~{desc.delivery_days} days</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-display font-bold text-primary">
                              ₹{p.price.toLocaleString("en-IN")}
                              {p.per_face && <span className="text-xs font-sans font-normal text-muted-foreground">/face</span>}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep("type")} className="font-sans">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={submitEnquiry}
                    disabled={!caricatureType || submitting}
                    className="flex-1 rounded-full font-sans h-12 text-base"
                  >
                    {submitting ? "Submitting..." : "Submit Enquiry"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3b: Event Details */}
            {step === "event_details" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Event Details
                </h3>

                <LocationDropdowns
                  state={state}
                  district={district}
                  city={city}
                  onStateChange={(v) => { setState(v); setDistrict(""); setCity(""); }}
                  onDistrictChange={(v) => { setDistrict(v); setCity(""); }}
                  onCityChange={(v) => setCity(v)}
                />

                <div>
                  <Label className="font-sans">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !eventDate && "text-muted-foreground")}>
                        {eventDate ? format(eventDate, "PPP") : "Select event date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={eventDate}
                        onSelect={setEventDate}
                        disabled={isDateDisabled}
                        className={cn("p-3 pointer-events-auto")}
                        modifiers={{
                          limited: (date) => {
                            const slots = getDateSlots(date);
                            return slots === 1 && !isDateDisabled(date);
                          },
                        }}
                        modifiersClassNames={{
                          limited: "bg-amber-100 text-amber-800 font-bold",
                        }}
                      />
                      <div className="px-3 pb-3 text-[10px] text-muted-foreground font-sans space-y-0.5">
                        <p>🟢 Available · 🟡 1 slot left · 🔴 Fully booked/blocked</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {eventDate && (
                    <p className="text-xs text-primary font-sans mt-1">
                      {getDateSlots(eventDate)} slot{getDateSlots(eventDate) !== 1 ? "s" : ""} available on {format(eventDate, "dd MMM yyyy")}
                    </p>
                  )}
                </div>

                {/* Estimated Price Card */}
                {resolvedPrice && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <p className="text-xs text-muted-foreground font-sans font-medium">Estimated Event Booking Price</p>
                    </div>
                    <p className="font-display text-2xl font-bold text-primary">
                      ₹{resolvedPrice.price.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1">
                      Based on {resolvedPrice.source.toLowerCase()} pricing · Final price may vary depending on event requirements
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep("type")} className="font-sans">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={submitEnquiry}
                    disabled={!state || !city || submitting}
                    className="flex-1 rounded-full font-sans h-12 text-base"
                  >
                    {submitting ? "Submitting..." : "Submit Enquiry"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Help / Contact */}
            {step === "help" && !submitted && (
              <div className="space-y-4 animate-in fade-in duration-300 text-center">
                <h3 className="font-display text-lg font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground font-sans">If you need immediate assistance, contact us:</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => window.open(`https://wa.me/${contactInfo.whatsapp}`, "_blank")} className="w-full font-sans bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Chat
                  </Button>
                  <Button variant="outline" onClick={() => window.open(contactInfo.instagram, "_blank")} className="w-full font-sans">
                    <Instagram className="w-4 h-4 mr-2" /> Instagram
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Enquiry;
