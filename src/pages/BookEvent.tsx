import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEventPricing } from "@/hooks/useEventPricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, CheckCircle, Loader2, Palette, Clock, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDIA_STATES_CITIES, EVENT_TYPES, getEventPrice, calculateGatewayCharges } from "@/lib/event-data";
import { formatPrice } from "@/lib/pricing";
import { motion } from "framer-motion";

declare global {
  interface Window { Razorpay: any; }
}

const BookEvent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pricing: dbPricing } = useEventPricing();
  const [customerEventPricing, setCustomerEventPricing] = useState<any[]>([]);
  // Form state
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientInstagram, setClientInstagram] = useState("");
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [venueName, setVenueName] = useState("");
  const [pincode, setPincode] = useState("");
  const [artistCount, setArtistCount] = useState<1 | 2>(1);
  const [extraHours, setExtraHours] = useState(0);
  const [addExtraHours, setAddExtraHours] = useState(false);
  const [travelConfirmed, setTravelConfirmed] = useState(false);
  const [accommodationConfirmed, setAccommodationConfirmed] = useState(false);

  // Status
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const actualCity = city === "__other__" ? customCity : city;
  const isMumbai = state === "Maharashtra" && actualCity === "Mumbai";
  const isOutsideMumbai = state && actualCity && !isMumbai;

  // Check for customer-specific event pricing first
  const getCustomerEventPrice = () => {
    if (customerEventPricing.length > 0) {
      const region = isMumbai ? "mumbai" : "outside";
      const row = customerEventPricing.find((p: any) => p.region === region && p.artist_count === artistCount);
      if (row) {
        const extraCost = (addExtraHours ? extraHours : 0) * row.custom_extra_hour_rate;
        return {
          total: row.custom_total_price + extraCost,
          advance: row.custom_advance_amount,
          extraHourRate: row.custom_extra_hour_rate,
        };
      }
    }
    return getEventPrice(isMumbai, artistCount, addExtraHours ? extraHours : 0, dbPricing);
  };

  const pricing = getCustomerEventPrice();
  const gatewayCharges = calculateGatewayCharges(pricing.advance);
  const totalPayable = pricing.advance + gatewayCharges;

  // Pre-fill from profile & fetch customer event pricing with real-time sync
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name, mobile, email, instagram_id").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setClientName(data.full_name || "");
            setClientMobile(data.mobile || "");
            setClientEmail(data.email || "");
            setClientInstagram(data.instagram_id || "");
          }
        });
      // Fetch customer-specific event pricing
      const fetchCustomerPricing = () => {
        supabase.from("customer_event_pricing").select("*").eq("user_id", user.id)
          .then(({ data }) => {
            if (data) setCustomerEventPricing(data as any);
          });
      };
      fetchCustomerPricing();
      // Real-time listener for customer event pricing changes
      const channel = supabase
        .channel("customer-event-pricing-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "customer_event_pricing", filter: `user_id=eq.${user.id}` }, () => {
          fetchCustomerPricing();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "event_pricing" }, () => {
          // Refresh global pricing too — useEventPricing handles this but force re-render
          fetchCustomerPricing();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  // Reset availability when date/city changes
  useEffect(() => {
    setAvailabilityChecked(false);
    setIsAvailable(false);
  }, [eventDate, actualCity]);

  const checkAvailability = async () => {
    if (!eventDate || !actualCity) return;
    setCheckingAvailability(true);
    const dateStr = format(eventDate, "yyyy-MM-dd");
    const { data: blocked } = await supabase
      .from("artist_blocked_dates")
      .select("id")
      .eq("blocked_date", dateStr);
    const { data: existing } = await supabase
      .from("event_bookings")
      .select("id")
      .eq("event_date", dateStr)
      .eq("city", actualCity)
      .neq("status", "cancelled");
    const available = (!blocked || blocked.length === 0) && (!existing || existing.length < 2);
    setIsAvailable(available);
    setAvailabilityChecked(true);
    setCheckingAvailability(false);
  };

  const canProceed = () => {
    if (!clientName || !clientMobile || !clientEmail) return false;
    const finalEventType = eventType === "other" ? customEventType : eventType;
    if (!finalEventType || !eventDate || !startTime || !endTime) return false;
    if (!state || !actualCity || !fullAddress || !venueName || !pincode) return false;
    if (!availabilityChecked || !isAvailable) return false;
    if (isOutsideMumbai && (!travelConfirmed || !accommodationConfirmed)) return false;
    return true;
  };

  const handleBooking = async () => {
    if (!canProceed()) return;
    setSubmitting(true);
    try {
      const dateStr = format(eventDate!, "yyyy-MM-dd");
      const finalEventType = eventType === "other" ? customEventType : eventType;
      const { data: booking, error } = await supabase.from("event_bookings").insert({
        user_id: user?.id || null,
        client_name: clientName,
        client_mobile: clientMobile,
        client_email: clientEmail,
        client_instagram: clientInstagram || null,
        event_type: finalEventType,
        event_date: dateStr,
        event_start_time: startTime,
        event_end_time: endTime,
        state,
        city: actualCity,
        full_address: fullAddress,
        venue_name: venueName,
        pincode,
        artist_count: artistCount,
        is_mumbai: isMumbai,
        total_price: pricing.total,
        advance_amount: pricing.advance,
        extra_hours: addExtraHours ? extraHours : 0,
        travel_confirmed: isOutsideMumbai ? travelConfirmed : true,
        accommodation_confirmed: isOutsideMumbai ? accommodationConfirmed : true,
      } as any).select("id").single();
      if (error || !booking) throw new Error(error?.message || "Failed to create booking");

      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: totalPayable, order_id: booking.id, customer_name: clientName, customer_email: clientEmail, customer_mobile: clientMobile },
      });
      if (rzpError || !rzpData?.razorpay_order_id) throw new Error("Failed to create payment order");

      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club",
        description: `Event Booking – ${finalEventType}`,
        image: "/logo.png",
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await supabase.functions.invoke("verify-razorpay-payment", {
              body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: booking.id },
            });
            await supabase.from("event_bookings").update({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              payment_status: "confirmed",
            } as any).eq("id", booking.id);

            // Record advance payment in payment history
            await supabase.from("payment_history").insert({
              user_id: user?.id,
              booking_id: booking.id,
              payment_type: "event_advance",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              amount: totalPayable,
              status: "confirmed",
              description: `Event advance – ${eventType === "other" ? customEventType : eventType}`,
            } as any);

            setBookingConfirmed(true);
            toast({ title: "Event Booked Successfully! 🎉" });

            // Send confirmation email (fire-and-forget)
            const finalEventType = eventType === "other" ? customEventType : eventType;
            supabase.functions.invoke("send-notification-email", {
              body: {
                type: "event_booked",
                data: {
                  client_name: clientName,
                  client_email: clientEmail,
                  event_type: finalEventType,
                  event_date: format(eventDate!, "dd MMM yyyy"),
                  event_start_time: startTime,
                  event_end_time: endTime,
                  venue_name: venueName,
                  city: actualCity,
                  artist_count: artistCount,
                  total_price: pricing.total,
                },
              },
            }).catch(() => {});
          } catch {
            toast({ title: "Payment verification failed", description: "Contact support", variant: "destructive" });
          }
          setSubmitting(false);
        },
        prefill: { name: clientName, email: clientEmail, contact: `+91${clientMobile}` },
        theme: { color: "#A37B2F" },
        modal: {
          ondismiss: () => {
            toast({ title: "Payment cancelled", description: "Your booking is saved. Complete payment from dashboard." });
            setBookingConfirmed(true);
            setSubmitting(false);
          },
        },
      };
      new window.Razorpay(options).open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="font-display text-2xl font-bold">Event Booking Confirmed!</h2>
              <p className="text-muted-foreground font-sans">Your advance payment has been received successfully!</p>
              <div className="text-left bg-muted/50 rounded-lg p-3 space-y-1 text-sm font-sans">
                <p><span className="text-muted-foreground">Event:</span> <span className="font-medium capitalize">{eventType === "other" ? customEventType : eventType}</span></p>
                {eventDate && <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(eventDate, "PPP")}</span></p>}
                <p><span className="text-muted-foreground">Venue:</span> <span className="font-medium">{venueName}, {actualCity}</span></p>
                <p><span className="text-muted-foreground">Artists:</span> <span className="font-medium">{artistCount}</span></p>
                <p><span className="text-muted-foreground">Advance Paid:</span> <span className="font-medium text-primary">{formatPrice(totalPayable)}</span></p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/dashboard")} className="rounded-full font-sans bg-primary hover:bg-primary/90">Go to Dashboard</Button>
                <Button variant="outline" onClick={() => navigate("/")} className="rounded-full font-sans">Back to Home</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">Book an Event</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Client Details */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Client Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="font-sans">Full Name *</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Your full name" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="font-sans">Contact Number *</Label><Input value={clientMobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setClientMobile(d); }} maxLength={10} placeholder="10 digit number" /></div>
              <div><Label className="font-sans">Email Address *</Label><Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="your@email.com" /></div>
            </div>
            <div><Label className="font-sans">Instagram ID</Label><Input value={clientInstagram} onChange={e => setClientInstagram(e.target.value)} placeholder="@username (optional)" /></div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="font-sans">Event Type *</Label>
              <Select value={eventType} onValueChange={v => { setEventType(v); if (v !== "other") setCustomEventType(""); }}>
                <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {eventType === "other" && (
              <div><Label className="font-sans">Please specify event type *</Label><Input value={customEventType} onChange={e => setCustomEventType(e.target.value)} placeholder="e.g. Engagement, Anniversary..." /></div>
            )}
            <div>
              <Label className="font-sans">Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={eventDate} onSelect={setEventDate} disabled={(date) => date < new Date()} className={cn("p-3 pointer-events-auto")} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-sans">Start Time *</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
              <div><Label className="font-sans">End Time *</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Location Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="font-sans">State *</Label>
              <Select value={state} onValueChange={v => { setState(v); setCity(""); setCustomCity(""); }}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{Object.keys(INDIA_STATES_CITIES).sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans">City *</Label>
              <Select value={city} onValueChange={v => { setCity(v); if (v !== "__other__") setCustomCity(""); }} disabled={!state}>
                <SelectTrigger><SelectValue placeholder={state ? "Select city" : "Select state first"} /></SelectTrigger>
                <SelectContent>
                  {(INDIA_STATES_CITIES[state] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  {state && <SelectItem value="__other__">Other (Enter manually)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {city === "__other__" && (
              <div><Label className="font-sans">Enter City Name *</Label><Input value={customCity} onChange={e => setCustomCity(e.target.value)} placeholder="Type your city name" /></div>
            )}
            <div><Label className="font-sans">Venue Name *</Label><Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="Hotel / Hall name" /></div>
            <div><Label className="font-sans">Full Address *</Label><Input value={fullAddress} onChange={e => setFullAddress(e.target.value)} placeholder="Complete address" /></div>
            <div><Label className="font-sans">Pin Code *</Label><Input value={pincode} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setPincode(d); }} maxLength={6} placeholder="6 digit pincode" /></div>
          </CardContent>
        </Card>

        {/* Availability Check */}
        {eventDate && actualCity && (
          <Card>
            <CardContent className="p-4">
              {!availabilityChecked ? (
                <Button onClick={checkAvailability} disabled={checkingAvailability} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                  {checkingAvailability ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : "Check Availability"}
                </Button>
              ) : isAvailable ? (
                <div className="flex items-center gap-2 text-green-600 font-sans font-medium">
                  <CheckCircle className="w-5 h-5" /> We are available on {format(eventDate, "PPP")} in {actualCity}! 🎉
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-destructive font-sans font-medium">❌ Sorry, we are not available on this date.</p>
                  <p className="text-xs text-muted-foreground font-sans">Please try a different date or city.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Artist Selection & Pricing */}
        {isAvailable && (
          <>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Select Artists</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={String(artistCount)} onValueChange={v => setArtistCount(Number(v) as 1 | 2)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="1" id="artist-1" />
                     <Label htmlFor="artist-1" className="font-sans flex-1 cursor-pointer">
                      <span className="font-medium">🔴 1 Professional Caricature Artist</span>
                      <span className="block text-sm text-muted-foreground">
                        Total: {formatPrice((() => { const cp = customerEventPricing.find((p: any) => p.region === (isMumbai ? "mumbai" : "outside") && p.artist_count === 1); return cp ? cp.custom_total_price : getEventPrice(isMumbai, 1, 0, dbPricing).total; })())} (All Materials Included) · Advance: {formatPrice((() => { const cp = customerEventPricing.find((p: any) => p.region === (isMumbai ? "mumbai" : "outside") && p.artist_count === 1); return cp ? cp.custom_advance_amount : getEventPrice(isMumbai, 1, 0, dbPricing).advance; })())}
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="2" id="artist-2" />
                    <Label htmlFor="artist-2" className="font-sans flex-1 cursor-pointer">
                      <span className="font-medium">🔴 2 Professional Caricature Artists</span>
                      <span className="block text-sm text-muted-foreground">
                        Total: {formatPrice((() => { const cp = customerEventPricing.find((p: any) => p.region === (isMumbai ? "mumbai" : "outside") && p.artist_count === 2); return cp ? cp.custom_total_price : getEventPrice(isMumbai, 2, 0, dbPricing).total; })())} (All Materials Included) · Advance: {formatPrice((() => { const cp = customerEventPricing.find((p: any) => p.region === (isMumbai ? "mumbai" : "outside") && p.artist_count === 2); return cp ? cp.custom_advance_amount : getEventPrice(isMumbai, 2, 0, dbPricing).advance; })())}
                      </span>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Extra Hours */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox checked={addExtraHours} onCheckedChange={(c) => { setAddExtraHours(!!c); if (!c) setExtraHours(0); }} id="extra-hours" />
                    <Label htmlFor="extra-hours" className="font-sans cursor-pointer">Add Extra Hours ({formatPrice(pricing.extraHourRate)}/hour)</Label>
                  </div>
                  {addExtraHours && (
                    <div className="ml-7">
                      <Label className="font-sans text-sm">Number of extra hours</Label>
                      <Input type="number" min={1} max={8} value={extraHours || ""} onChange={e => { const v = e.target.value; if (v === "") { setExtraHours(0); } else { setExtraHours(Math.min(8, Math.max(0, parseInt(v) || 0))); } }} className="w-32 mt-1" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Caricature Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  🎨 Live Caricature Session – 3 to 4 Hours {isMumbai ? "in Mumbai" : "Outside Mumbai"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-sm font-semibold mb-3">✏️ Caricature Highlights:</p>
                <ul className="space-y-2 font-sans text-sm">
                  {[
                    "✅ Black & White Caricatures – Quick sketches in just 3 minutes!",
                    "✅ Color Caricatures – Vibrant, full-of-life portraits in 6 minutes!",
                    "✅ Premium 11×15-inch sheets, neatly packed in envelopes.",
                    "✅ Custom Branding! Your logo or event branding on every sheet – a perfect keepsake!",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2"><span>{item}</span></li>
                  ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-border space-y-1 font-sans text-sm">
                  <p className="font-semibold">📌 Additional Charges:</p>
                  <p>🔹 Extra Time? – {formatPrice(pricing.extraHourRate)} per additional hour.</p>
                  {isOutsideMumbai && (
                    <p>🔹 Outside Mumbai? – Travel & accommodation charges apply. ✈️🚆</p>
                  )}
                </div>
                {dbPricing.length > 0 && dbPricing[0]?.valid_until && (
                  <p className="mt-3 text-xs text-muted-foreground font-sans">
                    Above cost valid till {new Date(dbPricing[0].valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Travel Confirmation */}
            {isOutsideMumbai && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Plane className="w-5 h-5 text-amber-600" />Travel & Accommodation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground font-sans">Since the event is outside Mumbai, please confirm the following. <span className="font-semibold text-foreground">Preferred mode of transport: ✈️ Flight</span></p>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={travelConfirmed} onCheckedChange={c => setTravelConfirmed(!!c)} id="travel" />
                    <Label htmlFor="travel" className="font-sans cursor-pointer text-sm">✅ I agree to arrange travel (Flight preferred) for the artist(s)</Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={accommodationConfirmed} onCheckedChange={c => setAccommodationConfirmed(!!c)} id="accommodation" />
                    <Label htmlFor="accommodation" className="font-sans cursor-pointer text-sm">✅ I agree to arrange accommodation for the artist(s)</Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Summary */}
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="font-display text-lg">💰 Price Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 font-sans">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Region</span><span className="font-medium">{isMumbai ? "Mumbai" : "Outside Mumbai (Pan India)"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Artists</span><span className="font-medium">{artistCount} Professional Artist{artistCount > 1 ? "s" : ""}</span></div>
                {addExtraHours && extraHours > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Extra Hours</span><span className="font-medium">{extraHours} × {formatPrice(pricing.extraHourRate)} = {formatPrice(extraHours * pricing.extraHourRate)}</span></div>
                )}
                <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
                  <span>Total Event Cost</span><span className="text-primary">{formatPrice(pricing.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advance Payment</span><span className="font-semibold">{formatPrice(pricing.advance)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Payment Gateway Charges (2.6%)</span><span>{formatPrice(gatewayCharges)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-primary">
                  <span>You Pay Now (Satisfaction Guaranteed)</span><span>{formatPrice(totalPayable)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining (at event)</span><span>{formatPrice(pricing.total - pricing.advance)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Book Now */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center space-y-2 font-sans text-sm">
                <p className="font-semibold">📅 Book Your Slot Before It's Gone!</p>
                <p>🔹 Step 1: Secure your date with advance payment</p>
                <p>🔹 Step 2: If you need any help, contact us at <a href="tel:+918369594271" className="text-primary font-semibold underline">8369594271</a></p>
                <p className="text-xs text-muted-foreground">🎊 Spots fill up quickly! Reserve now.</p>
              </CardContent>
            </Card>

            <Button
              onClick={handleBooking}
              disabled={!canProceed() || submitting}
              className="w-full py-6 text-base md:text-lg rounded-full font-sans font-semibold bg-primary hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</> : `Pay ${formatPrice(totalPayable)} & Book Event`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookEvent;
