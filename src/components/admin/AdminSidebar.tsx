import { 
  Package, Calendar, Receipt, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Home, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  HelpCircle, Shield, Zap, PenTool, Image, FileText, Calculator, Target,
  LayoutDashboard, TrendingUp, UserCheck, Layers, FileQuestion,
  Type, FormInput, Palette, Activity, ShieldCheck, Brain, MessageCircle,
  Gift, Ticket, AlertTriangle, ToggleLeft, CalendarDays, LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", color: "from-indigo-500 to-blue-500" },
      { id: "orders", icon: Package, label: "Orders", color: "from-cyan-500 to-teal-500" },
      { id: "events", icon: Calendar, label: "Events", color: "from-violet-500 to-purple-500" },
      { id: "payments", icon: Receipt, label: "Payments", color: "from-emerald-500 to-green-500" },
      { id: "invoices", icon: FileText, label: "Invoices", color: "from-amber-500 to-orange-500" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "analytics", icon: BarChart3, label: "Overview", color: "from-blue-500 to-indigo-500" },
      { id: "revenue", icon: DollarSign, label: "Revenue", color: "from-emerald-500 to-teal-500" },
      { id: "revenue-target", icon: Target, label: "₹10L Target", color: "from-amber-500 to-yellow-500" },
      { id: "ai-intelligence", icon: Zap, label: "AI Insights", color: "from-purple-500 to-pink-500" },
      { id: "calendar", icon: CalendarDays, label: "Calendar", color: "from-rose-500 to-pink-500" },
      { id: "website-analytics", icon: LineChart, label: "Web Analytics", color: "from-cyan-500 to-blue-500" },
    ],
  },
  {
    label: "AI & Chat",
    items: [
      { id: "ai-conversations", icon: Bot, label: "AI Chats", color: "from-violet-500 to-fuchsia-500" },
      { id: "chatbot", icon: Settings, label: "AI Training", color: "from-pink-500 to-rose-500" },
      { id: "live-chat", icon: MessageCircle, label: "Live Chat", color: "from-teal-500 to-cyan-500" },
      { id: "quick-questions", icon: Brain, label: "Quick Q&A", color: "from-amber-500 to-yellow-500" },
    ],
  },
  {
    label: "CRM",
    items: [
      { id: "crm-pipeline", icon: Target, label: "Pipeline", color: "from-orange-500 to-red-500" },
      { id: "enquiries", icon: ClipboardList, label: "Enquiries", color: "from-sky-500 to-blue-500" },
      { id: "support", icon: HelpCircle, label: "Support", color: "from-lime-500 to-green-500" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "customers", icon: Users, label: "Customers", color: "from-pink-500 to-rose-500" },
      { id: "event-users", icon: UserCheck, label: "Event Users", color: "from-indigo-500 to-violet-500" },
      { id: "artists", icon: PenTool, label: "Artists", color: "from-amber-500 to-orange-500" },
      { id: "reviews", icon: Star, label: "Reviews", color: "from-yellow-500 to-amber-500" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { id: "pricing", icon: DollarSign, label: "Domestic", color: "from-emerald-500 to-green-500" },
      { id: "intl-pricing", icon: Globe, label: "International", color: "from-blue-500 to-cyan-500" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "locations", icon: MapPin, label: "Locations", color: "from-red-500 to-rose-500" },
      { id: "voice", icon: Radio, label: "Voice Monitor", color: "from-purple-500 to-violet-500" },
      { id: "push-center", icon: Zap, label: "Push Center", color: "from-yellow-500 to-orange-500" },
      { id: "notify", icon: Bell, label: "Notifications", color: "from-sky-500 to-indigo-500" },
      { id: "sessions", icon: Monitor, label: "Sessions", color: "from-slate-500 to-gray-500" },
    ],
  },
  {
    label: "Frontend Control",
    items: [
      { id: "content-editor", icon: Type, label: "Text Editor", color: "from-teal-500 to-emerald-500" },
      { id: "form-builder", icon: FormInput, label: "Form Builder", color: "from-indigo-500 to-blue-500" },
      { id: "design-control", icon: Palette, label: "Design", color: "from-pink-500 to-fuchsia-500" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "homepage", icon: Home, label: "Homepage", color: "from-orange-500 to-amber-500" },
      { id: "blog", icon: FileText, label: "Blog", color: "from-blue-500 to-sky-500" },
      { id: "gallery", icon: Image, label: "Gallery", color: "from-violet-500 to-purple-500" },
      { id: "hp-reviews", icon: Star, label: "HP Reviews", color: "from-yellow-500 to-amber-500" },
      { id: "brands", icon: Shield, label: "Brands", color: "from-cyan-500 to-teal-500" },
      { id: "pages", icon: FileQuestion, label: "Pages", color: "from-rose-500 to-pink-500" },
      { id: "files", icon: Layers, label: "Files", color: "from-emerald-500 to-green-500" },
      { id: "seo", icon: TrendingUp, label: "SEO", color: "from-indigo-500 to-violet-500" },
      { id: "calculator", icon: Calculator, label: "Calculator", color: "from-amber-500 to-yellow-500" },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "team", icon: Users, label: "Team", color: "from-blue-500 to-indigo-500" },
      { id: "colleagues", icon: MessageCircle, label: "Colleagues", color: "from-pink-500 to-rose-500" },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "admin-monitoring", icon: Brain, label: "AI Monitor", color: "from-purple-500 to-violet-500" },
      { id: "security-dashboard", icon: ShieldCheck, label: "Security", color: "from-red-500 to-rose-500" },
      { id: "activity-logs", icon: Activity, label: "Activity Logs", color: "from-slate-500 to-gray-600" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "referrals", icon: Gift, label: "Referrals", color: "from-pink-500 to-rose-500" },
      { id: "coupons", icon: Ticket, label: "Coupons", color: "from-amber-500 to-orange-500" },
      { id: "feature-gating", icon: ToggleLeft, label: "Feature Gates", color: "from-teal-500 to-cyan-500" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "automation", icon: Zap, label: "Automation", color: "from-yellow-500 to-orange-500" },
      { id: "integrations", icon: Shield, label: "Integrations", color: "from-indigo-500 to-blue-500" },
      { id: "maintenance", icon: AlertTriangle, label: "Maintenance", color: "from-red-500 to-orange-500" },
      { id: "settings", icon: Settings, label: "Settings", color: "from-slate-500 to-gray-500" },
    ],
  },
  {
    label: "Other Panels",
    items: [
      { id: "link-workshop-admin", icon: CalendarDays, label: "Workshop Admin", color: "from-violet-500 to-fuchsia-500" },
      { id: "link-shop-admin", icon: Package, label: "Shop Admin", color: "from-emerald-500 to-teal-500" },
    ],
  },
];

