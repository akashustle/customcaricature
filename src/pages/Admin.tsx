import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/pricing";
import { LogOut, Search, Eye, BarChart3, Package, Trash2, AlertTriangle, Users, DollarSign, Plus, Save, X, Edit2, Settings, Upload, Image, Lock, UserPlus, KeyRound, RefreshCw, CalendarIcon, Calendar as CalIcon, Globe, Receipt, MapPin, Star, SplitSquareHorizontal, Bell, Monitor, Download, Home, Bot, ClipboardList, HelpCircle, Target, Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { validateEmailFormat } from "@/lib/email-validation";
import OrderDetail from "@/components/admin/OrderDetail";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveGreeting from "@/components/LiveGreeting";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import LocationDropdowns from "@/components/LocationDropdowns";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getStates, getDistricts, getCities } from "@/lib/india-locations";
import { usePermissions } from "@/hooks/usePermissions";
import AdminActionConfirm from "@/components/admin/AdminActionConfirm";
import { useAdminAction } from "@/hooks/useAdminAction";
import AdminNameGate from "@/components/admin/AdminNameGate";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminLocationPrompt from "@/components/AdminLocationPrompt";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import AdminOfflineBanner from "@/components/AdminOfflineBanner";
import NotificationBell from "@/components/NotificationBell";
import ExportButton from "@/components/admin/ExportButton";
import { MessageCircle, Radio } from "lucide-react";

// Lazy load all admin tab components for performance
const AdminAnalytics = lazy(() => import("@/components/admin/AdminAnalytics"));
const AdminEvents = lazy(() => import("@/components/admin/AdminEvents"));
const AdminArtists = lazy(() => import("@/components/admin/AdminArtists"));
const AdminCustomerPricing = lazy(() => import("@/components/admin/AdminCustomerPricing"));
const AdminCustomerEventPricing = lazy(() => import("@/components/admin/AdminCustomerEventPricing"));
const AdminCustomerIntlPricing = lazy(() => import("@/components/admin/AdminCustomerIntlPricing"));
const AdminInternationalPricing = lazy(() => import("@/components/admin/AdminInternationalPricing"));
const AdminPartialAdvanceConfig = lazy(() => import("@/components/admin/AdminPartialAdvanceConfig"));
const AdminPayments = lazy(() => import("@/components/admin/AdminPayments"));
const AdminLiveLocations = lazy(() => import("@/components/admin/AdminLiveLocations"));
const AdminReviews = lazy(() => import("@/components/admin/AdminReviews"));
const AdminLiveChatLeads = lazy(() => import("@/components/admin/AdminLiveChatLeads"));
const AdminVoiceMonitor = lazy(() => import("@/components/admin/AdminVoiceMonitor"));
const ArtworkUploadFlow = lazy(() => import("@/components/admin/ArtworkUploadFlow"));
const AdminMediaAuditLog = lazy(() => import("@/components/admin/AdminMediaAuditLog"));
const AdminNotificationSender = lazy(() => import("@/components/admin/AdminNotificationSender"));
const AdminPushCenter = lazy(() => import("@/components/admin/AdminPushCenter"));
const AdminSessionsLog = lazy(() => import("@/components/admin/AdminSessionsLog"));
const AdminChatbotTraining = lazy(() => import("@/components/admin/AdminChatbotTraining"));
const AdminAIChatConversations = lazy(() => import("@/components/admin/AdminAIChatConversations"));
const AdminChat = lazy(() => import("@/components/admin/AdminChat"));
const AdminEnquiries = lazy(() => import("@/components/admin/AdminEnquiries"));
const AdminSupport = lazy(() => import("@/components/admin/AdminSupport"));
const AdminSEOSettings = lazy(() => import("@/components/admin/AdminSEOSettings"));
const AdminBlog = lazy(() => import("@/components/admin/AdminBlog"));
const AdminIntegrations = lazy(() => import("@/components/admin/AdminIntegrations"));
const AdminFileExplorer = lazy(() => import("@/components/admin/AdminFileExplorer"));
const AdminExploreEditor = lazy(() => import("@/components/admin/AdminExploreEditor"));
const AdminGallery = lazy(() => import("@/components/admin/AdminGallery"));
const AdminBeforeAfter = lazy(() => import("@/components/admin/AdminBeforeAfter"));
const AdminHomepageReviews = lazy(() => import("@/components/admin/AdminHomepageReviews"));
const AdminTrustedBrands = lazy(() => import("@/components/admin/AdminTrustedBrands"));
const AdminSocialLinks = lazy(() => import("@/components/admin/AdminSocialLinks"));
const AdminPages = lazy(() => import("@/components/admin/AdminPages"));
const AdminCalculatorHistory = lazy(() => import("@/components/admin/AdminCalculatorHistory"));
const AdminHomepageControl = lazy(() => import("@/components/admin/AdminHomepageControl"));
const AdminCRMPipeline = lazy(() => import("@/components/admin/AdminCRMPipeline"));
const AdminRevenueDashboard = lazy(() => import("@/components/admin/AdminRevenueDashboard"));
const AdminAutomation = lazy(() => import("@/components/admin/AdminAutomation"));
const AdminTeamManagement = lazy(() => import("@/components/admin/AdminTeamManagement"));
const AdminSmartSearch = lazy(() => import("@/components/admin/AdminSmartSearch"));
const AdminAIIntelligence = lazy(() => import("@/components/admin/AdminAIIntelligence"));
const AdminPushUpdate = lazy(() => import("@/components/admin/AdminPushUpdate"));
const AdminDashboardPremium = lazy(() => import("@/components/admin/AdminDashboardPremium"));
const AdminQuickActions = lazy(() => import("@/components/admin/AdminQuickActions"));
const AdminWorkspaceSwitcher = lazy(() => import("@/components/admin/AdminWorkspaceSwitcher"));
const AdminContentEditor = lazy(() => import("@/components/admin/AdminContentEditor"));
const AdminFormBuilder = lazy(() => import("@/components/admin/AdminFormBuilder"));
const AdminDesignControl = lazy(() => import("@/components/admin/AdminDesignControl"));
const AdminActivityLogs = lazy(() => import("@/components/admin/AdminActivityLogs"));
const AdminSecurityDashboard = lazy(() => import("@/components/admin/AdminSecurityDashboard"));
const AdminMonitoringAI = lazy(() => import("@/components/admin/AdminMonitoringAI"));
const AdminRevenueTargetTracker = lazy(() => import("@/components/admin/AdminRevenueTargetTracker"));
const AdminDrillDownDialog = lazy(() => import("@/components/admin/AdminDrillDownDialog"));
const AdminReferrals = lazy(() => import("@/components/admin/AdminReferrals"));
const AdminCoupons = lazy(() => import("@/components/admin/AdminCoupons"));
const AdminMaintenance = lazy(() => import("@/components/admin/AdminMaintenance"));
const AdminInvoices = lazy(() => import("@/components/admin/AdminInvoices"));
const AdminFeatureGating = lazy(() => import("@/components/admin/AdminFeatureGating"));
const AdminCalendar = lazy(() => import("@/components/admin/AdminCalendar"));
const AdminWebsiteAnalytics = lazy(() => import("@/components/admin/AdminWebsiteAnalytics"));
const AdminQuickQuestions = lazy(() => import("@/components/admin/AdminQuickQuestions"));
const AdminColleagues = lazy(() => import("@/components/admin/AdminColleagues"));
const AdminFAQs = lazy(() => import("@/components/admin/AdminFAQs"));
const AdminGoogleSheet = lazy(() => import("@/components/admin/AdminGoogleSheet"));
const AdminMiniDatabase = lazy(() => import("@/components/admin/AdminMiniDatabase"));
const AdminLiveActivityTicker = lazy(() => import("@/components/admin/AdminLiveActivityTicker"));
const AdminHeatmap = lazy(() => import("@/components/admin/AdminHeatmap"));

const AdminTabLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const AdminFloatingChatButton = ({ onClick }: { onClick: () => void }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("is_admin", false).eq("read", false);
      const { count: aiCount } = await supabase.from("ai_chat_sessions").select("id", { count: "exact", head: true }).eq("admin_joined", false).eq("status", "active");
      setUnreadCount((count || 0) + (aiCount || 0));
    };
    fetchUnread();
    const ch = supabase.channel("admin-chat-float")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, fetchUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_chat_sessions" }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return (
    <button
      onClick={onClick}
      className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
    >
      <MessageCircle className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

type Order = {
  id: string;
  caricature_type: string;
  order_type: string;
  customer_name: string;
  city: string | null;
  amount: number;
  negotiated_amount: number | null;
  is_framed: boolean | null;
  status: string;
  payment_status: string | null;
  priority: number | null;
  created_at: string;
  expected_delivery_date: string | null;
  customer_mobile: string;
  customer_email: string;
};

type CaricatureType = {
  id: string;
  name: string;
  slug: string;
  price: number;
  per_face: boolean;
  min_faces: number;
  max_faces: number;
  is_active: boolean;
  sort_order: number;
};

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  email: string;
  instagram_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  secret_code: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border border-amber-200",
  artwork_ready: "bg-violet-50 text-violet-700 border border-violet-200",
  dispatched: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};
const STATUS_LABELS: Record<string, string> = {
  new: "New Order", in_progress: "In Progress", artwork_ready: "Artwork Ready",
  dispatched: "Dispatched", delivered: "Delivered",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "Pending", confirmed: "Confirmed" };
