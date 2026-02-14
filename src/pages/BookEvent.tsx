import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { CalendarIcon, ArrowLeft, CheckCircle, Loader2, Palette, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDIA_STATES_CITIES, EVENT_TYPES, getEventPrice } from "@/lib/event-data";
import { formatPrice } from "@/lib/pricing";
import { motion } from "framer-motion";

declare global {
  interface Window { Razorpay: any; }
}

const BookEvent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientInstagram, setClientInstagram] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
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
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);

  const isMumbai = state === "Maharashtra" && city === "Mumbai";
  const isOutsideMumbai = state && city && !isMumbai;
  const pricing = getEventPrice(isMumbai, artistCount, addExtraHours ? extraHours : 0);

  // Pre-fill from profile
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
    }
  }, [user]);

  // Fetch blocked dates
  useEffect(() => {
    supabase.from("artist_blocked_dates").select("blocked_date, city").then(({ data }) => {
      if (data) setBlockedDates(data.map(d => new Date(d.blocked_date)));
    });
  }, []);

  // Reset availability when date/city changes
  useEffect(() => {
    setAvailabilityChecked(false);
    setIsAvailable(false);
  }, [eventDate, city]);

  const checkAvailability = async () => {
    if (!eventDate || !city) return;
    setCheckingAvailability(true);
    
    // Check blocked dates
    const dateStr = format(eventDate, "yyyy-MM-dd");
    const { data: blocked } = await supabase
      .from("artist_blocked_dates")
      .select("id")
      .eq("blocked_date", dateStr);
    
    // Check existing bookings on same date & city
    const { data: existing } = await supabase
      .from("event_bookings")
      .select("id")
      .eq("event_date", dateStr)
      .eq("city", city)
      .neq("status", "cancelled");

    const available = (!blocked || blocked.length === 0) && (!existing || existing.length < 2);
    setIsAvailable(available);
    setAvailabilityChecked(true);
    setCheckingAvailability(false);
  };

  const canProceed = () => {
    if (!clientName || !clientMobile || !clientEmail || !eventType || !eventDate || !startTime || !endTime) return false;
    if (!state || !city || !fullAddress || !venueName || !pincode) return false;
    if (!availabilityChecked || !isAvailable) return false;
    if (isOutsideMumbai && (!travelConfirmed || !accommodationConfirmed)) return false;
    return true;
  };

  const handleBooking = async () => {
    if (!canProceed()) return;
    setSubmitting(true);

    try {
      const dateStr = format(eventDate!, "yyyy-MM-dd");
      const totalPrice = pricing.total;
      const advanceAmount = pricing.advance;

      // Insert event booking
      const { data: booking, error } = await supabase.from("event_bookings").insert({
        user_id: user?.id || null,
        client_name: clientName,
        client_mobile: clientMobile,
        client_email: clientEmail,
        client_instagram: clientInstagram || null,
        event_type: eventType,
        event_date: dateStr,
        event_start_time: startTime,
        event_end_time: endTime,
        state,
        city,
        full_address: fullAddress,
        venue_name: venueName,
        pincode,
        artist_count: artistCount,
        is_mumbai: isMumbai,
        total_price: totalPrice,
        advance_amount: advanceAmount,
        extra_hours: addExtraHours ? extraHours : 0,
        travel_confirmed: isOutsideMumbai ? travelConfirmed : true,
        accommodation_confirmed: isOutsideMumbai ? accommodationConfirmed : true,
      } as any).select("id").single();

      if (error || !booking) throw new Error(error?.message || "Failed to create booking");

      // Create Razorpay order for advance payment
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: advanceAmount,
          order_id: booking.id,
          customer_name: clientName,
          customer_email: clientEmail,
          customer_mobile: clientMobile,
        },
      });

      if (rzpError || !rzpData?.razorpay_order_id) throw new Error("Failed to create payment order");

      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club",
        description: `Event Booking - ${EVENT_TYPES.find(t => t.value === eventType)?.label}`,
        image: "/logo.png",
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: booking.id,
              },
            });

            // Update event booking with payment info
            await supabase.from("event_bookings").update({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              payment_status: "confirmed",
            } as any).eq("id", booking.id);

            setBookingConfirmed(true);
            toast({ title: "Event Booked Successfully! 🎉" });
          } catch {
            toast({ title: "Payment verification failed", description: "Contact support", variant: "destructive" });
          }
          setSubmitting(false);
        },
        prefill: { name: clientName, email: clientEmail, contact: `+91${clientMobile}` },
        theme: { color: "#E8633B" },
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
              <p className="text-muted-foreground font-sans">We'll reach out to you soon with more details. Check your dashboard for updates.</p>
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
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
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                  <Calendar
                    mode="single" selected={eventDate} onSelect={setEventDate}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                    initialFocus
                  />
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
              <Select value={state} onValueChange={v => { setState(v); setCity(""); }}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{Object.keys(INDIA_STATES_CITIES).sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans">City *</Label>
              <Select value={city} onValueChange={setCity} disabled={!state}>
                <SelectTrigger><SelectValue placeholder={state ? "Select city" : "Select state first"} /></SelectTrigger>
                <SelectContent>{(INDIA_STATES_CITIES[state] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="font-sans">Venue Name *</Label><Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="Hotel / Hall name" /></div>
            <div><Label className="font-sans">Full Address *</Label><Input value={fullAddress} onChange={e => setFullAddress(e.target.value)} placeholder="Complete address" /></div>
            <div><Label className="font-sans">Pin Code *</Label><Input value={pincode} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setPincode(d); }} maxLength={6} placeholder="6 digit pincode" /></div>
          </CardContent>
        </Card>

        {/* Availability Check */}
        {eventDate && city && (
          <Card>
            <CardContent className="p-4">
              {!availabilityChecked ? (
                <Button onClick={checkAvailability} disabled={checkingAvailability} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                  {checkingAvailability ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : "Check Availability"}
                </Button>
              ) : isAvailable ? (
                <div className="flex items-center gap-2 text-green-600 font-sans font-medium">
                  <CheckCircle className="w-5 h-5" /> We are available on {format(eventDate, "PPP")} in {city}! 🎉
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

        {/* Artist Selection & Pricing - only show after availability confirmed */}
        {isAvailable && (
          <>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Select Artists</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={String(artistCount)} onValueChange={v => setArtistCount(Number(v) as 1 | 2)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="1" id="artist-1" />
                    <Label htmlFor="artist-1" className="font-sans flex-1 cursor-pointer">
                      <span className="font-medium">1 Professional Caricature Artist</span>
                      <span className="block text-sm text-muted-foreground">Total: {formatPrice(getEventPrice(isMumbai, 1, 0).total)} · Advance: {formatPrice(getEventPrice(isMumbai, 1, 0).advance)}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="2" id="artist-2" />
                    <Label htmlFor="artist-2" className="font-sans flex-1 cursor-pointer">
                      <span className="font-medium">2 Professional Caricature Artists</span>
                      <span className="block text-sm text-muted-foreground">Total: {formatPrice(getEventPrice(isMumbai, 2, 0).total)} · Advance: {formatPrice(getEventPrice(isMumbai, 2, 0).advance)}</span>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Extra Hours */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox checked={addExtraHours} onCheckedChange={(c) => { setAddExtraHours(!!c); if (!c) setExtraHours(0); }} id="extra-hours" />
                    <Label htmlFor="extra-hours" className="font-sans cursor-pointer">Add Extra Hours (₹5,000/hour)</Label>
                  </div>
                  {addExtraHours && (
                    <div className="ml-7">
                      <Label className="font-sans text-sm">Number of extra hours</Label>
                      <Input type="number" min={1} max={8} value={extraHours} onChange={e => setExtraHours(Math.max(0, parseInt(e.target.value) || 0))} className="w-32 mt-1" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* What Guests Receive */}
            <Card>
              <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />What Guests Receive</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 font-sans text-sm">
                  {[
                    "Live hand-drawn caricatures at your event",
                    "Black & white sketches in 3 minutes",
                    "Color caricatures in 6 minutes",
                    "Premium 1×15 inch sheets",
                    "Transparent sleeves for each drawing",
                    "Fun & memorable keepsake for guests",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Travel Confirmation */}
            {isOutsideMumbai && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader><CardTitle className="font-display text-lg">Travel & Accommodation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground font-sans">Since the event is outside Mumbai, you need to confirm the following:</p>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={travelConfirmed} onCheckedChange={c => setTravelConfirmed(!!c)} id="travel" />
                    <Label htmlFor="travel" className="font-sans cursor-pointer text-sm">✅ I agree to arrange travel for the artist(s)</Label>
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
              <CardContent className="p-4 space-y-2 font-sans">
                <div className="flex justify-between"><span className="text-muted-foreground">Region</span><span className="font-medium">{isMumbai ? "Mumbai" : "Outside Mumbai (Pan India)"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Artists</span><span className="font-medium">{artistCount}</span></div>
                {addExtraHours && extraHours > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Extra Hours</span><span className="font-medium">{extraHours} × ₹5,000 = {formatPrice(extraHours * 5000)}</span></div>
                )}
                <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span><span className="text-primary">{formatPrice(pricing.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advance Payable Now</span><span className="font-semibold text-primary">{formatPrice(pricing.advance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining (at event)</span><span>{formatPrice(pricing.total - pricing.advance)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              onClick={handleBooking}
              disabled={!canProceed() || submitting}
              className="w-full py-6 text-lg rounded-full font-sans font-semibold bg-primary hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</> : `Pay ${formatPrice(pricing.advance)} Advance & Book Event`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookEvent;
