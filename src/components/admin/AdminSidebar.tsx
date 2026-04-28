import { 
  Package, Calendar, Receipt, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Home, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  HelpCircle, Shield, Zap, PenTool, Image, FileText, Calculator, Target,
  LayoutDashboard, TrendingUp, UserCheck, Layers, FileQuestion,
  Type, FormInput, Palette, Activity, ShieldCheck, Brain, MessageCircle,
  Gift, Ticket, AlertTriangle, ToggleLeft, CalendarDays, LineChart,
  Search, Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { unlockAdminUrl, buildUnlockUrl } from "@/lib/admin-url-unlock";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { id: "orders", icon: Package, label: "Orders" },
      { id: "customers", icon: Users, label: "Customers" },
      { id: "events", icon: Calendar, label: "Events" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "payments", icon: Receipt, label: "Payments" },
      { id: "event-payment-claims", icon: Receipt, label: "Payment Claims" },
      { id: "invoices", icon: FileText, label: "Invoices" },
      { id: "revenue", icon: DollarSign, label: "Revenue" },
      { id: "accounting", icon: Calculator, label: "Accounting" },
      { id: "pricing", icon: DollarSign, label: "Domestic Pricing" },
      { id: "intl-pricing", icon: Globe, label: "International" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "analytics", icon: BarChart3, label: "Overview" },
      { id: "website-analytics", icon: LineChart, label: "Web Analytics" },
      { id: "ai-intelligence", icon: Zap, label: "AI Insights" },
      { id: "revenue-target", icon: Target, label: "Targets" },
      { id: "calendar", icon: CalendarDays, label: "Calendar" },
      { id: "heatmap", icon: Map, label: "Heatmap" },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "live-chat", icon: MessageCircle, label: "Live Chat" },
      { id: "ai-conversations", icon: Bot, label: "AI Chats" },
      { id: "quick-questions", icon: Brain, label: "Quick Q&A" },
      { id: "notify", icon: Bell, label: "Notifications" },
      { id: "push-center", icon: Zap, label: "Push Center" },
    ],
  },
  {
    label: "CRM",
    items: [
      { id: "crm-pipeline", icon: Target, label: "Pipeline" },
      { id: "enquiries", icon: ClipboardList, label: "Enquiries" },
      { id: "support", icon: HelpCircle, label: "Support" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "event-users", icon: UserCheck, label: "Event Users" },
      { id: "artists", icon: PenTool, label: "Artists" },
      { id: "reviews", icon: Star, label: "Reviews" },
      { id: "verification", icon: ShieldCheck, label: "Verification" },
      { id: "edit-requests", icon: FileText, label: "Edit Requests" },
    ],
  },
  {
    label: "Frontend Control",
    items: [
      { id: "content-editor", icon: Type, label: "Text Editor" },
      { id: "form-builder", icon: FormInput, label: "Form Builder" },
      { id: "design-control", icon: Palette, label: "Design" },
      { id: "watermark", icon: Shield, label: "Watermark" },
      { id: "workshop-builder", icon: Layers, label: "Workshop Page Builder" },
      { id: "dashboard-builder", icon: Layers, label: "User Dashboard Builder" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "homepage", icon: Home, label: "Homepage" },
      { id: "explore-editor", icon: Layers, label: "Explore Page" },
      { id: "blog", icon: FileText, label: "Blog" },
      { id: "gallery", icon: Image, label: "Gallery" },
      { id: "hp-reviews", icon: Star, label: "HP Reviews" },
      { id: "brands", icon: Shield, label: "Brands" },
      { id: "pages", icon: FileQuestion, label: "Pages" },
      { id: "page-content", icon: Type, label: "Page Content (CMS)" },
      { id: "faqs", icon: FileQuestion, label: "FAQs" },
      { id: "files", icon: Layers, label: "Files" },
      { id: "seo", icon: TrendingUp, label: "SEO" },
      { id: "calculator", icon: Calculator, label: "Calculator" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "google-sheet", icon: Globe, label: "Google Sheet" },
      { id: "mini-database", icon: Globe, label: "Mini Database" },
      { id: "security-dashboard", icon: ShieldCheck, label: "Security" },
      { id: "error-inbox", icon: AlertTriangle, label: "Error Inbox" },
      { id: "activity-logs", icon: Activity, label: "Activity Logs" },
      { id: "integrations", icon: Shield, label: "Integrations" },
      { id: "automation", icon: Zap, label: "Automation" },
      { id: "settings", icon: Settings, label: "Settings" },
      { id: "maintenance", icon: AlertTriangle, label: "Maintenance" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "lead-links", icon: Gift, label: "Lead Links" },
      { id: "lil-flea", icon: Ticket, label: "Lil Flea Page" },
      { id: "referrals", icon: Gift, label: "Referrals" },
      { id: "referral-qa", icon: Gift, label: "Referral QA" },
      { id: "data-exports", icon: Gift, label: "Data Exports" },
      { id: "system-health", icon: ToggleLeft, label: "System Health" },
      { id: "coupons", icon: Ticket, label: "Coupons" },
      { id: "feature-gating", icon: ToggleLeft, label: "Feature Gates" },
    ],
  },
  {
    label: "AI & Tools",
    items: [
      { id: "admin-monitoring", icon: Brain, label: "AI Monitor" },
      { id: "chatbot", icon: Settings, label: "AI Training" },
      { id: "voice", icon: Radio, label: "Voice Monitor" },
      { id: "sessions", icon: Monitor, label: "Sessions" },
      { id: "locations", icon: MapPin, label: "Locations" },
      { id: "audit-log", icon: ShieldCheck, label: "Audit Log" },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "team", icon: Users, label: "Team" },
      { id: "colleagues", icon: MessageCircle, label: "Colleagues" },
    ],
  },
  {
    label: "Other Panels",
    items: [
      { id: "link-workshop-admin", icon: CalendarDays, label: "Workshop Admin" },
      { id: "link-shop-admin", icon: Package, label: "Shop Admin" },
    ],
  },
];

