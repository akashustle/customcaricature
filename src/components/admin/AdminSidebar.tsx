import { 
  Package, Calendar, Receipt, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Home, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  HelpCircle, Shield, Zap, PenTool, Image, FileText, Calculator, Target,
  LayoutDashboard, TrendingUp, UserCheck, Layers, FileQuestion,
  Type, FormInput, Palette, Activity, ShieldCheck, Brain, MessageCircle,
  Gift, Ticket, AlertTriangle, ToggleLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { id: "orders", icon: Package, label: "Orders" },
      { id: "events", icon: Calendar, label: "Events" },
      { id: "payments", icon: Receipt, label: "Payments" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "analytics", icon: BarChart3, label: "Overview" },
      { id: "revenue", icon: DollarSign, label: "Revenue" },
      { id: "revenue-target", icon: Target, label: "₹10L Target" },
      { id: "ai-intelligence", icon: Zap, label: "AI Insights" },
    ],
  },
  {
    label: "AI & Chat",
    items: [
      { id: "ai-conversations", icon: Bot, label: "AI Chats" },
      { id: "chatbot", icon: Settings, label: "AI Training" },
      { id: "live-chat", icon: MessageCircle, label: "Live Chat" },
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
      { id: "customers", icon: Users, label: "Customers" },
      { id: "event-users", icon: UserCheck, label: "Event Users" },
      { id: "artists", icon: PenTool, label: "Artists" },
      { id: "reviews", icon: Star, label: "Reviews" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { id: "pricing", icon: DollarSign, label: "Domestic" },
      { id: "intl-pricing", icon: Globe, label: "International" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "locations", icon: MapPin, label: "Locations" },
      { id: "voice", icon: Radio, label: "Voice Monitor" },
      { id: "push-center", icon: Zap, label: "Push Center" },
      { id: "notify", icon: Bell, label: "Notifications" },
      { id: "sessions", icon: Monitor, label: "Sessions" },
    ],
  },
  {
    label: "Frontend Control",
    items: [
      { id: "content-editor", icon: Type, label: "Text Editor" },
      { id: "form-builder", icon: FormInput, label: "Form Builder" },
      { id: "design-control", icon: Palette, label: "Design" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "homepage", icon: Home, label: "Homepage" },
      { id: "blog", icon: FileText, label: "Blog" },
      { id: "gallery", icon: Image, label: "Gallery" },
      { id: "hp-reviews", icon: Star, label: "HP Reviews" },
      { id: "brands", icon: Shield, label: "Brands" },
      { id: "pages", icon: FileQuestion, label: "Pages" },
      { id: "files", icon: Layers, label: "Files" },
      { id: "seo", icon: TrendingUp, label: "SEO" },
      { id: "calculator", icon: Calculator, label: "Calculator" },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "team", icon: Users, label: "Team" },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "admin-monitoring", icon: Brain, label: "AI Monitor" },
      { id: "security-dashboard", icon: ShieldCheck, label: "Security" },
      { id: "activity-logs", icon: Activity, label: "Activity Logs" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "referrals", icon: Gift, label: "Referrals" },
      { id: "coupons", icon: Ticket, label: "Coupons" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "automation", icon: Zap, label: "Automation" },
      { id: "integrations", icon: Shield, label: "Integrations" },
      { id: "maintenance", icon: AlertTriangle, label: "Maintenance" },
      { id: "settings", icon: Settings, label: "Settings" },
    ],
  },
];

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30",
        "admin-sidebar-dark",
        collapsed ? "w-[68px]" : "w-[250px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06]">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10 ring-offset-1 ring-offset-transparent">
            <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <p className="text-[13px] font-bold tracking-tight text-white/95 font-sans">Admin Panel</p>
              <p className="text-[9px] text-white/35 leading-none font-sans tracking-wide">Creative Caricature Club</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-white/40" /> : <ChevronLeft className="w-3.5 h-3.5 text-white/40" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20 px-2.5 mb-1.5 mt-2 font-sans">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[12.5px] transition-all duration-200 mb-0.5 font-sans relative group",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-white font-semibold shadow-[inset_0_0_20px_rgba(99,102,241,0.08)]"
                      : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-400" />
                  )}
                  <item.icon className={cn(
                    "w-[16px] h-[16px] flex-shrink-0 transition-all",
                    isActive ? "text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]" : "text-white/35 group-hover:text-white/60"
                  )} />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-white/[0.06] space-y-0.5">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[12px] text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all font-sans"
          title={collapsed ? "Home" : undefined}
        >
          <Home className="w-[15px] h-[15px] flex-shrink-0" />
          {!collapsed && <span>Website</span>}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all font-sans"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
