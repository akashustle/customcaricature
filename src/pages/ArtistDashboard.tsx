import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LogOut, CalendarDays, MapPin, Users, Home, FileText, RefreshCw, Loader2,
  CalendarOff, Trash2, Package, Palette, MessageCircle, X, Bell, Clock,
  IndianRupee, CheckCircle2, Camera, CreditCard, Banknote, Upload, Phone, Mail,
  ChevronDown, ChevronUp, User, Wallet
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { initWebPush, requestBrowserNotificationPermission } from "@/lib/webpush";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import ArtworkUploadFlow from "@/components/admin/ArtworkUploadFlow";
import ChatWidget from "@/components/ChatWidget";
import AdminSmartSearch from "@/components/admin/AdminSmartSearch";
import ArtistEarnings from "@/components/artist/ArtistEarnings";
import ArtistChatPanel from "@/components/artist/ArtistChatPanel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type ArtistEvent = {
  id: string; client_name: string; client_mobile: string; client_email: string;
  client_instagram: string | null; event_type: string; event_date: string;
  event_start_time: string; event_end_time: string; venue_name: string;
  full_address: string; city: string; state: string; pincode: string;
  country: string; artist_count: number; status: string; notes: string | null;
  payment_status: string; total_price: number; advance_amount: number;
  remaining_amount: number | null; negotiated: boolean;
  negotiated_total: number | null; negotiated_advance: number | null;
  extra_hours: number; is_international: boolean;
};

type ArtistOrder = {
  id: string; order_type: string; style: string; face_count: number;
  status: string; customer_name: string; created_at: string;
  expected_delivery_date: string | null; art_confirmation_status: string | null;
  notes: string | null; delivery_address: string | null; delivery_city: string | null;
  delivery_state: string | null; delivery_pincode: string | null;
  amount: number; customer_mobile: string; customer_email: string;
  instagram_id: string | null;
};

type BlockedDate = {
  id: string; blocked_date: string; blocked_start_time: string | null;
  blocked_end_time: string | null; reason: string | null; artist_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", in_progress: "In Progress", artwork_ready: "Art Ready",
  dispatched: "Dispatched", delivered: "Delivered", completed: "Completed",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending", partial_1_paid: "Partial Paid", confirmed: "Advance Paid",
  fully_paid: "Fully Paid",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial_1_paid: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
  fully_paid: "bg-green-100 text-green-800",
};