const SHOP_RELATED_TABS = ["shop", "shop-orders", "shop-products", "shop-categories", "shop-settings"];

type SidebarMode = "expanded" | "collapsed" | "hidden";

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  // Persist user preference across reloads
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "expanded";
    return (localStorage.getItem("admin_sidebar_mode") as SidebarMode) || "expanded";
  });
  const collapsed = mode === "collapsed";
  const hidden = mode === "hidden";
  const updateMode = (next: SidebarMode) => {
    setMode(next);
    try { localStorage.setItem("admin_sidebar_mode", next); } catch {}
  };
  const cycleMode = () => {
    // expanded → collapsed → hidden → expanded
    updateMode(mode === "expanded" ? "collapsed" : mode === "collapsed" ? "hidden" : "expanded");
  };
  const setCollapsed = (v: boolean) => updateMode(v ? "collapsed" : "expanded");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const hideShop = (settings as any)?.hide_shop_from_admin?.enabled || false;

  const filteredSections = useMemo(() => {
    let sections = NAV_SECTIONS;
    if (hideShop) {
      sections = sections.map(section => ({
        ...section,
        items: section.items.filter(item => !SHOP_RELATED_TABS.includes(item.id))
      })).filter(section => section.items.length > 0);
    }
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      sections = sections.map(section => ({
        ...section,
        items: section.items.filter(item => item.label.toLowerCase().includes(q))
      })).filter(section => section.items.length > 0);
    }
    return sections;
  }, [hideShop, sidebarSearch]);

  // When fully hidden on desktop, show a small floating restore tab on the left edge
  if (hidden) {
    return (
      <button
        onClick={() => updateMode("expanded")}
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 w-7 h-20 items-center justify-center rounded-r-2xl shadow-lg transition-transform hover:translate-x-0.5"
        style={{ background: "linear-gradient(180deg, hsl(225 35% 96%), hsl(225 30% 92%))", border: "1px solid hsl(225 25% 88%)", borderLeft: "none" }}
        title="Show admin sidebar"
        aria-label="Show admin sidebar"
      >
        <ChevronRight className="w-4 h-4" style={{ color: "hsl(225 25% 40%)" }} />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Floating container */}
      <div className="flex flex-col h-full m-3 mr-0 rounded-2xl admin-sidebar-premium overflow-hidden">
        {/* Logo + Collapse */}
        <div className="flex items-center justify-between px-4 py-4">
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            onClick={() => navigate("/")}
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/[0.04] shadow-sm">
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
            </div>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="min-w-0">
                <p className="text-[13px] font-bold tracking-tight admin-panel-font" style={{ color: "hsl(25 20% 18%)" }}>Admin Panel</p>
                <p className="text-[9px] tracking-wide admin-panel-font" style={{ color: "hsl(25 10% 55%)" }}>Creative Caricature Club™</p>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCollapsed(!collapsed)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "hsl(225 30% 94%)" }}
              title={collapsed ? "Expand sidebar" : "Collapse to icons"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse to icons"}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" style={{ color: "hsl(225 25% 45%)" }} /> : <ChevronLeft className="w-3.5 h-3.5" style={{ color: "hsl(225 25% 45%)" }} />}
            </motion.button>
            {!collapsed && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateMode("hidden")}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "hsl(225 30% 94%)" }}
                title="Hide sidebar fully"
                aria-label="Hide sidebar fully"
              >
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: "hsl(225 25% 45%)" }} />
                <ChevronLeft className="w-3.5 h-3.5 -ml-2" style={{ color: "hsl(225 25% 45%)" }} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "hsl(25 10% 55%)" }} />
              <input
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-8 pr-3 py-[7px] rounded-xl text-[12px] admin-panel-font transition-all duration-200 admin-sidebar-search"
                style={{
                  background: "hsl(30 15% 96%)",
                  border: "1px solid hsl(30 18% 90%)",
                  color: "hsl(25 20% 18%)",
                }}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1 px-2 scrollbar-thin">
          {filteredSections.map((section) => (
            <div key={section.label} className="mb-0.5">
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] px-3 mb-1 mt-3 admin-panel-font" style={{ color: "hsl(25 10% 62%)" }}>
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const handleClick = () => {
                  if (item.id === "link-workshop-admin") {
                    // SSO: same browser session is shared via Supabase localStorage,
                    // so we open the workshop admin panel directly in a new tab with
                    // an unlock-hash that the new tab consumes on boot.
                    unlockAdminUrl("workshop");
                    window.open(buildUnlockUrl("/workshop-admin-panel", "workshop"), "_blank", "noopener");
                    return;
                  }
                  if (item.id === "link-shop-admin") {
                    unlockAdminUrl("shop");
                    window.open(buildUnlockUrl("/shop-admin", "shop"), "_blank", "noopener");
                    return;
                  }
                  onTabChange(item.id);
                };
                return (
                  <motion.button
                    key={item.id}
                    onClick={handleClick}
                    whileHover={{ x: collapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-[12.5px] transition-all duration-200 mb-[2px] admin-panel-font relative group",
                      isActive
                        ? "admin-sidebar-item-active"
                        : "admin-sidebar-item-idle"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="admin-sidebar-glow"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                        style={{ background: "linear-gradient(180deg, hsl(25 40% 50%), hsl(18 40% 55%))" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className={cn(
                      "w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      isActive 
                        ? "admin-sidebar-icon-active" 
                        : "admin-sidebar-icon-idle"
                    )}>
                      <item.icon className="w-[14px] h-[14px]" />
                    </div>
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-[5px] h-[5px] rounded-full animate-pulse" style={{ background: "hsl(25 40% 55%)" }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 space-y-0.5" style={{ borderTop: "1px solid hsl(30 18% 90%)" }}>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-[12px] transition-all admin-panel-font admin-sidebar-item-idle"
            title={collapsed ? "Home" : undefined}
          >
            <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center admin-sidebar-icon-idle">
              <Home className="w-[14px] h-[14px]" />
            </div>
            {!collapsed && <span>Website</span>}
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-[12px] transition-all admin-panel-font group"
            style={{ color: "hsl(0 50% 55%)" }}
            title={collapsed ? "Logout" : undefined}
          >
            <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-colors" style={{ background: "hsl(0 50% 96%)" }}>
              <LogOut className="w-[14px] h-[14px]" />
            </div>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