const SHOP_RELATED_TABS = ["shop", "shop-orders", "shop-products", "shop-categories", "shop-settings"];

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const hideShop = (settings as any)?.hide_shop_from_admin?.enabled || false;

  const filteredSections = useMemo(() => {
    if (!hideShop) return NAV_SECTIONS;
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => !SHOP_RELATED_TABS.includes(item.id))
    })).filter(section => section.items.length > 0);
  }, [hideShop]);

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30",
        "admin-sidebar-vibrant",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border/30">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg shadow-primary/10 ring-2 ring-primary/10">
            <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <p className="text-[13px] font-extrabold tracking-tight text-foreground font-sans">Admin Panel</p>
              <p className="text-[9px] text-muted-foreground leading-none font-sans tracking-wide">Creative Caricature Club</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors flex-shrink-0 border border-border/40"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {filteredSections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-2.5 mb-1.5 mt-3 font-sans">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              const handleClick = () => {
                if (item.id === "link-workshop-admin") { navigate("/cccworkshop2006"); return; }
                if (item.id === "link-shop-admin") { navigate("/CFCAdmin936"); return; }
                onTabChange(item.id);
              };
              return (
                <motion.button
                  key={item.id}
                  onClick={handleClick}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-xl text-[12.5px] transition-all duration-200 mb-0.5 font-sans relative group",
                    isActive
                      ? "bg-gradient-to-r from-primary/15 to-accent/10 text-foreground font-semibold shadow-sm border border-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-primary to-accent" />
                  )}
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                    isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-md` 
                      : "bg-muted/60 group-hover:bg-muted"
                  )}>
                    <item.icon className={cn(
                      "w-3.5 h-3.5 transition-all",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                  </div>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border/30 space-y-0.5">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-xl text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all font-sans"
          title={collapsed ? "Home" : undefined}
        >
          <div className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center">
            <Home className="w-3.5 h-3.5" />
          </div>
          {!collapsed && <span>Website</span>}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-xl text-[12px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-sans"
          title={collapsed ? "Logout" : undefined}
        >
          <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