// Fullscreen image viewer for order photos
const ArtistOrderImages = ({ orderId }: { orderId: string }) => {
  const [images, setImages] = useState<{ id: string; storage_path: string; file_name: string }[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase.from("order_images").select("id, storage_path, file_name").eq("order_id", orderId);
      if (data && data.length > 0) {
        setImages(data);
        const u: Record<string, string> = {};
        for (const img of data) {
          const { data: signed } = await supabase.storage.from("order-photos").createSignedUrl(img.storage_path, 3600);
          if (signed?.signedUrl) u[img.id] = signed.signedUrl;
        }
        setUrls(u);
      }
    };
    fetchImages();
  }, [orderId]);

  if (images.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-sans text-muted-foreground mb-1">📸 Customer Photos ({images.length}):</p>
      <div className="flex gap-1 flex-wrap">
        {images.map((img, idx) => (
          <div key={img.id} className="w-14 h-14 rounded border border-border overflow-hidden cursor-pointer" onClick={() => { setCurrentIndex(idx); setViewerOpen(true); }}>
            {urls[img.id] ? <img src={urls[img.id]} alt={img.file_name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
          </div>
        ))}
      </div>
      <AnimatePresence>
        {viewerOpen && images[currentIndex] && urls[images[currentIndex].id] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={() => setViewerOpen(false)}>
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <span className="text-white/70 text-sm font-sans">{currentIndex + 1} / {images.length}</span>
              <button onClick={() => setViewerOpen(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4 max-w-full px-4" onClick={e => e.stopPropagation()}>
              {images.length > 1 && <button onClick={() => setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1))} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">‹</button>}
              <motion.img key={currentIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                src={urls[images[currentIndex].id]} alt={images[currentIndex].file_name} className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg" />
              {images.length > 1 && <button onClick={() => setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0))} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">›</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Payment Collection Dialog
const PaymentCollectionDialog = ({ event, open, onClose, onSuccess, artistId }: {
  event: ArtistEvent; open: boolean; onClose: () => void; onSuccess: () => void; artistId: string;
}) => {
  const [step, setStep] = useState<"details" | "method" | "screenshot" | "done">("details");
  const [extraHoursInput, setExtraHoursInput] = useState("");
  const [extraHourRate, setExtraHourRate] = useState(0);
  const [collectionMethod, setCollectionMethod] = useState<"online" | "cash" | "portal" | "">("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const totalAmount = event.negotiated && event.negotiated_total ? event.negotiated_total : event.total_price;
  const advanceAmount = event.negotiated && event.negotiated_advance ? event.negotiated_advance : event.advance_amount;
  const baseRemaining = event.remaining_amount || (totalAmount - advanceAmount);
  const extraHoursNum = parseFloat(extraHoursInput) || 0;
  
  useEffect(() => {
    const fetchRate = async () => {
      const region = event.city?.toLowerCase().includes("mumbai") || event.city?.toLowerCase().includes("thane") ? "mumbai" : "outside";
      const { data } = await supabase.from("event_pricing").select("extra_hour_rate").eq("region", region).eq("artist_count", event.artist_count).maybeSingle();
      setExtraHourRate(data?.extra_hour_rate || (region === "mumbai" ? 4000 : 5000));
    };
    if (open) fetchRate();
  }, [open, event]);

  const extraAmount = extraHoursNum * extraHourRate;
  const totalToCollect = baseRemaining + extraAmount;

  const handlePortalPayment = async () => {
    setUploading(true);
    try {
      // Get event booking user_id
      const { data: booking } = await supabase.from("event_bookings").select("user_id").eq("id", event.id).single();
      if (!booking?.user_id) throw new Error("Customer not found");

      await supabase.from("portal_payment_requests" as any).insert({
        event_id: event.id,
        artist_id: artistId,
        user_id: booking.user_id,
        amount: totalToCollect,
        extra_hours: extraHoursNum,
        extra_amount: extraAmount,
        status: "pending",
      } as any);

      setStep("done");
      toast({ title: "📲 Payment Request Sent!", description: "Customer will receive a payment prompt on their dashboard" });
      setTimeout(() => { onClose(); onSuccess(); }, 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleCollect = async () => {
    if (!collectionMethod) return;
    setUploading(true);
    try {
      if (screenshotFile) {
        const path = `payment-screenshots/${event.id}/${Date.now()}_${screenshotFile.name}`;
        await supabase.storage.from("event-documents").upload(path, screenshotFile);
      }

      const { data, error } = await supabase.functions.invoke("collect-event-payment", {
        body: { event_id: event.id, collection_method: collectionMethod, extra_hours: extraHoursNum, extra_amount: extraAmount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setStep("done");
      toast({ title: "✅ Payment Collected!", description: `₹${totalToCollect.toLocaleString("en-IN")} collected via ${collectionMethod}` });
      setTimeout(() => { onClose(); onSuccess(); }, 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to collect payment", variant: "destructive" });
    }
    setUploading(false);
  };

  const resetDialog = () => {
    setStep("details");
    setExtraHoursInput("");
    setCollectionMethod("");
    setScreenshotFile(null);
  };

  useEffect(() => { if (open) resetDialog(); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" /> Collect Remaining Payment
          </DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm font-sans">
                <span className="text-muted-foreground">Total Event Amount</span>
                <span className="font-semibold">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm font-sans">
                <span className="text-muted-foreground">Advance Paid</span>
                <span className="text-green-600">- ₹{advanceAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-sans font-semibold">
                <span>Base Remaining</span>
                <span className="text-primary">₹{baseRemaining.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-sans flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" /> Extra Hours Demanded
              </Label>
              <Input
                type="number" min="0" step="0.5" value={extraHoursInput}
                onChange={e => setExtraHoursInput(e.target.value)}
                placeholder="Enter extra hours (e.g. 1, 1.5, 2)"
                className="h-11"
              />
              {extraHoursNum > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-sans text-muted-foreground">Extra hour rate: ₹{extraHourRate.toLocaleString("en-IN")}/hr</p>
                  <p className="text-sm font-sans font-semibold text-primary">
                    Extra charges: ₹{extraAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-xs font-sans text-muted-foreground mb-1">Total Amount to Collect</p>
              <p className="text-3xl font-display font-bold text-primary">₹{totalToCollect.toLocaleString("en-IN")}</p>
            </div>

            <Button onClick={() => setStep("method")} className="w-full h-11 rounded-xl font-sans" disabled={totalToCollect <= 0}>
              Proceed to Collect ₹{totalToCollect.toLocaleString("en-IN")}
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground font-sans">Collecting</p>
              <p className="text-2xl font-display font-bold text-primary">₹{totalToCollect.toLocaleString("en-IN")}</p>
            </div>

            <p className="text-sm font-sans text-muted-foreground text-center">How is the customer paying?</p>

            <div className="grid grid-cols-3 gap-2">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCollectionMethod("online"); setStep("screenshot"); }}
                className="p-3 rounded-xl border-2 text-center space-y-1.5 transition-all border-border hover:border-primary/40">
                <CreditCard className="w-7 h-7 mx-auto text-primary" />
                <p className="font-sans font-semibold text-xs">Online</p>
                <p className="text-[9px] text-muted-foreground font-sans">UPI / Bank</p>
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCollectionMethod("cash"); handleCollectCash(); }}
                className="p-3 rounded-xl border-2 text-center space-y-1.5 transition-all border-border hover:border-primary/40">
                <Banknote className="w-7 h-7 mx-auto text-green-600" />
                <p className="font-sans font-semibold text-xs">Cash</p>
                <p className="text-[9px] text-muted-foreground font-sans">In hand</p>
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCollectionMethod("portal"); handlePortalPayment(); }}
                className="p-3 rounded-xl border-2 text-center space-y-1.5 transition-all border-border hover:border-primary/40 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
                <Phone className="w-7 h-7 mx-auto text-blue-600" />
                <p className="font-sans font-semibold text-xs">Portal</p>
                <p className="text-[9px] text-muted-foreground font-sans">Send to app</p>
              </motion.button>
            </div>
          </div>
        )}

        {step === "screenshot" && (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground font-sans">Online Payment</p>
              <p className="text-2xl font-display font-bold text-primary">₹{totalToCollect.toLocaleString("en-IN")}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-sans flex items-center gap-1">
                <Camera className="w-4 h-4" /> Upload Payment Screenshot
              </Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => document.getElementById("ss-upload")?.click()}>
                {screenshotFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
                    <p className="text-sm font-sans text-foreground">{screenshotFile.name}</p>
                    <p className="text-[10px] text-muted-foreground font-sans">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-sans text-muted-foreground">Tap to upload screenshot</p>
                  </div>
                )}
              </div>
              <input id="ss-upload" type="file" accept="image/*" className="hidden" onChange={e => setScreenshotFile(e.target.files?.[0] || null)} />
            </div>

            <Button onClick={handleCollect} disabled={uploading} className="w-full h-11 rounded-xl font-sans">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Confirm Collection ₹${totalToCollect.toLocaleString("en-IN")}`}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            </motion.div>
            <p className="font-display text-xl font-bold">
              {collectionMethod === "portal" ? "Payment Request Sent!" : "Payment Collected!"}
            </p>
            <p className="text-sm text-muted-foreground font-sans">
              {collectionMethod === "portal" 
                ? "Customer will receive a payment prompt on their dashboard"
                : `₹${totalToCollect.toLocaleString("en-IN")} via ${collectionMethod}`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function handleCollectCash() {
    setCollectionMethod("cash");
    setTimeout(() => handleCollect(), 100);
  }
};

// Artist-specific notifications (only event/assignment related, not admin broadcasts)
const ArtistNotifications = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    const ch = supabase.channel(`artist-notifs-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", userId)
      .in("type", ["event", "payment", "chat", "order"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    fetchNotifications();
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notifications
          {unread > 0 && <Badge className="bg-primary text-primary-foreground text-xs">{unread}</Badge>}
        </h2>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs rounded-full font-sans">Mark All Read</Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-sans">No notifications yet</p>
        </CardContent></Card>
      ) : (
        notifications.map(n => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`cursor-pointer transition-all ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => { if (!n.read) markRead(n.id); }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className={`font-sans text-sm ${!n.read ? "font-bold" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-sans mt-2">
                      {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

const ArtistDashboard = () => {
  const navigate = useNavigate();
  usePermissions(true);
  const { user, loading: authLoading, signOut } = useAuth();
  const [artist, setArtist] = useState<{ id: string; name: string; portfolio_url: string | null } | null>(null);
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [orders, setOrders] = useState<ArtistOrder[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRitesh, setIsRitesh] = useState(false);
  const [activeTab, setActiveTab] = useState("events");
  const [orderFilter, setOrderFilter] = useState("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [collectEvent, setCollectEvent] = useState<ArtistEvent | null>(null);
  const [portalPaymentReceived, setPortalPaymentReceived] = useState(false);

  // Block date form
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => { if (loading) setLoading(false); }, 8000);
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/artistlogin", { replace: true }); return; }
    fetchArtistProfile(user.id);
  }, [user, authLoading]);

  const fetchArtistProfile = async (userId: string) => {
    const { data: artistData } = await (supabase.from("artists").select("id, name, portfolio_url") as any).eq("auth_user_id", userId).maybeSingle();
    if (!artistData) { navigate("/dashboard"); return; }
    setArtist(artistData as any);
    const isR = (artistData as any).name?.toLowerCase().includes("ritesh");
    setIsRitesh(isR);
    fetchEvents((artistData as any).id);
    fetchBlockedDates((artistData as any).id);
    if (isR) fetchOrders((artistData as any).id);

    // Init web push for artist notifications
    requestBrowserNotificationPermission(userId).catch(() => {});
    initWebPush(userId).catch(() => {});

    const ch = supabase.channel(`artist-dashboard-rt-${(artistData as any).id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_artist_assignments" }, () => fetchEvents((artistData as any).id))
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchEvents((artistData as any).id))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { if (isR) fetchOrders((artistData as any).id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, () => fetchEvents((artistData as any).id))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "portal_payment_requests" }, (payload: any) => {
        if (payload.new?.artist_id === (artistData as any).id && payload.new?.status === "completed") {
          setPortalPaymentReceived(true);
          fetchEvents((artistData as any).id);
          setTimeout(() => setPortalPaymentReceived(false), 6000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  const fetchEvents = async (artistId: string) => {
    const { data: assignments } = await supabase.from("event_artist_assignments").select("event_id").eq("artist_id", artistId) as any;
    const { data: legacyEvents } = await supabase.from("event_bookings").select("id").eq("assigned_artist_id", artistId);
    const eventIds = new Set<string>();
    if (assignments) assignments.forEach((a: any) => eventIds.add(a.event_id));
    if (legacyEvents) legacyEvents.forEach((e: any) => eventIds.add(e.id));
    if (eventIds.size === 0) { setEvents([]); setLoading(false); return; }

    const { data } = await supabase.from("event_bookings")
      .select("id, client_name, client_mobile, client_email, client_instagram, event_type, event_date, event_start_time, event_end_time, venue_name, full_address, city, state, pincode, country, artist_count, status, notes, payment_status, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance, extra_hours, is_international")
      .in("id", Array.from(eventIds))
      .order("event_date", { ascending: true });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  const fetchOrders = async (artistId: string) => {
    const { data } = await supabase.from("orders")
      .select("id, order_type, style, face_count, status, customer_name, created_at, expected_delivery_date, art_confirmation_status, ask_user_delivered, notes, delivery_address, delivery_city, delivery_state, delivery_pincode, amount, customer_mobile, customer_email, instagram_id")
      .eq("assigned_artist_id", artistId).order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const fetchBlockedDates = async (artistId: string) => {
    const { data } = await (supabase.from("artist_blocked_dates").select("id, blocked_date, blocked_start_time, blocked_end_time, reason, artist_id") as any)
      .eq("artist_id", artistId).order("blocked_date", { ascending: true });
    if (data) setBlockedDates(data as any);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Status Updated!" }); if (artist) fetchOrders(artist.id); }
  };

  const handleAddBlockedDate = async () => {
    if (!artist || !blockDate) { toast({ title: "Please select a date", variant: "destructive" }); return; }
    setAddingBlock(true);
    const { error } = await (supabase.from("artist_blocked_dates").insert({
      artist_id: artist.id, blocked_date: blockDate,
      blocked_start_time: blockStartTime || null, blocked_end_time: blockEndTime || null,
      reason: blockReason || null,
    }) as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Date Blocked! 📅" });
      // Log the action
      await supabase.from("artist_action_logs" as any).insert({
        artist_id: artist.id, artist_name: artist.name, action_type: "blocked_date",
        description: `Blocked ${blockDate}${blockStartTime ? ` (${blockStartTime}-${blockEndTime})` : ""}${blockReason ? ` - ${blockReason}` : ""}`,
        metadata: { date: blockDate, start_time: blockStartTime, end_time: blockEndTime, reason: blockReason },
      } as any);
      setBlockDate(""); setBlockStartTime(""); setBlockEndTime(""); setBlockReason(""); fetchBlockedDates(artist.id);
    }
    setAddingBlock(false);
  };

  const handleDeleteBlock = async (id: string) => {
    const bd = blockedDates.find(b => b.id === id);
    const { error } = await (supabase.from("artist_blocked_dates").delete() as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Unblocked!" });
      if (artist) {
        // Log the action
        await supabase.from("artist_action_logs" as any).insert({
          artist_id: artist.id, artist_name: artist.name, action_type: "unblocked_date",
          description: `Unblocked ${bd?.blocked_date || "date"}`,
          metadata: { date: bd?.blocked_date, reason: bd?.reason },
        } as any);
        fetchBlockedDates(artist.id);
      }
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/artistlogin"); };
  const handleRefresh = async () => {
    if (!artist) return;
    toast({ title: "Refreshing..." });
    await Promise.all([fetchEvents(artist.id), fetchBlockedDates(artist.id), ...(isRitesh ? [fetchOrders(artist.id)] : [])]);
    toast({ title: "Refreshed!" });
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === "all") return true;
    if (orderFilter === "upcoming") return ["new", "in_progress"].includes(o.status);
    if (orderFilter === "completed") return ["delivered", "completed", "artwork_ready", "dispatched"].includes(o.status);
    return true;
  });

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const upcoming = events.filter(e => e.status === "upcoming");
  const completed = events.filter(e => e.status === "completed");
  const totalToCollect = events.reduce((sum, e) => {
    const totalAmount = e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price;
    const advanceAmount = e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount;
    const remainingAmount = e.payment_status === "fully_paid" ? 0 : (e.remaining_amount ?? (totalAmount - advanceAmount));
    return sum + Math.max(remainingAmount, 0);
  }, 0);

  return (
      <div className="min-h-screen dashboard-gradient pb-24 md:pb-0 overflow-x-hidden">
      <SEOHead title="Artist Dashboard" noindex />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border dashboard-header backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full border border-border" />
            <h1 className="font-calligraphy text-lg font-bold">Artist Panel</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="font-sans"><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans hidden md:flex"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-2 py-3 sm:px-4 sm:py-4">
        <div className="mb-3">
          <AdminSmartSearch panelType="artist"
            tabs={[{ id: "events", label: "Events" }, { id: "orders", label: "Orders" }]}
            onNavigate={(tab, highlightId) => {
              setActiveTab(tab);
              if (highlightId) setTimeout(() => {
                const el = document.querySelector(`[data-search-id="${highlightId}"]`);
                if (el) { el.classList.add("search-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.classList.remove("search-highlight"), 4000); }
              }, 300);
            }}
          />
        </div>
        <LiveGreeting name={artist?.name} />

        {/* Stats Row - Premium 3D Cards */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
          {[
            { label: "Total Events", value: events.length, icon: CalendarDays, color: "from-primary/10 to-primary/5", iconBg: "bg-primary", desc: `${upcoming.length} upcoming` },
            { label: "This Month", value: events.filter(e => { const d = new Date(e.event_date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length, icon: Clock, color: "from-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500", desc: "events this month" },
            { label: "Completed", value: completed.length, icon: CheckCircle2, color: "from-green-500/10 to-green-500/5", iconBg: "bg-green-500", desc: `${((completed.length / Math.max(events.length, 1)) * 100).toFixed(0)}% completion` },
            { label: "To Collect", value: `₹${totalToCollect >= 100000 ? (totalToCollect / 100000).toFixed(1) + "L" : totalToCollect >= 1000 ? (totalToCollect / 1000).toFixed(0) + "K" : totalToCollect.toLocaleString("en-IN")}`, icon: IndianRupee, color: "from-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500", desc: "pending from assigned events" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="overflow-hidden relative border-border/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} pointer-events-none`} />
                <CardContent className="p-3.5 relative">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.iconBg} shadow-md flex-shrink-0`}>
                      <s.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold font-display leading-tight">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-sans truncate">{s.label}</p>
                      <p className="text-[9px] text-muted-foreground/70 font-sans">{s.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Upcoming Events Quick View */}
        {upcoming.length > 0 && activeTab !== "events" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-3">
                <p className="text-xs font-sans font-semibold text-primary mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Next Event
                </p>
                {(() => {
                  const next = upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
                  if (!next) return null;
                  const [ny, nm, nd] = next.event_date.split("-").map(Number);
                  const nDate = new Date(ny, nm - 1, nd);
                  const nToday = new Date(); nToday.setHours(0,0,0,0);
                  const nDays = Math.round((nDate.getTime() - nToday.getTime()) / (1000*60*60*24));
                  return (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sans text-sm font-medium">{next.client_name} · {next.city}</p>
                        <p className="text-[10px] text-muted-foreground font-sans">{nDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" })} · {next.event_start_time}</p>
                      </div>
                      <Badge className="border-none text-xs bg-primary/15 text-primary font-display">
                        {nDays === 0 ? "Today!" : nDays === 1 ? "Tomorrow" : `${nDays}d`}
                      </Badge>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Desktop Tabs */}
        <div className="mb-4 hidden flex-wrap gap-1 rounded-xl bg-muted/30 p-1 md:flex">
          {[
            { id: "events", icon: CalendarDays, label: "Events" },
            ...(isRitesh ? [{ id: "orders", icon: Package, label: "Orders" }] : []),
            { id: "earnings", icon: Wallet, label: "Earnings" },
            { id: "blocked", icon: CalendarOff, label: "Block Dates" },
            { id: "chat", icon: MessageCircle, label: "Chat" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-sans flex-1 transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Events Tab */}
        {activeTab === "events" && (
          <div>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Your Events ({events.length})
            </h2>
            {events.length === 0 ? (
              <Card><CardContent className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-sans text-muted-foreground">No events assigned yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  // Parse YYYY-MM-DD as local date to avoid timezone issues
                  const [yyyy, mm, dd] = ev.event_date.split("-").map(Number);
                  const eventDate = new Date(yyyy, mm - 1, dd);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const daysLeft = Math.round((eventDate.getTime() - today.getTime()) / (1000*60*60*24));
                  const dayName = eventDate.toLocaleDateString("en-IN", { weekday: "long" });
                  const isExpanded = expandedEvent === ev.id;
                  const totalAmt = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
                  const advAmt = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
                  const remaining = ev.remaining_amount || (totalAmt - advAmt);
                  const canCollect = ev.payment_status !== "fully_paid" && ev.status !== "cancelled";

                  return (
                    <motion.div key={ev.id} data-search-id={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className={`overflow-hidden transition-all ${ev.status === "completed" ? "opacity-80" : ""}`}>
                        <CardContent className="p-0">
                          {/* Countdown banner */}
                          {ev.status === "upcoming" && daysLeft >= 0 && (
                            <div className={`p-2 text-center ${daysLeft === 0 ? "bg-primary/20" : daysLeft <= 3 ? "bg-amber-50" : "bg-primary/5"}`}>
                              <p className="font-display text-lg font-bold text-primary">
                                {daysLeft === 0 ? "🎊 Today!" : daysLeft === 1 ? `✨ Tomorrow (${dayName})!` : `${daysLeft} days to go (${dayName})`}
                              </p>
                            </div>
                          )}

                          {/* Main info */}
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-sans font-semibold text-foreground">{ev.client_name}</p>
                                <Badge className="border-none text-[10px] bg-primary/10 text-primary mt-0.5">
                                  {EVENT_TYPES.find(t => t.value === ev.event_type)?.label || ev.event_type}
                                </Badge>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-[10px]`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                                <Badge className={`${PAYMENT_STATUS_COLORS[ev.payment_status] || "bg-gray-100 text-gray-800"} border-none text-[10px]`}>
                                  {PAYMENT_STATUS_LABELS[ev.payment_status] || ev.payment_status}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-xs font-sans space-y-1 text-muted-foreground">
                              <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}</p>
                              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue_name}, {ev.city}</p>
                            </div>

                            {/* Expand/Collapse */}
                            <button onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                              className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-primary font-sans py-1 hover:bg-primary/5 rounded-lg transition-colors">
                              {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less Details</> : <><ChevronDown className="w-3 h-3" /> Full Details</>}
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden">
                                  <div className="bg-muted/30 rounded-lg p-3 mt-2 space-y-2 text-xs font-sans">
                                    <p className="font-semibold text-foreground text-sm">📋 Full Event Details</p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <div><span className="text-muted-foreground">Client:</span> {ev.client_name}</div>
                                      <div><span className="text-muted-foreground">Mobile:</span> <a href={`tel:${ev.client_mobile}`} className="text-primary underline">{ev.client_mobile}</a></div>
                                      <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${ev.client_email}`} className="text-primary underline">{ev.client_email}</a></div>
                                      {ev.client_instagram && <div><span className="text-muted-foreground">Instagram:</span> {ev.client_instagram}</div>}
                                      <div><span className="text-muted-foreground">Artists:</span> {ev.artist_count}{ev.artist_count > 1 ? " (multi-artist event)" : ""}</div>
                                      <div><span className="text-muted-foreground">Country:</span> {ev.country}</div>
                                    </div>
                                    <div className="border-t border-border pt-2">
                                      <p><span className="text-muted-foreground">Venue:</span> {ev.venue_name}</p>
                                      <p><span className="text-muted-foreground">Address:</span> {ev.full_address}</p>
                                      <p><span className="text-muted-foreground">Area:</span> {ev.city}, {ev.state} - {ev.pincode}</p>
                                    </div>
                                    {ev.notes && (
                                      <div className="border-t border-border pt-2">
                                        <p><span className="text-muted-foreground">Notes:</span> {ev.notes}</p>
                                      </div>
                                    )}
                                    <div className="border-t border-border pt-2 space-y-1">
                                      <p className="font-semibold text-sm">💰 Payment Details</p>
                                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                        <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">₹{totalAmt.toLocaleString("en-IN")}</span></div>
                                        <div><span className="text-muted-foreground">Advance:</span> <span className="text-green-600">₹{advAmt.toLocaleString("en-IN")}</span></div>
                                        <div><span className="text-muted-foreground">Remaining:</span> <span className="text-primary font-bold">₹{remaining.toLocaleString("en-IN")}</span></div>
                                        <div><span className="text-muted-foreground">Extra Hrs:</span> {ev.extra_hours || 0}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Collect Payment Button */}
                                  {canCollect && (
                                    <Button onClick={() => setCollectEvent(ev)} className="w-full mt-3 h-11 rounded-xl font-sans bg-green-600 hover:bg-green-700 text-white">
                                      <IndianRupee className="w-4 h-4 mr-1" /> Collect ₹{remaining.toLocaleString("en-IN")} Remaining
                                    </Button>
                                  )}
                                  {ev.payment_status === "fully_paid" && (
                                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600 text-sm font-sans">
                                      <CheckCircle2 className="w-4 h-4" /> Fully Paid ✅
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab - Ritesh Only */}
        {activeTab === "orders" && isRitesh && (
          <div>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Custom Caricatures
            </h2>
            <div className="flex gap-1.5 mb-4">
              {[
                { value: "all", label: `All (${orders.length})` },
                { value: "upcoming", label: `Active (${orders.filter(o => ["new","in_progress"].includes(o.status)).length})` },
                { value: "completed", label: `Done (${orders.filter(o => ["delivered","completed","artwork_ready","dispatched"].includes(o.status)).length})` },
              ].map(tab => (
                <Button key={tab.value} variant={orderFilter === tab.value ? "default" : "outline"} size="sm" className="text-xs font-sans h-7 rounded-full" onClick={() => setOrderFilter(tab.value)}>
                  {tab.label}
                </Button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="font-sans text-muted-foreground">No orders</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <Card key={order.id} data-search-id={order.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="font-sans font-medium capitalize">{order.order_type} — {order.style}</p>
                          <p className="text-xs text-muted-foreground font-sans">{order.customer_name}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="border-none text-xs">{STATUS_LABELS[order.status] || order.status}</Badge>
                          <p className="font-sans text-sm font-bold text-primary mt-1">₹{order.amount}</p>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs font-sans">
                        <p><span className="text-muted-foreground">Faces:</span> {order.face_count}</p>
                        <p><span className="text-muted-foreground">Mobile:</span> {order.customer_mobile}</p>
                        {order.notes && <p><span className="text-muted-foreground">Notes:</span> {order.notes}</p>}
                      </div>
                      <ArtistOrderImages orderId={order.id} />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-sans">Status:</Label>
                        <Select value={order.status} onValueChange={v => updateOrderStatus(order.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <ArtworkUploadFlow orderId={order.id} orderStatus={order.status} artConfirmationStatus={order.art_confirmation_status} onStatusChange={() => { if (artist) fetchOrders(artist.id); }} isArtist />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocked Dates Tab */}
        {activeTab === "blocked" && (
          <Card>
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><CalendarOff className="w-5 h-5 text-primary" /> Block Dates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label className="font-sans text-xs">Date</Label><Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
                <div><Label className="font-sans text-xs">Reason</Label><Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Leave" /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label className="font-sans text-xs">From</Label><Input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} /></div>
                <div><Label className="font-sans text-xs">To</Label><Input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} /></div>
              </div>
              <Button onClick={handleAddBlockedDate} disabled={!blockDate || addingBlock} className="w-full rounded-full font-sans" size="sm">
                {addingBlock ? "Blocking..." : "Block Date"}
              </Button>
              {blockedDates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-sans text-muted-foreground font-medium">Blocked Dates</p>
                  {blockedDates.map(bd => (
                    <div key={bd.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm font-sans">
                      <div>
                        <span className="font-medium">{new Date(bd.blocked_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {bd.blocked_start_time && bd.blocked_end_time && <span className="text-muted-foreground ml-2 text-xs">{bd.blocked_start_time} - {bd.blocked_end_time}</span>}
                        {bd.reason && <span className="text-muted-foreground ml-2 text-xs">({bd.reason})</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(bd.id)} className="text-destructive h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && artist && (
          <div>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> My Earnings
            </h2>
            <ArtistEarnings artistId={artist.id} />
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && user && (
          <ArtistNotifications userId={user.id} />
        )}

        {/* Chat Tab (mobile) */}
        {activeTab === "chat" && user && artist && (
          <div className="fixed inset-0 z-40 bg-background flex flex-col" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }}>
            <ArtistChatPanel userId={user.id} userName={artist.name} />
          </div>
        )}
      </div>

      {/* Instagram-style Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Artist navigation">
          <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
          <div className="scrollbar-hide mx-auto flex h-[56px] max-w-lg items-center justify-evenly overflow-x-auto px-1">
            {[
              { id: "events", icon: CalendarDays },
              ...(isRitesh ? [{ id: "orders", icon: Package }] : []),
              { id: "earnings", icon: Wallet },
              { id: "blocked", icon: CalendarOff },
              { id: "chat", icon: MessageCircle },
              { id: "notifications", icon: Bell },
              { id: "home", icon: Home, path: "/" },
              { id: "logout", icon: LogOut, action: handleLogout },
            ].map(item => {
              const isActive = !item.path && !item.action && activeTab === item.id;
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.75 }}
                  onClick={() => {
                    if (item.action) { item.action(); return; }
                    if (item.path) { navigate(item.path); return; }
                    setActiveTab(item.id);
                  }}
                  className="flex items-center justify-center min-w-[40px] w-11 h-12 relative flex-shrink-0">
                  <item.icon className={`transition-all duration-200 ${isActive ? "w-6 h-6 stroke-[2.5px] text-foreground" : "w-5 h-5 stroke-[1.5px] text-muted-foreground"}`} />
                  {isActive && (
                    <motion.div layoutId="artist-nav-dot" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Chat Panel - desktop half-screen */}
      <div className="hidden md:block">
        {user && artist && activeTab === "chat" && (
          <div className="fixed right-0 top-0 bottom-0 w-[50vw] z-50 shadow-2xl">
            <ArtistChatPanel userId={user.id} userName={artist.name} isDesktop onClose={() => setActiveTab("events")} />
          </div>
        )}
      </div>

      {/* Payment Collection Dialog */}
      {collectEvent && (
        <PaymentCollectionDialog
          event={collectEvent}
          open={!!collectEvent}
          onClose={() => setCollectEvent(null)}
          onSuccess={() => { if (artist) fetchEvents(artist.id); }}
          artistId={artist?.id || ""}
        />
      )}

      {/* Portal Payment Received Popup */}
      <AnimatePresence>
        {portalPaymentReceived && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setPortalPaymentReceived(false)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-background rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.2, duration: 0.5 }}>
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 shadow-lg">
                  <CheckCircle2 className="w-14 h-14 text-white" />
                </div>
              </motion.div>
              <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="font-display text-2xl font-bold text-foreground mb-2">
                💰 Payment Received!
              </motion.h2>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground font-sans mb-4">
                Customer has completed the remaining payment via portal. The event is now fully paid! ✅
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <Button variant="outline" className="rounded-full font-sans" onClick={() => setPortalPaymentReceived(false)}>
                  Awesome! 🎉
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArtistDashboard;