const PAYMENT_COLORS: Record<string, string> = { pending: "bg-orange-50 text-orange-700 border border-orange-200", confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200" };

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, updateSetting } = useSiteSettings();
  usePermissions(true);
  useAutoLogout(false);
  const [adminEnteredName, setAdminEnteredName] = useState<string | null>(() => sessionStorage.getItem("admin_entered_name"));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Auto-set admin name from profile (bypass name gate)
  useEffect(() => {
    if (user && !adminEnteredName) {
      const autoSetName = async () => {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
        if (profile?.full_name) {
          sessionStorage.setItem("admin_entered_name", profile.full_name);
          setAdminEnteredName(profile.full_name);
        }
      };
      autoSetName();
    }
  }, [user, adminEnteredName]);

  useEffect(() => {
    if (!user) return;
    const syncSharedAdminState = async () => {
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();
      const fullName = profile?.full_name || user.user_metadata?.full_name || "Admin";
      sessionStorage.setItem("admin_entered_name", fullName);
      localStorage.setItem("workshop_admin", JSON.stringify({
        id: user.id,
        email: profile?.email || user.email,
        name: fullName,
      }));
    };
    syncSharedAdminState();
  }, [user]);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [caricatureTypes, setCaricatureTypes] = useState<CaricatureType[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerTab, setCustomerTab] = useState<"all" | "registered" | "manual">("all");
  const [artistProfiles, setArtistProfiles] = useState<any[]>([]);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editTypeData, setEditTypeData] = useState<Partial<CaricatureType>>({});
  const [negotiateOrderId, setNegotiateOrderId] = useState<string | null>(null);
  const [negotiatedAmount, setNegotiatedAmount] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<Partial<Profile>>({});
  const [newType, setNewType] = useState({ name: "", slug: "", price: 0, per_face: false, min_faces: 1, max_faces: 1 });
  const [newCustomer, setNewCustomer] = useState({ full_name: "", mobile: "", email: "", instagram_id: "", address: "", city: "", state: "", pincode: "", password: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("admin_last_tab");
    return saved || "dashboard";
  });

  // Persist last active tab
  useEffect(() => {
    localStorage.setItem("admin_last_tab", activeTab);
  }, [activeTab]);
  const [customerPricingUserId, setCustomerPricingUserId] = useState<string | null>(null);
  const [customerPricingUserName, setCustomerPricingUserName] = useState("");
  const [customerEventPricingUserId, setCustomerEventPricingUserId] = useState<string | null>(null);
  const [customerEventPricingUserName, setCustomerEventPricingUserName] = useState("");
  const [partialAdvanceUserId, setPartialAdvanceUserId] = useState<string | null>(null);
  const [partialAdvanceUserName, setPartialAdvanceUserName] = useState("");
  const [customerIntlPricingUserId, setCustomerIntlPricingUserId] = useState<string | null>(null);
  const [customerIntlPricingUserName, setCustomerIntlPricingUserName] = useState("");
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    customerId: "", orderType: "single" as string, style: "artists_choice" as string,
    faceCount: 1, amount: 0, notes: "", negotiated: false, negotiatedAmount: 0,
    deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryPincode: "", deliveryDistrict: "",
  });
  const [manualPhotos, setManualPhotos] = useState<File[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [addingOrder, setAddingOrder] = useState(false);
  // Admin settings state
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [changingAdminPassword, setChangingAdminPassword] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminMobile, setNewAdminMobile] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [editingAdminProfile, setEditingAdminProfile] = useState(false);
  const [adminEditData, setAdminEditData] = useState<Partial<Profile>>({});
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  // Admin permission system
  const ADMIN_TABS = [
    { id: "orders", label: "Orders" }, { id: "events", label: "Events" },
    { id: "payments", label: "Payments" }, { id: "analytics", label: "Analytics" },
    { id: "ai-conversations", label: "AI Chats" }, { id: "chatbot", label: "AI Bot" },
    { id: "customers", label: "Customers" }, { id: "event-users", label: "Event Users" },
    { id: "artists", label: "Artists" }, { id: "reviews", label: "Reviews" },
    { id: "pricing", label: "Pricing" }, { id: "intl-pricing", label: "Intl Pricing" },
    { id: "locations", label: "Locations" }, { id: "voice", label: "Voice" },
    { id: "notify", label: "Notifications" }, { id: "push-center", label: "Push Center" }, { id: "sessions", label: "Sessions" },
    { id: "enquiries", label: "Enquiries" }, { id: "support", label: "Support" },
    { id: "blog", label: "Blog" }, { id: "seo", label: "SEO" },
    { id: "files", label: "Files" },
    { id: "integrations", label: "Integrations" },
    { id: "settings", label: "Settings" },
  ];
  const [adminPermAllTabs, setAdminPermAllTabs] = useState(true);
  const [adminPermissions, setAdminPermissions] = useState<Record<string, string>>(
    Object.fromEntries(ADMIN_TABS.map(t => [t.id, "full"]))
  );

  // Log admin session on mount with IP, location, device
  const logAdminSession = async (userId: string) => {
    const enteredName = sessionStorage.getItem("admin_entered_name") || "Admin";
    const deviceInfo = (() => {
      const ua = navigator.userAgent;
      const isMobile = /Mobile|Android|iPhone/i.test(ua);
      const browser = /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : /Edge/.test(ua) ? "Edge" : "Other";
      const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "Unknown";
      return `${browser} on ${os} (${isMobile ? "Mobile" : "Desktop"})`;
    })();
    try {
      let ipAddress = null;
      let locationInfo = null;
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const geo = await res.json();
          ipAddress = geo.ip || null;
          locationInfo = [geo.city, geo.region, geo.country_name].filter(Boolean).join(", ") || null;
        }
      } catch {}

      const { data: sessionData } = await supabase.from("admin_sessions").insert({
        user_id: userId,
        admin_name: enteredName,
        device_info: deviceInfo,
        ip_address: ipAddress,
        location_info: locationInfo,
        is_active: true,
        entered_name: enteredName,
        steps_log: [{ action: "Session started", time: new Date().toISOString() }],
      } as any).select("id").single();
      if (sessionData) setCurrentSessionId((sessionData as any).id);

      // Update login tracking
      const { data: tracking } = await supabase.from("admin_login_tracking" as any).select("*").eq("user_id", userId).maybeSingle();
      if (tracking) {
        await supabase.from("admin_login_tracking" as any).update({ total_logins: (tracking as any).total_logins + 1, updated_at: new Date().toISOString() } as any).eq("user_id", userId);
      } else {
        await supabase.from("admin_login_tracking" as any).insert({ user_id: userId, total_logins: 1 } as any);
      }
    } catch {}
  };

  const { actionState, confirmAction, executeAction, cancelAction } = useAdminAction();

  const logAdminAction = async (action: string, details?: string) => {
    if (!user) return;
    const enteredName = sessionStorage.getItem("admin_entered_name") || adminProfile?.full_name || "Admin";
    try {
      await supabase.from("admin_action_log").insert({
        user_id: user.id,
        admin_name: enteredName,
        action,
        details: details || null,
        session_id: currentSessionId,
      } as any);
      // Also append to session steps_log
      if (currentSessionId) {
        const { data: sess } = await supabase.from("admin_sessions").select("steps_log").eq("id", currentSessionId).single();
        if (sess) {
          const steps = Array.isArray((sess as any).steps_log) ? (sess as any).steps_log : [];
          steps.push({ action, details, time: new Date().toISOString() });
          await supabase.from("admin_sessions").update({ steps_log: steps } as any).eq("id", currentSessionId);
        }
      }
    } catch {}
  };

  useEffect(() => {
    document.title = "CCC Admin Panel";
  }, []);

  // Safety timeout: if loading takes too long, force it off
  useEffect(() => {
    const timeout = setTimeout(() => { if (loading) setLoading(false); }, 8000);
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/customcad75", { replace: true }); return; }

    let cancelled = false;

    const init = async () => {
      // Verify admin role first before loading data
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (cancelled) return;
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/customcad75", { replace: true });
        return;
      }
      // User is confirmed admin, load everything
      fetchOrders();
      fetchCaricatureTypes();
      fetchCustomers();
      fetchAdminProfile();
      fetchArtistProfiles();
      logAdminSession(user.id);
    };

    init();

    // Real-time subscriptions
    const ch = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders(prev => [payload.new as any, ...prev]);
        toast({ title: "🎨 New Order!", description: (payload.new as any).customer_name });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...(payload.new as any) } : o));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCustomers())
      .on("postgres_changes", { event: "*", schema: "public", table: "caricature_types" }, () => fetchCaricatureTypes())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => {
        toast({ title: "📅 Event booking updated" });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enquiries" }, (payload) => {
        toast({ title: "📝 New Enquiry", description: (payload.new as any).name });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, authLoading]);

  const fetchArtistProfiles = async () => {
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    if (data) setArtistProfiles(data as any);
  };

  const fetchAdminProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) { setAdminProfile(data as any); setAdminEditData(data as any); }
  };

  const saveAdminProfile = async () => {
    if (!user) return;
    await (supabase.from("profiles").update({
      full_name: adminEditData.full_name, mobile: adminEditData.mobile,
      email: (adminEditData as any).email, age: (adminEditData as any).age,
      instagram_id: adminEditData.instagram_id, address: adminEditData.address,
      city: adminEditData.city, state: adminEditData.state, pincode: adminEditData.pincode,
    } as any).eq("user_id", user.id));
    toast({ title: "Profile Updated" });
    setEditingAdminProfile(false);
    fetchAdminProfile();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { console.error("Avatar upload error:", upErr); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    if (urlData?.publicUrl) {
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl } as any).eq("user_id", user.id);
      toast({ title: "Profile photo updated! 📸" });
      fetchAdminProfile();
    }
  };

  const changeAdminPassword = async () => {
    if (adminNewPassword !== adminConfirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (adminNewPassword.length < 6) { toast({ title: "Min 6 characters", variant: "destructive" }); return; }
    setChangingAdminPassword(true);
    const adminEmail = user?.email || adminProfile?.email || "";
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminCurrentPassword });
    if (signInErr) { toast({ title: "Current password is incorrect", variant: "destructive" }); setChangingAdminPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: adminNewPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password Changed!" }); setAdminCurrentPassword(""); setAdminNewPassword(""); setAdminConfirmPassword(""); }
    setChangingAdminPassword(false);
  };

  const addNewAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName || !newAdminMobile) return;
    setAddingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newAdminEmail, password: newAdminPassword, full_name: newAdminName, mobile: newAdminMobile, make_admin: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save permissions for the new admin
      if (!adminPermAllTabs && data?.user_id) {
        const permRows = Object.entries(adminPermissions)
          .filter(([_, level]) => level !== "none")
          .map(([tab_id, access_level]) => ({
            user_id: data.user_id,
            tab_id,
            access_level,
          }));
        if (permRows.length > 0) {
          await supabase.from("admin_permissions").insert(permRows as any);
        }
      }

      toast({ title: "New Admin Added!", description: `${newAdminName} can now login as admin` });
      setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminName(""); setNewAdminMobile("");
      setAdminPermAllTabs(true);
      setAdminPermissions(Object.fromEntries(ADMIN_TABS.map(t => [t.id, "full"])));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingAdmin(false);
    }
  };

  // checkAdmin is now handled inline in the useEffect above

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders")
      .select("id, caricature_type, order_type, customer_name, customer_mobile, customer_email, city, amount, negotiated_amount, is_framed, status, payment_status, priority, created_at, expected_delivery_date, art_confirmation_status, ask_user_delivered")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
    setLoading(false);
  };

  const fetchCaricatureTypes = async () => {
    const { data } = await supabase.from("caricature_types").select("*").order("sort_order");
    if (data) setCaricatureTypes(data as any);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, user_id, full_name, mobile, email, instagram_id, address, city, state, pincode, secret_code, created_at, is_manual, event_booking_allowed, gateway_charges_enabled, secret_code_login_enabled, display_id");
    if (error) {
      console.error("Error fetching customers:", error);
    }
    if (data) {
      // Fetch admin and artist user IDs to exclude from customer list
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const adminUserIds = new Set((roles || []).filter(r => r.role === "admin" || r.role === "shop_admin").map(r => r.user_id));
      const { data: artists } = await supabase.from("artists").select("auth_user_id");
      const artistUserIds = new Set((artists || []).filter((a: any) => a.auth_user_id).map((a: any) => a.auth_user_id));
      
      const filtered = data.filter((c: any) => !adminUserIds.has(c.user_id) && !artistUserIds.has(c.user_id));
      setCustomers(filtered as any);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    if (status === "artwork_ready") {
      const { data: artPhotos } = await supabase.from("artwork_ready_photos").select("id").eq("order_id", orderId) as any;
      const { data: bypassSetting } = await supabase.from("admin_site_settings").select("value").eq("id", "allow_artwork_status_without_upload").maybeSingle();
      const bypassEnabled = (bypassSetting?.value as any)?.enabled === true;
      if ((!artPhotos || artPhotos.length === 0) && !bypassEnabled) {
        toast({ title: "Upload artwork first", description: "Please upload artwork photos before changing status to Art Ready.", variant: "destructive" });
        return;
      }
    }
    confirmAction(
      "Order Status Change",
      `Order ${orderId.slice(0, 8)} → ${STATUS_LABELS[status]}`,
      async (adminName) => {
        const reverseStatuses = ["new", "in_progress"];
        if (reverseStatuses.includes(status)) {
          await supabase.from("orders").update({ status: status as any, art_confirmation_status: null } as any).eq("id", orderId);
        } else {
          await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
        }
        toast({ title: `Status Updated by ${adminName}` });
        fetchOrders();
      }
    );
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    confirmAction(
      "Payment Status Change",
      `Order ${orderId.slice(0, 8)} → ${PAYMENT_STATUS_LABELS[paymentStatus]}`,
      async (adminName) => {
        await supabase.from("orders").update({ payment_status: paymentStatus, payment_verified: paymentStatus === "confirmed" } as any).eq("id", orderId);
        toast({ title: `Payment Updated by ${adminName}` });
        fetchOrders();
      }
    );
  };

  const deleteOrder = async (orderId: string) => {
    confirmAction(
      "Delete Order",
      `Order ${orderId.slice(0, 8)} will be permanently deleted`,
      async (adminName) => {
        await supabase.from("orders").delete().eq("id", orderId);
        toast({ title: `Order deleted by ${adminName}` });
        fetchOrders();
      }
    );
  };

  const saveNegotiatedAmount = async () => {
    if (!negotiateOrderId || !negotiatedAmount) return;
    await supabase.from("orders").update({ negotiated_amount: parseInt(negotiatedAmount), amount: parseInt(negotiatedAmount) } as any).eq("id", negotiateOrderId);
    toast({ title: "Price Updated" });
    setNegotiateOrderId(null);
    setNegotiatedAmount("");
    fetchOrders();
  };

  const saveTypeEdit = async (id: string) => {
    await supabase.from("caricature_types").update(editTypeData as any).eq("id", id);
    toast({ title: "Pricing Updated — changes are live on the website!" });
    setEditingType(null);
    fetchCaricatureTypes();
  };

  const addNewType = async () => {
    if (!newType.name || !newType.slug) return;
    await supabase.from("caricature_types").insert({ ...newType, sort_order: caricatureTypes.length + 1 } as any);
    toast({ title: "Caricature Type Added" });
    setShowAddType(false);
    setNewType({ name: "", slug: "", price: 0, per_face: false, min_faces: 1, max_faces: 1 });
    fetchCaricatureTypes();
  };

  const deleteType = async (id: string) => {
    await supabase.from("caricature_types").delete().eq("id", id);
    toast({ title: "Type Deleted" });
    fetchCaricatureTypes();
  };

  const addCustomerManual = async () => {
    if (!newCustomer.full_name || !newCustomer.email || !newCustomer.mobile || !newCustomer.password) return;
    setAddingCustomer(true);
    try {
      // Use edge function to create user without affecting admin session
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newCustomer.email,
          password: newCustomer.password,
          full_name: newCustomer.full_name,
          mobile: newCustomer.mobile,
          instagram_id: newCustomer.instagram_id || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          state: newCustomer.state || null,
          pincode: newCustomer.pincode || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Customer Added Successfully" });
      setShowAddCustomer(false);
      setNewCustomer({ full_name: "", mobile: "", email: "", instagram_id: "", address: "", city: "", state: "", pincode: "", password: "" });
      fetchCustomers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingCustomer(false);
    }
  };

  const deleteCustomer = async (userId: string) => {
    // Fetch profile & orders BEFORE deleting for reversal logging
    const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    const { data: ordersData } = await supabase.from("orders").select("*").eq("user_id", userId);

    // Log to reversal system
    const { logReversalAction } = await import("@/hooks/useReversalLog");
    const adminName = sessionStorage.getItem("admin_entered_name") || sessionStorage.getItem("admin_action_name") || "Admin";
    
    if (profileData) {
      await logReversalAction({
        entityType: "customer",
        entityId: userId,
        actionType: "delete",
        sourcePanel: "main_admin",
        performedBy: adminName,
        role: "admin",
        previousData: profileData,
        newData: null,
        fullSnapshot: { profile: profileData, orders: ordersData || [] },
      });
    }

    await supabase.from("orders").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast({ title: "Customer & their orders deleted" });
    fetchCustomers();
    fetchOrders();
  };

  const saveCustomerEdit = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({
      full_name: editCustomerData.full_name,
      mobile: editCustomerData.mobile,
      instagram_id: editCustomerData.instagram_id,
      address: editCustomerData.address,
      city: editCustomerData.city,
      state: editCustomerData.state,
      pincode: editCustomerData.pincode,
    } as any).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Customer Updated" });
      setEditingCustomer(null);
      fetchCustomers();
    }
  };

  const handleLogout = async () => {
    // Mark session as inactive and clear name
    if (currentSessionId) {
      const { data: sess } = await supabase.from("admin_sessions").select("steps_log").eq("id", currentSessionId).single();
      if (sess) {
        const steps = Array.isArray((sess as any).steps_log) ? (sess as any).steps_log : [];
        steps.push({ action: "Logged out", time: new Date().toISOString() });
        await supabase.from("admin_sessions").update({ is_active: false, steps_log: steps } as any).eq("id", currentSessionId);
      }
    }
    sessionStorage.removeItem("admin_entered_name");
    localStorage.removeItem("workshop_admin");
    await supabase.auth.signOut();
    navigate("/customcad75");
  };

  const handleAdminRefresh = async () => {
    toast({ title: "Refreshing..." });
    await Promise.all([fetchOrders(), fetchCaricatureTypes(), fetchCustomers(), fetchAdminProfile()]);
    toast({ title: "Refreshed!" });
  };

  const addManualOrder = async () => {
    if (!manualOrder.customerId || !manualOrder.amount) return;
    setAddingOrder(true);
    try {
      const customer = customers.find(c => c.user_id === manualOrder.customerId);
      if (!customer) throw new Error("Customer not found");

      const finalAmount = manualOrder.negotiated ? manualOrder.negotiatedAmount : manualOrder.amount;

      // Auto-assign to artist Ritesh
      const RITESH_ARTIST_ID = "0f579821-ed74-4bb2-9e19-e3785abf9083";

      const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
        user_id: customer.user_id,
        customer_name: customer.full_name,
        customer_email: customer.email,
        customer_mobile: customer.mobile,
        order_type: manualOrder.orderType as any,
        caricature_type: "physical" as any,
        style: manualOrder.style as any,
        face_count: manualOrder.faceCount,
        amount: finalAmount,
        negotiated_amount: manualOrder.negotiated ? manualOrder.negotiatedAmount : null,
        notes: manualOrder.notes || null,
        district: manualOrder.deliveryDistrict || null,
        delivery_address: manualOrder.deliveryAddress || customer.address || null,
        delivery_city: manualOrder.deliveryCity || customer.city || null,
        delivery_state: manualOrder.deliveryState || customer.state || null,
        delivery_pincode: manualOrder.deliveryPincode || customer.pincode || null,
        assigned_artist_id: RITESH_ARTIST_ID,
        status: "new" as any,
        payment_status: "pending",
      } as any).select("id").single();

      if (orderErr || !orderData) throw new Error(orderErr?.message || "Failed to create order");

      // Upload photos
      const allFiles = [...manualPhotos, ...(paymentScreenshot ? [paymentScreenshot] : [])];
      for (const file of allFiles) {
        const path = `${orderData.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
        if (!upErr) {
          await supabase.from("order_images").insert({ order_id: orderData.id, storage_path: path, file_name: file.name } as any);
        }
      }

      toast({ title: "Manual Order Created!", description: `Order for ${customer.full_name} added successfully` });
      setShowAddOrder(false);
      setManualOrder({ customerId: "", orderType: "single", style: "artists_choice", faceCount: 1, amount: 0, notes: "", negotiated: false, negotiatedAmount: 0, deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryPincode: "", deliveryDistrict: "" });
      setManualPhotos([]);
      setPaymentScreenshot(null);
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingOrder(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const filtered = orders.filter((o) => {
    if (statusFilter === "confirmed_art") return (o as any).art_confirmation_status === "confirmed";
    if (statusFilter === "raised_query") return (o as any).art_confirmation_status === "chat";
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentFilter !== "all" && (o.payment_status || "pending") !== paymentFilter) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (calendarDate) {
      const orderDate = new Date(o.created_at);
      if (orderDate.toDateString() !== calendarDate.toDateString()) return false;
    }
    return true;
  });

  const getFilteredCustomers = () => {
    let list = customers.filter((c) => {
      if (!customerSearch) return true;
      const q = customerSearch.toLowerCase();
      return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.mobile.includes(q);
    });
    if (customerTab === "registered") {
      list = list.filter(c => !(c as any).is_manual);
    } else if (customerTab === "manual") {
      list = list.filter(c => (c as any).is_manual);
    }
    return list;
  };

  const filteredCustomers = getFilteredCustomers();

  const getDaysRemaining = (order: Order) => {
    const due = order.expected_delivery_date
      ? new Date(order.expected_delivery_date)
      : new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (selectedOrder) {
    return <OrderDetail orderId={selectedOrder} onBack={() => { setSelectedOrder(null); fetchOrders(); }} />;
  }

  // Admin Name Gate — mandatory name entry before accessing panel
  if (!adminEnteredName) {
    return <AdminNameGate onNameSubmit={(name) => {
      setAdminEnteredName(name);
      logAdminAction("Admin panel accessed", `Entered as: ${name}`);
    }} />;
  }



  return (
    <div className="min-h-screen flex w-full">
      <AdminActionConfirm
        open={actionState.pending}
        action={actionState.action}
        details={actionState.details}
        onConfirm={executeAction}
        onCancel={cancelAction}
      />
      {/* Desktop Sidebar */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      <AdminQuickActions onAction={(action) => {
        if (action === "add-order") { setActiveTab("orders"); setShowAddOrder(true); }
        else if (action === "add-event") setActiveTab("events");
        else if (action === "add-enquiry") setActiveTab("enquiries");
        else if (action === "send-notification") setActiveTab("notify");
      }} />
      {/* Chat button moved to header */}

      {/* Main Content */}
      <div className="flex-1 min-h-screen admin-content-premium pb-20 md:pb-0 overflow-x-hidden admin-panel-font">
        <AdminOfflineBanner />
        <AdminLocationPrompt />
        <header className="sticky top-0 z-40 admin-header-glass" style={{ transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <div className="px-4 md:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 md:hidden">
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md ring-2 ring-primary/10 cursor-pointer" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover rounded-full" />
              </div>
              <AdminWorkspaceSwitcher />
            </div>
            <div className="hidden md:flex items-center gap-3 flex-1">
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-sans">Live</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <LiveGreeting name={adminProfile?.full_name} />
              <div className="ml-auto flex-1 max-w-md">
                <AdminSmartSearch
                  panelType="main"
                  tabs={[
                    { id: "orders", label: "Orders" }, { id: "events", label: "Events" },
                    { id: "payments", label: "Payments" }, { id: "customers", label: "Customers" },
                    { id: "artists", label: "Artists" }, { id: "enquiries", label: "Enquiries" },
                    { id: "blog", label: "Blog" }, { id: "reviews", label: "Reviews" },
                    { id: "ai-conversations", label: "AI Chats" }, { id: "hp-reviews", label: "HP Reviews" },
                  ]}
                  onNavigate={(tab, highlightId) => {
                    setActiveTab(tab);
                    if (highlightId) {
                      setTimeout(() => {
                        const el = document.querySelector(`[data-search-id="${highlightId}"]`);
                        if (el) { el.classList.add("search-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.classList.remove("search-highlight"), 4000); }
                      }, 300);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AdminFloatingChatButton onClick={() => setActiveTab("live-chat")} />
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleAdminRefresh} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"><RefreshCw className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground font-sans rounded-xl">
                <LogOut className="w-3 h-3" /> Sign Out
              </Button>
              {/* Admin Profile Avatar */}
              <div 
                className="hidden md:flex w-9 h-9 rounded-xl cursor-pointer overflow-hidden ring-2 ring-primary/20 shadow-md items-center justify-center flex-shrink-0"
                onClick={() => setActiveTab("settings")}
                title={adminProfile?.full_name || "Admin Profile"}
                style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`, color: "hsl(var(--primary-foreground))", fontWeight: 700, fontSize: 14 }}
              >
                {(adminProfile as any)?.avatar_url ? (
                  <img src={`${(adminProfile as any).avatar_url}?t=${Date.now()}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (adminProfile?.full_name || "A").charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>
        <Suspense fallback={null}><AdminLiveActivityTicker /></Suspense>

        <div className="px-4 md:px-6 py-5">
          <div className="md:hidden mb-4">
            <LiveGreeting name={adminProfile?.full_name} />
          </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* Page transition wrapper */}
          <Suspense fallback={<AdminTabLoader />}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6, scale: 0.998, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <AdminDashboardPremium onNavigate={setActiveTab} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-sans" />
                </div>
                <ExportButton
                  data={filtered.map(o => ({
                    "Order ID": o.id.slice(0, 8).toUpperCase(),
                    "Customer": o.customer_name,
                    "Email": o.customer_email,
                    "Mobile": o.customer_mobile,
                    "Type": o.caricature_type,
                    "Order Type": o.order_type,
                    "Amount": o.negotiated_amount || o.amount,
                    "Status": STATUS_LABELS[o.status] || o.status,
                    "Payment": PAYMENT_STATUS_LABELS[o.payment_status || "pending"],
                    "City": o.city || "",
                    "Created": new Date(o.created_at).toLocaleString("en-IN"),
                    "Delivery Date": o.expected_delivery_date || "",
                  }))}
                  sheetName="Orders"
                  fileName="CCC_Orders"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Order</Button>
                  </DialogTrigger>
                   <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg z-50" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader><DialogTitle className="font-display">Add Manual Order</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Select Customer *</Label>
                        <Select value={manualOrder.customerId} onValueChange={(v) => setManualOrder({ ...manualOrder, customerId: v })}>
                          <SelectTrigger><SelectValue placeholder="Choose customer..." /></SelectTrigger>
                          <SelectContent className="z-[200]">
                            {customers.map((c) => (
                              <SelectItem key={c.user_id} value={c.user_id}>{c.full_name} ({c.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Order Type *</Label>
                          <Select value={manualOrder.orderType} onValueChange={(v) => setManualOrder({ ...manualOrder, orderType: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="couple">Couple</SelectItem>
                              <SelectItem value="group">Group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Style</Label>
                          <Select value={manualOrder.style} onValueChange={(v) => setManualOrder({ ...manualOrder, style: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="cute">Cute</SelectItem>
                              <SelectItem value="romantic">Romantic</SelectItem>
                              <SelectItem value="fun">Fun</SelectItem>
                              <SelectItem value="royal">Royal</SelectItem>
                              <SelectItem value="minimal">Minimal</SelectItem>
                              <SelectItem value="artists_choice">Artist's Choice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Face Count</Label><Input type="number" min={1} value={manualOrder.faceCount} onChange={(e) => setManualOrder({ ...manualOrder, faceCount: parseInt(e.target.value) || 1 })} /></div>
                        <div><Label>Amount (₹) *</Label><Input type="number" value={manualOrder.amount} onChange={(e) => setManualOrder({ ...manualOrder, amount: parseInt(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={manualOrder.negotiated} onChange={(e) => setManualOrder({ ...manualOrder, negotiated: e.target.checked })} />
                        <Label>Negotiated Price</Label>
                      </div>
                      {manualOrder.negotiated && (
                        <div><Label>Negotiated Amount (₹)</Label><Input type="number" value={manualOrder.negotiatedAmount} onChange={(e) => setManualOrder({ ...manualOrder, negotiatedAmount: parseInt(e.target.value) || 0 })} /></div>
                      )}
                      <div><Label>Notes</Label><Textarea value={manualOrder.notes} onChange={(e) => setManualOrder({ ...manualOrder, notes: e.target.value })} placeholder="Special instructions..." /></div>
                      <div>
                        <Label>Delivery Address</Label>
                        <Input value={manualOrder.deliveryAddress} onChange={(e) => setManualOrder({ ...manualOrder, deliveryAddress: e.target.value })} placeholder="House no, Street, Area" />
                      </div>
                      <div>
                        <Label className="mb-1 block">State / District / City</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={manualOrder.deliveryState} onValueChange={(v) => setManualOrder({ ...manualOrder, deliveryState: v, deliveryDistrict: "", deliveryCity: "" })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                            <SelectContent className="max-h-60 z-[200]">
                              {getStates().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={manualOrder.deliveryDistrict} onValueChange={(v) => setManualOrder({ ...manualOrder, deliveryDistrict: v, deliveryCity: "" })} disabled={!manualOrder.deliveryState}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="District" /></SelectTrigger>
                            <SelectContent className="max-h-60 z-[200]">
                              {manualOrder.deliveryState && getDistricts(manualOrder.deliveryState).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                              <SelectItem value="__other__">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {manualOrder.deliveryDistrict === "__other__" ? (
                            <Input className="h-8 text-xs" placeholder="City" value={manualOrder.deliveryCity} onChange={(e) => setManualOrder({ ...manualOrder, deliveryCity: e.target.value })} />
                          ) : (
                            <Select value={manualOrder.deliveryCity} onValueChange={(v) => setManualOrder({ ...manualOrder, deliveryCity: v })} disabled={!manualOrder.deliveryDistrict}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="City" /></SelectTrigger>
                              <SelectContent className="max-h-60 z-[200]">
                                {manualOrder.deliveryDistrict && manualOrder.deliveryState && getCities(manualOrder.deliveryState, manualOrder.deliveryDistrict).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                <SelectItem value="__other__">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <Input value={manualOrder.deliveryPincode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setManualOrder({ ...manualOrder, deliveryPincode: d }); }} maxLength={6} placeholder="400001" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Image className="w-4 h-4" />Upload Photos</Label>
                        <Input type="file" multiple accept="image/*" onChange={(e) => setManualPhotos(Array.from(e.target.files || []))} />
                        {manualPhotos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{manualPhotos.length} photo(s) selected</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Upload className="w-4 h-4" />Payment Screenshot (optional)</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)} />
                        {paymentScreenshot && <p className="text-xs text-muted-foreground mt-1">{paymentScreenshot.name}</p>}
                      </div>
                      <Button onClick={addManualOrder} disabled={!manualOrder.customerId || !manualOrder.amount || addingOrder} className="w-full font-sans">
                        {addingOrder ? "Creating Order..." : "Create Order"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: `All (${orders.length})` },
                  { value: "new", label: `New (${orders.filter(o => o.status === "new").length})` },
                  { value: "in_progress", label: `In Progress (${orders.filter(o => o.status === "in_progress").length})` },
                  { value: "artwork_ready", label: `Art Ready (${orders.filter(o => o.status === "artwork_ready").length})` },
                  { value: "dispatched", label: `Dispatched (${orders.filter(o => o.status === "dispatched").length})` },
                  { value: "delivered", label: `Delivered (${orders.filter(o => o.status === "delivered").length})` },
                  { value: "confirmed_art", label: `✅ Confirmed (${orders.filter(o => (o as any).art_confirmation_status === "confirmed").length})` },
                  { value: "raised_query", label: `💬 Raised Query (${orders.filter(o => (o as any).art_confirmation_status === "chat").length})` },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={statusFilter === tab.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-sans h-7 rounded-full"
                    onClick={() => setStatusFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {/* Payment Filter */}
              <div className="flex gap-1.5">
                {[
                  { value: "all", label: "All Payments" },
                  { value: "confirmed", label: `Confirmed (${orders.filter(o => o.payment_status === "confirmed").length})` },
                  { value: "pending", label: `Pending (${orders.filter(o => o.payment_status !== "confirmed").length})` },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={paymentFilter === tab.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-sans h-7 rounded-full"
                    onClick={() => setPaymentFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {/* Calendar Date Filter */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs font-sans h-7 rounded-full">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {calendarDate ? calendarDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Pick Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} initialFocus />
                  </PopoverContent>
                </Popover>
                {calendarDate && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCalendarDate(undefined)}>
                    <X className="w-3 h-3 mr-1" />Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {loading ? <p className="text-center text-muted-foreground font-sans py-10">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground font-sans py-10">No orders</p> : (
                filtered.map((order) => {
                  const daysLeft = getDaysRemaining(order);
                  return (
                    <Card key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "border-destructive/50" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-sans font-semibold">{order.customer_name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] text-muted-foreground font-sans">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-sans font-medium text-primary">{formatPrice(order.negotiated_amount || order.amount)}</p>
                            {order.negotiated_amount && order.negotiated_amount !== order.amount && (
                              <p className="text-xs text-muted-foreground line-through">{formatPrice(order.amount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status]}</Badge>
                          <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>Pay: {PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}</Badge>
                          {daysLeft <= 10 && !["delivered", "completed"].includes(order.status) && (
                            <Badge className="bg-primary/20 text-foreground border-none text-xs"><AlertTriangle className="w-3 h-3 mr-1" />{daysLeft}d left</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <ArtworkUploadFlow orderId={order.id} orderStatus={order.status} artConfirmationStatus={(order as any).art_confirmation_status} onStatusChange={fetchOrders} />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-sans text-muted-foreground">Ask User Delivered:</span>
                            <Switch
                              checked={(order as any).ask_user_delivered || false}
                              onCheckedChange={async (checked) => {
                                await supabase.from("orders").update({ ask_user_delivered: checked } as any).eq("id", order.id);
                                toast({ title: checked ? "User will be asked to mark delivered" : "Delivery prompt disabled" });
                                fetchOrders();
                              }}
                            />
                          </div>
                          {(order as any).art_confirmation_status && (
                            <Badge className={`border-none text-[10px] ${
                              (order as any).art_confirmation_status === "confirmed" ? "bg-primary/30 text-foreground" :
                              (order as any).art_confirmation_status === "chat" ? "bg-primary/15 text-foreground" :
                              "bg-primary/10 text-foreground"
                            }`}>
                              {(order as any).art_confirmation_status === "confirmed" ? "✅ Confirmed" :
                               (order as any).art_confirmation_status === "chat" ? "💬 Chat" : "⏳ Pending"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedOrder(order.id)}><Eye className="w-4 h-4 mr-1" />View</Button>
                          <Button variant="outline" size="sm" onClick={() => { setNegotiateOrderId(order.id); setNegotiatedAmount(String(order.negotiated_amount || order.amount)); }}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                <AlertDialogDescription>Permanently delete this order.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans">ID</TableHead>
                      <TableHead className="font-sans">Customer</TableHead>
                      <TableHead className="font-sans">Date</TableHead>
                      <TableHead className="font-sans">Amount</TableHead>
                      <TableHead className="font-sans">Due</TableHead>
                      <TableHead className="font-sans">Payment</TableHead>
                      <TableHead className="font-sans">Status</TableHead>
                      <TableHead className="font-sans">Art Upload</TableHead>
                      <TableHead className="font-sans">User Status</TableHead>
                      <TableHead className="font-sans">Ask Delivered</TableHead>
                      <TableHead className="font-sans">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-10">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-10">No orders</TableCell></TableRow>
                    ) : (
                      filtered.map((order) => {
                        const daysLeft = getDaysRemaining(order);
                        return (
                          <TableRow key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "bg-red-50/50" : ""}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="font-sans">{order.customer_name}</TableCell>
                            <TableCell className="font-sans text-xs">{formatDateTime(order.created_at)}</TableCell>
                            <TableCell className="font-sans">
                              <span className="font-medium">{formatPrice(order.negotiated_amount || order.amount)}</span>
                              {order.negotiated_amount && order.negotiated_amount !== order.amount && (
                                <span className="text-xs text-muted-foreground line-through ml-1">{formatPrice(order.amount)}</span>
                              )}
                            </TableCell>
                            <TableCell>{daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? (
                              <span className="text-destructive font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{daysLeft}d</span>
                            ) : <span>{daysLeft}d</span>}</TableCell>
                            <TableCell>
                              <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                                <SelectTrigger className="h-8 w-28">
                                  <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>{PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}</Badge>
                                </SelectTrigger>
                                <SelectContent>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                                <SelectTrigger className="h-8 w-36">
                                  <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status]}</Badge>
                                </SelectTrigger>
                                <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <ArtworkUploadFlow orderId={order.id} orderStatus={order.status} artConfirmationStatus={(order as any).art_confirmation_status} onStatusChange={fetchOrders} />
                            </TableCell>
                            <TableCell>
                              {(order as any).art_confirmation_status === "confirmed" ? (
                                <Badge className="bg-green-100 text-green-800 border-none text-[10px]">✅ Confirmed</Badge>
                              ) : (order as any).art_confirmation_status === "chat" ? (
                                <Badge className="bg-yellow-100 text-yellow-800 border-none text-[10px]">💬 Chat</Badge>
                              ) : (order as any).art_confirmation_status === "pending" ? (
                                <Badge className="bg-orange-100 text-orange-800 border-none text-[10px]">⏳ Pending</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={(order as any).ask_user_delivered || false}
                                onCheckedChange={async (checked) => {
                                  await supabase.from("orders").update({ ask_user_delivered: checked } as any).eq("id", order.id);
                                  toast({ title: checked ? "User will be asked to mark delivered" : "Delivery prompt disabled" });
                                  fetchOrders();
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}><Eye className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => { setNegotiateOrderId(order.id); setNegotiatedAmount(String(order.negotiated_amount || order.amount)); }}>
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Order?</AlertDialogTitle><AlertDialogDescription>Permanently delete this order.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <AdminEvents customers={customers as any} />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <AdminPayments />
          </TabsContent>

          {/* Event Users Tab */}
          <TabsContent value="event-users">
            <EventUsersTab />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display text-xl font-bold">Caricature Types & Pricing</h2>
                <p className="text-xs text-muted-foreground font-sans">Changes here update pricing across the entire website in real-time</p>
              </div>
              <Dialog open={showAddType} onOpenChange={setShowAddType}>
                <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Type</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Add Caricature Type</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} placeholder="e.g. Family" /></div>
                    <div><Label>Slug (must match order_type: single/couple/group)</Label><Input value={newType.slug} onChange={(e) => setNewType({ ...newType, slug: e.target.value.toLowerCase().replace(/\s/g, "_") })} placeholder="e.g. family" /></div>
                    <div><Label>Price (₹)</Label><Input type="number" value={newType.price} onChange={(e) => setNewType({ ...newType, price: parseInt(e.target.value) || 0 })} /></div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newType.per_face} onChange={(e) => setNewType({ ...newType, per_face: e.target.checked })} />
                      <Label>Per Face Pricing</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Min Faces</Label><Input type="number" value={newType.min_faces} onChange={(e) => setNewType({ ...newType, min_faces: parseInt(e.target.value) || 1 })} /></div>
                      <div><Label>Max Faces</Label><Input type="number" value={newType.max_faces} onChange={(e) => setNewType({ ...newType, max_faces: parseInt(e.target.value) || 1 })} /></div>
                    </div>
                    <Button onClick={addNewType} className="w-full font-sans">Add Type</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {caricatureTypes.map((type) => (
                <Card key={type.id}>
                  <CardContent className="p-4">
                    {editingType === type.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Name</Label><Input value={editTypeData.name || ""} onChange={(e) => setEditTypeData({ ...editTypeData, name: e.target.value })} /></div>
                          <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={editTypeData.price || 0} onChange={(e) => setEditTypeData({ ...editTypeData, price: parseInt(e.target.value) || 0 })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Min Faces</Label><Input type="number" value={editTypeData.min_faces || 1} onChange={(e) => setEditTypeData({ ...editTypeData, min_faces: parseInt(e.target.value) || 1 })} /></div>
                          <div><Label className="text-xs">Max Faces</Label><Input type="number" value={editTypeData.max_faces || 1} onChange={(e) => setEditTypeData({ ...editTypeData, max_faces: parseInt(e.target.value) || 1 })} /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={editTypeData.per_face || false} onChange={(e) => setEditTypeData({ ...editTypeData, per_face: e.target.checked })} />
                          <Label className="text-xs">Per Face Pricing</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveTypeEdit(type.id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingType(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-sans font-semibold">{type.name}</p>
                          <p className="text-sm text-muted-foreground font-sans">
                            {formatPrice(type.price)}{type.per_face ? "/face" : ""} · {type.min_faces}–{type.max_faces} faces
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingType(type.id); setEditTypeData(type); }}><Edit2 className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Type?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteType(type.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
              <h2 className="font-display text-xl font-bold">Customers ({customers.length})</h2>
              <div className="flex gap-2 w-full md:w-auto items-center">
                <ExportButton
                  data={filteredCustomers.map(c => ({
                    "Name": c.full_name,
                    "Email": c.email,
                    "Mobile": c.mobile,
                    "Instagram": c.instagram_id || "",
                    "Address": c.address || "",
                    "City": c.city || "",
                    "State": c.state || "",
                    "Pincode": c.pincode || "",
                    "Registered": new Date(c.created_at).toLocaleString("en-IN"),
                  }))}
                  sheetName="Customers"
                  fileName="CCC_Customers"
                />
                <div className="relative flex-1 md:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="pl-10 font-sans" />
                </div>
                <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                  <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-display">Add Customer Manually</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Full Name *</Label><Input value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} /></div>
                      <div>
                        <Label>Email *</Label>
                        <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                        {newCustomer.email && validateEmailFormat(newCustomer.email) && (
                          <p className="text-xs text-destructive font-sans mt-1">{validateEmailFormat(newCustomer.email)}</p>
                        )}
                      </div>
                      <div><Label>Mobile * (10 digits)</Label><Input value={newCustomer.mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewCustomer({ ...newCustomer, mobile: d }); }} maxLength={10} /></div>
                      <div><Label>Password *</Label><Input type="password" value={newCustomer.password} onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })} /></div>
                      <div><Label>Instagram</Label><Input value={newCustomer.instagram_id} onChange={(e) => setNewCustomer({ ...newCustomer, instagram_id: e.target.value })} /></div>
                      <div><Label>Address</Label><Input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>City</Label><Input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} /></div>
                        <div><Label>State</Label><Input value={newCustomer.state} onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })} /></div>
                      </div>
                      <div><Label>Pincode</Label><Input value={newCustomer.pincode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setNewCustomer({ ...newCustomer, pincode: d }); }} maxLength={6} /></div>
                      <Button onClick={addCustomerManual} disabled={!newCustomer.full_name || !newCustomer.email || !newCustomer.mobile || !newCustomer.password || addingCustomer || !!validateEmailFormat(newCustomer.email)} className="w-full font-sans">
                        {addingCustomer ? "Creating..." : "Add Customer"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[
                { value: "all" as const, label: `All (${customers.length})` },
                { value: "registered" as const, label: "Registered" },
                { value: "manual" as const, label: "Manual" },
              ].map((tab) => (
                <Button
                  key={tab.value}
                  variant={customerTab === tab.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs font-sans h-7 rounded-full"
                  onClick={() => setCustomerTab(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            {/* Bulk Toggle Controls */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-xl">
              <span className="text-xs font-sans font-semibold text-muted-foreground w-full mb-1">Bulk Actions:</span>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Enable gateway charges (2.6%) for ALL customers?")) return;
                await supabase.from("profiles").update({ gateway_charges_enabled: true } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "Gateway charges enabled for all customers" });
                fetchCustomers();
              }}>
                <DollarSign className="w-3 h-3 mr-1" /> Gateway ON (All)
              </Button>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Disable gateway charges for ALL customers?")) return;
                await supabase.from("profiles").update({ gateway_charges_enabled: false } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "Gateway charges disabled for all customers" });
                fetchCustomers();
              }}>
                <DollarSign className="w-3 h-3 mr-1" /> Gateway OFF (All)
              </Button>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Enable international booking for ALL customers?")) return;
                await supabase.from("profiles").update({ international_booking_allowed: true } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "International booking enabled for all customers" });
                fetchCustomers();
              }}>
                <Globe className="w-3 h-3 mr-1" /> Intl ON (All)
              </Button>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Disable international booking for ALL customers?")) return;
                await supabase.from("profiles").update({ international_booking_allowed: false } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "International booking disabled for all customers" });
                fetchCustomers();
              }}>
                <Globe className="w-3 h-3 mr-1" /> Intl OFF (All)
              </Button>
            </div>
            <div className="space-y-3">
              {filteredCustomers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-sans text-muted-foreground">No customers found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredCustomers.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      {editingCustomer === c.user_id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-xs">Full Name</Label><Input value={editCustomerData.full_name || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, full_name: e.target.value })} /></div>
                            <div><Label className="text-xs">Mobile</Label><Input value={editCustomerData.mobile || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditCustomerData({ ...editCustomerData, mobile: d }); }} maxLength={10} /></div>
                          </div>
                          <div><Label className="text-xs">Email (read-only)</Label><Input value={c.email} disabled className="opacity-60" /></div>
                          <div><Label className="text-xs">Instagram</Label><Input value={editCustomerData.instagram_id || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, instagram_id: e.target.value })} /></div>
                          <div><Label className="text-xs">Address</Label><Input value={editCustomerData.address || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, address: e.target.value })} /></div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><Label className="text-xs">City</Label><Input value={editCustomerData.city || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, city: e.target.value })} /></div>
                            <div><Label className="text-xs">State</Label><Input value={editCustomerData.state || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, state: e.target.value })} /></div>
                            <div><Label className="text-xs">Pincode</Label><Input value={editCustomerData.pincode || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setEditCustomerData({ ...editCustomerData, pincode: d }); }} maxLength={6} /></div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveCustomerEdit(c.user_id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}><X className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-sans font-semibold">{c.full_name}</p>
                              {(c as any).display_id && <Badge className="bg-primary/10 text-primary border-none text-[10px] font-mono">ID: {(c as any).display_id}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground font-sans">{c.email} · +91 {c.mobile}</p>
                            {c.instagram_id && <p className="text-xs text-muted-foreground font-sans">IG: {c.instagram_id}</p>}
                            {c.secret_code && <p className="text-xs font-sans text-primary/80">🔑 Secret: <span className="font-mono font-bold">{c.secret_code}</span></p>}
                            {c.address && <p className="text-xs text-muted-foreground font-sans">{c.address}</p>}
                            {(c.city || c.state || c.pincode) && (
                              <p className="text-xs text-muted-foreground font-sans">
                                {[c.city, c.state, c.pincode].filter(Boolean).join(", ")}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-sans">
                              Registered: {formatDateTime(c.created_at)}
                            </p>
                            {/* Event Booking Access Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).event_booking_allowed || false}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Allow" : "Revoke"} event booking access for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ event_booking_allowed: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Event booking enabled" : "Event booking disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Event Booking</span>
                              {(c as any).event_booking_allowed && <Badge className="bg-primary/20 text-foreground border-none text-[10px]">Allowed</Badge>}
                            </div>
                            {/* International Booking Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).international_booking_allowed || false}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Allow" : "Revoke"} international booking for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ international_booking_allowed: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "International booking enabled" : "International booking disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">International Booking</span>
                              {(c as any).international_booking_allowed && <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">🌍 Intl</Badge>}
                            </div>
                            {/* Gateway Charges Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).gateway_charges_enabled === true}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Enable" : "Disable"} payment gateway charges (2.6%) for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ gateway_charges_enabled: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Gateway charges enabled" : "Gateway charges disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Gateway Charges (2.6%)</span>
                              {(c as any).gateway_charges_enabled === true && <Badge className="bg-primary/20 text-foreground border-none text-[10px]">Active</Badge>}
                            </div>
                            {/* Secret Code Login Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).secret_code_login_enabled === true}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Enable" : "Disable"} secret code login for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ secret_code_login_enabled: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Secret code login enabled" : "Secret code login disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Secret Code Login</span>
                              {(c as any).secret_code_login_enabled === true && <Badge className="bg-primary/20 text-foreground border-none text-[10px]">Enabled</Badge>}
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setCustomerPricingUserId(c.user_id); setCustomerPricingUserName(c.full_name); }}
                              >
                                <DollarSign className="w-3 h-3 mr-1" />Custom Pricing
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setCustomerEventPricingUserId(c.user_id); setCustomerEventPricingUserName(c.full_name); }}
                              >
                                <CalIcon className="w-3 h-3 mr-1" />Event Pricing
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setPartialAdvanceUserId(c.user_id); setPartialAdvanceUserName(c.full_name); }}
                              >
                                <SplitSquareHorizontal className="w-3 h-3 mr-1" />Partial Advance
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setCustomerIntlPricingUserId(c.user_id); setCustomerIntlPricingUserName(c.full_name); }}
                              >
                                <Globe className="w-3 h-3 mr-1" />Intl Pricing
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCustomer(c.user_id); setEditCustomerData(c); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                                  <AlertDialogDescription>This will delete the customer profile and all their orders permanently.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCustomer(c.user_id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                      {customerPricingUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminCustomerPricing
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setCustomerPricingUserId(null)}
                            caricatureTypes={caricatureTypes.map(ct => ({ slug: ct.slug, name: ct.name, price: ct.price, per_face: ct.per_face }))}
                          />
                        </div>
                      )}
                      {customerEventPricingUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminCustomerEventPricing
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setCustomerEventPricingUserId(null)}
                          />
                        </div>
                      )}
                      {partialAdvanceUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminPartialAdvanceConfig
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setPartialAdvanceUserId(null)}
                          />
                        </div>
                      )}
                      {customerIntlPricingUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminCustomerIntlPricing
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setCustomerIntlPricingUserId(null)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="artists">
            <AdminArtists />
          </TabsContent>




          <TabsContent value="reviews">
            <AdminReviews />
          </TabsContent>

          <TabsContent value="voice">
            <AdminVoiceMonitor />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics orders={orders as any} customers={customers} />
          </TabsContent>

          <TabsContent value="ai-intelligence">
            <AdminAIIntelligence />
          </TabsContent>

          <TabsContent value="revenue-target">
            <AdminRevenueTargetTracker />
          </TabsContent>

          {/* Live Locations Tab */}
          <TabsContent value="locations">
            <AdminLiveLocations />
            <div className="mt-6">
              <AdminMediaAuditLog />
            </div>
          </TabsContent>

          <TabsContent value="push-center">
            <AdminPushCenter />
          </TabsContent>

          <TabsContent value="notify">
            <AdminNotificationSender />
          </TabsContent>

          <TabsContent value="sessions">
            <AdminSessionsLog />
          </TabsContent>

          <TabsContent value="intl-pricing">
            <AdminInternationalPricing />
          </TabsContent>

          <TabsContent value="ai-conversations">
            <AdminAIChatConversations />
          </TabsContent>

          <TabsContent value="live-chat">
            <AdminChat adminUserId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="quick-questions">
            <AdminQuickQuestions />
          </TabsContent>



          <TabsContent value="chatbot">
            <AdminChatbotTraining />
          </TabsContent>

          <TabsContent value="enquiries">
            <AdminEnquiries />
          </TabsContent>

          <TabsContent value="crm-pipeline">
            <AdminCRMPipeline />
          </TabsContent>

          <TabsContent value="revenue">
            <AdminRevenueDashboard />
          </TabsContent>

          <TabsContent value="support">
            <AdminSupport />
          </TabsContent>

          <TabsContent value="blog">
            <AdminBlog />
          </TabsContent>

          <TabsContent value="gallery">
            <AdminGallery />
            <div className="mt-6">
              <AdminBeforeAfter />
            </div>
          </TabsContent>

          <TabsContent value="hp-reviews">
            <AdminHomepageReviews />
          </TabsContent>

          <TabsContent value="brands">
            <AdminTrustedBrands />
            <div className="mt-6">
              <AdminSocialLinks />
            </div>
          </TabsContent>

          <TabsContent value="homepage">
            <AdminHomepageControl />
          </TabsContent>

          <TabsContent value="explore-editor">
            <AdminExploreEditor />
          </TabsContent>

          <TabsContent value="files">
            <AdminFileExplorer />
          </TabsContent>

          <TabsContent value="seo">
            <AdminSEOSettings />
          </TabsContent>

          <TabsContent value="faqs">
            <AdminFAQs />
          </TabsContent>

          <TabsContent value="google-sheet">
            <AdminGoogleSheet />
          </TabsContent>

          <TabsContent value="mini-database">
            <Suspense fallback={<AdminTabLoader />}><AdminMiniDatabase /></Suspense>
          </TabsContent>

          <TabsContent value="pages">
            <AdminPages />
          </TabsContent>

          <TabsContent value="calculator">
            <AdminCalculatorHistory />
          </TabsContent>

          <TabsContent value="automation">
            <AdminAutomation />
          </TabsContent>

          <TabsContent value="content-editor">
            <AdminContentEditor />
          </TabsContent>

          <TabsContent value="form-builder">
            <AdminFormBuilder />
          </TabsContent>

          <TabsContent value="design-control">
            <AdminDesignControl />
          </TabsContent>

          <TabsContent value="admin-monitoring">
            <AdminMonitoringAI />
          </TabsContent>

          <TabsContent value="security-dashboard">
            <AdminSecurityDashboard />
          </TabsContent>

          <TabsContent value="activity-logs">
            <AdminActivityLogs />
          </TabsContent>

          <TabsContent value="team">
            <AdminTeamManagement />
          </TabsContent>

          <TabsContent value="colleagues">
            <AdminColleagues />
          </TabsContent>

          <TabsContent value="integrations">
            <AdminIntegrations />
          </TabsContent>

          <TabsContent value="referrals">
            <AdminReferrals />
          </TabsContent>

          <TabsContent value="coupons">
            <AdminCoupons />
          </TabsContent>

          <TabsContent value="invoices">
            <AdminInvoices />
          </TabsContent>

          <TabsContent value="feature-gating">
            <AdminFeatureGating />
          </TabsContent>

          <TabsContent value="calendar">
            <AdminCalendar />
          </TabsContent>

          <TabsContent value="website-analytics">
            <AdminWebsiteAnalytics />
          </TabsContent>

          <TabsContent value="heatmap">
            <AdminHeatmap />
          </TabsContent>

          <TabsContent value="maintenance">
            <AdminMaintenance />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6 max-w-2xl">
              {/* Admin Profile Section */}
              <div className="admin-settings-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar with upload */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-xl shadow-primary/20">
                      {(adminProfile as any)?.avatar_url ? (
                        <img src={(adminProfile as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (adminProfile?.full_name || "A").charAt(0).toUpperCase()
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div className="flex-1">
                    {editingAdminProfile ? (
                      <div className="space-y-2">
                        <Input value={adminEditData.full_name || ""} onChange={e => setAdminEditData({...adminEditData, full_name: e.target.value})} placeholder="Full Name" className="font-sans" />
                        <Input value={adminEditData.email || ""} onChange={e => setAdminEditData({...adminEditData, email: e.target.value})} placeholder="Email Address" className="font-sans" />
                        <Input value={adminEditData.mobile || ""} onChange={e => setAdminEditData({...adminEditData, mobile: e.target.value})} placeholder="Mobile" className="font-sans" />
                        <Input type="number" value={(adminEditData as any).age ?? ""} onChange={e => setAdminEditData({...adminEditData, age: e.target.value ? Number(e.target.value) : null} as any)} placeholder="Age" className="font-sans" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveAdminProfile} className="font-sans rounded-xl"><Save className="w-3 h-3 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingAdminProfile(false)} className="rounded-xl">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-sans font-bold text-lg text-foreground">{adminProfile?.full_name || "Admin"}</h3>
                        <p className="text-sm text-muted-foreground font-sans">{adminProfile?.email || user?.email}</p>
                        {(adminProfile as any)?.age && <p className="text-xs text-muted-foreground font-sans">Age: {(adminProfile as any).age}</p>}
                        <p className="text-xs text-muted-foreground font-sans">📱 {adminProfile?.mobile || "Not set"}</p>
                        <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs font-sans" onClick={() => setEditingAdminProfile(true)}>
                          <Edit2 className="w-3 h-3 mr-1" />Edit Profile
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* Password Change */}
                <div className="border-t border-border/40 pt-4 mt-4 space-y-3">
                  <p className="font-sans font-semibold text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-primary" />Change Password</p>
                  <Input type="password" placeholder="Current Password" value={adminCurrentPassword} onChange={e => setAdminCurrentPassword(e.target.value)} className="font-sans" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="password" placeholder="New Password" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} className="font-sans" />
                    <Input type="password" placeholder="Confirm" value={adminConfirmPassword} onChange={e => setAdminConfirmPassword(e.target.value)} className="font-sans" />
                  </div>
                  <Button size="sm" onClick={changeAdminPassword} disabled={changingAdminPassword} className="rounded-xl font-sans">
                    <KeyRound className="w-3 h-3 mr-1" />{changingAdminPassword ? "Changing..." : "Update Password"}
                  </Button>
                </div>
              </div>

              {/* Site Controls */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />Site Controls</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  {/* Global Event Booking Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Event Booking for All Users</p>
                      <p className="text-xs text-muted-foreground font-sans">Allow all registered users to book events</p>
                    </div>
                    <Switch
                      checked={settings.event_booking_global.enabled}
                      onCheckedChange={async (checked) => {
                        if (!confirm(`${checked ? "Enable" : "Disable"} event booking for ALL users?`)) return;
                        await updateSetting("event_booking_global", { enabled: checked });
                        toast({ title: checked ? "Event booking enabled for everyone" : "Event booking restricted to approved users" });
                      }}
                    />
                  </div>
                  {/* Global International Booking Toggle */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">🌍 International Booking for All</p>
                      <p className="text-xs text-muted-foreground font-sans">Allow all users to book international events</p>
                    </div>
                    <Switch
                      checked={settings.international_booking_global.enabled}
                      onCheckedChange={async (checked) => {
                        if (!confirm(`${checked ? "Enable" : "Disable"} international booking for ALL users?`)) return;
                        await updateSetting("international_booking_global", { enabled: checked });
                        toast({ title: checked ? "International booking enabled for everyone" : "International booking restricted" });
                      }}
                    />
                  </div>
                  {/* Workshop Button */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sans font-medium text-sm">Workshop Button</p>
                        <p className="text-xs text-muted-foreground font-sans">Show/hide workshop button on website</p>
                      </div>
                      <Switch
                        checked={settings.workshop_button.enabled}
                        onCheckedChange={async (checked) => {
                          if (!confirm(`${checked ? "Show" : "Hide"} workshop button on website?`)) return;
                          await updateSetting("workshop_button", { ...settings.workshop_button, enabled: checked });
                          toast({ title: checked ? "Workshop button visible" : "Workshop button hidden" });
                        }}
                      />
                    </div>
                    {settings.workshop_button.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Button Label</Label>
                          <Input
                            value={settings.workshop_button.label}
                            onChange={async (e) => {
                              await updateSetting("workshop_button", { ...settings.workshop_button, label: e.target.value });
                            }}
                            placeholder="Workshop"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Button URL</Label>
                          <Input
                            value={settings.workshop_button.url}
                            onChange={async (e) => {
                              await updateSetting("workshop_button", { ...settings.workshop_button, url: e.target.value });
                            }}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Artwork Bypass Setting */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Image className="w-5 h-5 text-violet-600 dark:text-violet-400" />Artwork Upload Settings</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Allow Status Change Without Artwork</p>
                      <p className="text-xs text-muted-foreground font-sans">Skip artwork upload requirement when changing order status to Art Ready</p>
                    </div>
                    <Switch
                      checked={(settings as any).allow_artwork_bypass?.enabled || false}
                      onCheckedChange={async (checked) => {
                        await updateSetting("allow_artwork_status_without_upload", { enabled: checked });
                        toast({ title: checked ? "Artwork bypass enabled" : "Artwork upload required" });
                      }}
                    />
                  </div>
                </CardContent>
              </div>

              {/* Admin Action Prompt Toggle */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />Admin Action Confirmation</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Require Name for Crucial Actions</p>
                      <p className="text-xs text-muted-foreground font-sans">Ask admins to enter their name before status changes, deletions, and other critical actions</p>
                    </div>
                    <Switch
                      checked={(settings as any).admin_action_prompt?.enabled !== false}
                      onCheckedChange={async (checked) => {
                        await updateSetting("admin_action_prompt", { enabled: checked });
                        toast({ title: checked ? "Action confirmation enabled" : "Action confirmation disabled" });
                      }}
                    />
                  </div>
                </CardContent>
              </div>

              {/* Navigation & Visibility Settings */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-500/10 dark:to-teal-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Home className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />Navigation & Visibility</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Shop Tab in Nav</p>
                      <p className="text-xs text-muted-foreground font-sans">Display Shop link in website navigation bar</p>
                    </div>
                    <Switch checked={settings.shop_nav_visible?.enabled !== false} onCheckedChange={async (checked) => { await updateSetting("shop_nav_visible", { enabled: checked }); toast({ title: checked ? "Shop tab visible in nav" : "Shop tab hidden from nav" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Workshop Login in Mobile Nav</p>
                      <p className="text-xs text-muted-foreground font-sans">Display Workshop login button on the mobile bottom navigation bar</p>
                    </div>
                    <Switch checked={(settings as any).workshop_mobile_nav?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("workshop_mobile_nav", { enabled: checked }); toast({ title: checked ? "Workshop shown in mobile nav" : "Workshop hidden from mobile nav" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Shop Tab in Tracking</p>
                      <p className="text-xs text-muted-foreground font-sans">Display shop order tracking section on the Track Order page</p>
                    </div>
                    <Switch checked={(settings as any).shop_tracking_visible?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("shop_tracking_visible", { enabled: checked }); toast({ title: checked ? "Shop tracking visible" : "Shop tracking hidden" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Support Button Visible</p>
                      <p className="text-xs text-muted-foreground font-sans">Show/hide support button on main website</p>
                    </div>
                    <Switch checked={settings.support_button_visible?.enabled !== false} onCheckedChange={async (checked) => { await updateSetting("support_button_visible", { enabled: checked }); toast({ title: checked ? "Support button visible" : "Support button hidden" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Support in Mobile Nav</p>
                      <p className="text-xs text-muted-foreground font-sans">Show support tab in mobile bottom navigation</p>
                    </div>
                    <Switch checked={(settings as any).support_mobile_nav?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("support_mobile_nav", { enabled: checked }); toast({ title: checked ? "Support added to mobile nav" : "Support removed from mobile nav" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Workshop in User Dashboard</p>
                      <p className="text-xs text-muted-foreground font-sans">Show workshop registration tab on user dashboard</p>
                    </div>
                    <Switch checked={(settings as any).workshop_dashboard_visible?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("workshop_dashboard_visible", { enabled: checked }); toast({ title: checked ? "Workshop visible on dashboard" : "Workshop hidden from dashboard" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Allow International Workshop Registration</p>
                      <p className="text-xs text-muted-foreground font-sans">Let users from other countries register for workshops</p>
                    </div>
                    <Switch checked={(settings as any).allow_international_registration?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("allow_international_registration", { enabled: checked }); toast({ title: checked ? "International registration enabled" : "International registration disabled" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show App Download Link</p>
                      <p className="text-xs text-muted-foreground font-sans">Show/hide Android APK download link in footer</p>
                    </div>
                    <Switch checked={settings.app_download_link?.enabled !== false} onCheckedChange={async (checked) => { await updateSetting("app_download_link", { enabled: checked }); toast({ title: checked ? "App download link visible" : "App download link hidden" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show PWA Install Link</p>
                      <p className="text-xs text-muted-foreground font-sans">Show "Install App" link in website footer for PWA installation</p>
                    </div>
                    <Switch checked={(settings as any).pwa_install_link?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("pwa_install_link", { enabled: checked }); toast({ title: checked ? "PWA install link visible" : "PWA install link hidden" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Default Website Theme</p>
                      <p className="text-xs text-muted-foreground font-sans">Set default theme for all visitors (light or dark)</p>
                    </div>
                    <Select
                      value={(settings as any).default_theme?.mode || "light"}
                      onValueChange={async (val) => { await updateSetting("default_theme", { mode: val }); toast({ title: `Default theme set to ${val}` }); }}
                    >
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">☀️ Light</SelectItem>
                        <SelectItem value="dark">🌙 Dark</SelectItem>
                        <SelectItem value="system">💻 System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Explore (About) in Mobile Nav</p>
                      <p className="text-xs text-muted-foreground font-sans">Display the Explore/About tab in mobile bottom navigation</p>
                    </div>
                    <Switch checked={(settings as any).explore_mobile_nav?.enabled !== false} onCheckedChange={async (checked) => { await updateSetting("explore_mobile_nav", { enabled: checked }); toast({ title: checked ? "Explore shown in mobile nav" : "Explore hidden from mobile nav" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Live Chat in Mobile Nav</p>
                      <p className="text-xs text-muted-foreground font-sans">Display the Live Chat tab in mobile bottom navigation</p>
                    </div>
                    <Switch checked={(settings as any).live_chat_visible?.enabled || false} onCheckedChange={async (checked) => { await updateSetting("live_chat_visible", { enabled: checked }); toast({ title: checked ? "Live Chat shown in mobile nav" : "Live Chat hidden from mobile nav" }); }} />
                  </div>
                </CardContent>
              </div>

              {/* Gateway Charges */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />Gateway Charges</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <Label className="font-sans text-sm">Gateway Charge Percentage (%)</Label>
                    <p className="text-xs text-muted-foreground font-sans mb-2">Applied to users with gateway charges enabled</p>
                    <div className="flex gap-2">
                      <Input
                        type="number" step="0.1" min="0" max="10"
                        value={settings.gateway_charge_percentage?.percentage ?? 2.6}
                        onChange={async (e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val >= 0 && val <= 10) { await updateSetting("gateway_charge_percentage", { percentage: val }); toast({ title: `Gateway charge set to ${val}%` }); } }}
                        className="max-w-[120px] font-sans"
                      />
                      <span className="text-sm text-muted-foreground font-sans self-center">%</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Admin Secret Code */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><KeyRound className="w-5 h-5 text-rose-600 dark:text-rose-400" />Admin Secret Code</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <Label className="font-sans text-sm">Admin Secret Code (used for OTP bypass & session unlock)</Label>
                    <p className="text-xs text-muted-foreground font-sans mb-2">Change the master admin secret code</p>
                    <Input
                      type="text" maxLength={8}
                      value={(settings as any).admin_secret_code?.code || "01022006"}
                      onChange={async (e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 8) { await updateSetting("admin_secret_code", { code: val, enabled: (settings as any).admin_secret_code?.enabled !== false }); } }}
                      className="max-w-[200px] font-sans text-center text-lg tracking-widest font-bold"
                      placeholder="01022006"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Enable Secret Code Login</p>
                      <p className="text-xs text-muted-foreground font-sans">Allow admins to use the secret code to bypass OTP</p>
                    </div>
                    <Switch
                      checked={(settings as any).admin_secret_code?.enabled !== false}
                      onCheckedChange={async (checked) => { await updateSetting("admin_secret_code", { code: (settings as any).admin_secret_code?.code || "01022006", enabled: checked }); toast({ title: checked ? "Secret code login enabled" : "Secret code login disabled" }); }}
                    />
                  </div>
                </CardContent>
              </div>

              {/* Live Chat Toggle */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-500/10 dark:to-cyan-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><MessageCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />Live Chat Widget</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Live Chat on Website</p>
                      <p className="text-xs text-muted-foreground font-sans">Display the live chat widget for logged-in users in the footer</p>
                    </div>
                    <Switch
                      checked={(settings as any).live_chat_visible?.enabled || false}
                      onCheckedChange={async (checked) => { await updateSetting("live_chat_visible", { enabled: checked }); toast({ title: checked ? "Live chat enabled on website" : "Live chat hidden from website" }); }}
                    />
                  </div>
                </CardContent>
              </div>

              {/* Floating Buttons Control */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-500/10 dark:to-fuchsia-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />Floating Buttons</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Show WhatsApp Float</p>
                      <p className="text-xs text-muted-foreground font-sans">Display floating WhatsApp button (default: off)</p>
                    </div>
                    <Switch checked={(settings as any).floating_whatsapp?.enabled === true} onCheckedChange={async (checked) => { await updateSetting("floating_whatsapp", { enabled: checked }); toast({ title: checked ? "WhatsApp float enabled" : "WhatsApp float hidden" }); }} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div>
                      <p className="font-sans font-medium text-sm">Show Instagram Float</p>
                      <p className="text-xs text-muted-foreground font-sans">Display floating Instagram button (default: off)</p>
                    </div>
                    <Switch checked={(settings as any).floating_instagram?.enabled === true} onCheckedChange={async (checked) => { await updateSetting("floating_instagram", { enabled: checked }); toast({ title: checked ? "Instagram float enabled" : "Instagram float hidden" }); }} />
                  </div>
                </CardContent>
              </div>

              {/* Hide Shop from Admin Panel */}
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />Shop Visibility in Admin</h3>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Hide Shop Data from Admin Panel</p>
                      <p className="text-xs text-muted-foreground font-sans">Remove all shop-related widgets, tabs, and graphics from the main admin panel</p>
                    </div>
                    <Switch
                      checked={(settings as any).hide_shop_from_admin?.enabled || false}
                      onCheckedChange={async (checked) => { await updateSetting("hide_shop_from_admin", { enabled: checked }); toast({ title: checked ? "Shop data hidden from admin panel" : "Shop data visible in admin panel" }); }}
                    />
                  </div>
                </CardContent>
              </div>
              <div className="admin-settings-card overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5 border-b border-border/30">
                  <h3 className="font-sans font-bold text-base flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />Add New Admin</h3>
                </div>
                <CardContent className="space-y-3 p-6">
                  <div><Label>Full Name *</Label><Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Admin name" /></div>
                  <div><Label>Email *</Label><Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@email.com" /></div>
                  <div><Label>Mobile *</Label><Input value={newAdminMobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewAdminMobile(d); }} maxLength={10} placeholder="10 digits" /></div>
                  <div><Label>Password *</Label><Input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Min 6 characters" /></div>

                  {/* Permission Controls */}
                  <div className="border-t border-border/30 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sans font-medium text-sm">Allow Everything</p>
                        <p className="text-xs text-muted-foreground font-sans">Full access to all tabs</p>
                      </div>
                      <Switch checked={adminPermAllTabs} onCheckedChange={(checked) => {
                        setAdminPermAllTabs(checked);
                        if (checked) setAdminPermissions(Object.fromEntries(ADMIN_TABS.map(t => [t.id, "full"])));
                      }} />
                    </div>
                    {!adminPermAllTabs && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">Tab Permissions</p>
                        {ADMIN_TABS.map(tab => (
                          <div key={tab.id} className="flex items-center justify-between py-1">
                            <span className="text-sm font-sans">{tab.label}</span>
                            <Select value={adminPermissions[tab.id] || "full"} onValueChange={(val) => setAdminPermissions(prev => ({ ...prev, [tab.id]: val }))}>
                              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Control</SelectItem>
                                <SelectItem value="edit">Edit Access</SelectItem>
                                <SelectItem value="view">View Only</SelectItem>
                                <SelectItem value="none">No Access</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={addNewAdmin} disabled={!newAdminEmail || !newAdminPassword || !newAdminName || !newAdminMobile || addingAdmin} className="w-full rounded-xl font-sans">
                    {addingAdmin ? "Adding Admin..." : "Add Admin"}
                  </Button>
                </CardContent>
              </div>

              {/* Push App Update */}
              <AdminPushUpdate />
            </div>
          </TabsContent>
          </motion.div>
          </Suspense>
        </Tabs>
        </div>

      {/* Negotiate Price Dialog */}
      {negotiateOrderId && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setNegotiateOrderId(null)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle className="font-display text-lg">Set Custom Price</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-sans">Negotiated Amount (₹)</Label>
                <Input type="number" value={negotiatedAmount} onChange={(e) => setNegotiatedAmount(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveNegotiatedAmount} className="flex-1 font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                <Button variant="ghost" onClick={() => setNegotiateOrderId(null)} className="font-sans">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/15 safe-area-bottom">
        <div className="flex items-center overflow-x-auto py-1.5 px-1 gap-0.5 scrollbar-thin">
          <AdminBottomNavItem icon={BarChart3} label="Dash" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <AdminBottomNavItem icon={Package} label="Orders" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
          <AdminBottomNavItem icon={CalIcon} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <AdminBottomNavItem icon={Receipt} label="Pay" active={activeTab === "payments"} onClick={() => setActiveTab("payments")} />
          <AdminBottomNavItem icon={Users} label="Users" active={activeTab === "customers"} onClick={() => setActiveTab("customers")} />
          <AdminBottomNavItem icon={Target} label="CRM" active={activeTab === "crm-pipeline"} onClick={() => setActiveTab("crm-pipeline")} />
          <AdminBottomNavItem icon={BarChart3} label="Stats" active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")} />
          <AdminBottomNavItem icon={Package} label="Artists" active={activeTab === "artists"} onClick={() => setActiveTab("artists")} />
          <AdminBottomNavItem icon={Bell} label="Notify" active={activeTab === "notify"} onClick={() => setActiveTab("notify")} />
          <AdminBottomNavItem icon={Bot} label="AI" active={activeTab === "ai-conversations"} onClick={() => setActiveTab("ai-conversations")} />
          <AdminBottomNavItem icon={ClipboardList} label="Enquiry" active={activeTab === "enquiries"} onClick={() => setActiveTab("enquiries")} />
          <AdminBottomNavItem icon={Shield} label="Security" active={activeTab === "security-dashboard"} onClick={() => setActiveTab("security-dashboard")} />
          <AdminBottomNavItem icon={Settings} label="More" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <AdminBottomNavItem icon={LogOut} label="Out" active={false} onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }} />
        </div>
      </div>
      </div>
    </div>
  );
};

const AdminBottomNavItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
    active 
      ? "bg-foreground/[0.08] text-foreground font-semibold" 
      : "text-muted-foreground"
  }`} style={{ fontFamily: 'Inter, sans-serif' }}>
    <Icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
    <span className="text-[9px] font-medium whitespace-nowrap">{label}</span>
    {active && <div className="w-1 h-1 rounded-full bg-[hsl(22,78%,52%)]" />}
  </button>
);

const EventUsersTab = () => {
  const [eventUsers, setEventUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchEventUsers();
  }, []);

  const fetchEventUsers = async () => {
    const { data } = await supabase.from("event_bookings")
      .select("id, client_name, client_email, client_mobile, client_instagram, event_type, event_date, city, state, total_price, advance_amount, payment_status, status, created_at")
      .order("created_at", { ascending: false });
    if (data) {
      const uniqueUsers = new Map<string, any>();
      data.forEach((ev: any) => {
        if (!uniqueUsers.has(ev.client_email)) {
          uniqueUsers.set(ev.client_email, { ...ev, event_count: 1 });
        } else {
          uniqueUsers.get(ev.client_email).event_count++;
        }
      });
      setEventUsers(Array.from(uniqueUsers.values()));
    }
    setLoading(false);
  };

  const saveEventUserEdit = async () => {
    if (!editingId) return;
    await supabase.from("event_bookings").update({
      client_name: editData.client_name,
      client_mobile: editData.client_mobile,
      client_instagram: editData.client_instagram || null,
    } as any).eq("id", editingId);
    toast({ title: "Event User Updated!" });
    setEditingId(null);
    fetchEventUsers();
  };

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Event Customers ({eventUsers.length})</h2>
      {eventUsers.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No event customers yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {eventUsers.map((u: any) => (
            <Card key={u.client_email}>
              <CardContent className="p-4">
                {editingId === u.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Name</Label><Input value={editData.client_name || ""} onChange={e => setEditData({...editData, client_name: e.target.value})} /></div>
                      <div><Label className="text-xs">Mobile</Label><Input value={editData.client_mobile || ""} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setEditData({...editData, client_mobile: d}); }} maxLength={10} /></div>
                    </div>
                    <div><Label className="text-xs">Email (read-only)</Label><Input value={u.client_email} disabled className="opacity-60" /></div>
                    <div><Label className="text-xs">Instagram</Label><Input value={editData.client_instagram || ""} onChange={e => setEditData({...editData, client_instagram: e.target.value})} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEventUserEdit} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-sans font-semibold">{u.client_name}</p>
                      <p className="text-xs text-muted-foreground font-sans">{u.client_email} · +91{u.client_mobile}</p>
                      {u.client_instagram && <p className="text-xs text-muted-foreground font-sans">IG: {u.client_instagram}</p>}
                      <p className="text-xs text-muted-foreground font-sans">{u.city}, {u.state}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{u.event_count} Event{u.event_count > 1 ? "s" : ""}</Badge>
                        <Badge className={`border-none text-[10px] ${u.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          Last: {u.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="font-display font-bold text-primary">{formatPrice(u.total_price)}</p>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(u.id); setEditData(u); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
