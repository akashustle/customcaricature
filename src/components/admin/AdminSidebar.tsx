import { 
  Package, Calendar, Receipt, MessageCircle, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Search, Home, GraduationCap, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  HelpCircle, FileQuestion, Shield, Zap, PenTool, Image, FileText, Calculator
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
    label: "Dashboard",
    items: [
      { id: "orders", icon: Package, label: "Orders", accent: "hsl(22 78% 52%)" },
      { id: "events", icon: Calendar, label: "Events", accent: "hsl(210 62% 48%)" },
      { id: "payments", icon: Receipt, label: "Payments", accent: "hsl(152 55% 40%)" },
      { id: "analytics", icon: BarChart3, label: "Analytics", accent: "hsl(280 55% 55%)" },
    ],
  },
  {
    label: "AI & Chat",
    items: [
      { id: "ai-conversations", icon: Bot, label: "AI Chats", accent: "hsl(270 50% 55%)" },
      { id: "chatbot", icon: Settings, label: "AI Training", accent: "hsl(190 60% 50%)" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "customers", icon: Users, label: "Customers", accent: "hsl(22 78% 52%)" },
      { id: "event-users", icon: Users, label: "Event Users", accent: "hsl(38 88% 50%)" },
      { id: "artists", icon: PenTool, label: "Artists", accent: "hsl(340 55% 58%)" },
      { id: "reviews", icon: Star, label: "Reviews", accent: "hsl(38 70% 58%)" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { id: "pricing", icon: DollarSign, label: "Domestic", accent: "hsl(152 55% 40%)" },
      { id: "intl-pricing", icon: Globe, label: "International", accent: "hsl(210 62% 48%)" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "locations", icon: MapPin, label: "Locations", accent: "hsl(15 65% 55%)" },
      { id: "voice", icon: Radio, label: "Voice Monitor", accent: "hsl(340 55% 58%)" },
      { id: "notify", icon: Bell, label: "Notifications", accent: "hsl(38 88% 50%)" },
      { id: "sessions", icon: Monitor, label: "Sessions", accent: "hsl(270 50% 55%)" },
    ],
  },
  {
    label: "CRM",
    items: [
      { id: "enquiries", icon: ClipboardList, label: "Enquiries", accent: "hsl(22 78% 52%)" },
      { id: "support", icon: HelpCircle, label: "Support", accent: "hsl(210 62% 48%)" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "blog", icon: FileQuestion, label: "Blog", accent: "hsl(280 55% 55%)" },
      { id: "gallery", icon: Image, label: "Gallery", accent: "hsl(340 55% 58%)" },
      { id: "hp-reviews", icon: Star, label: "HP Reviews", accent: "hsl(38 70% 58%)" },
      { id: "brands", icon: Shield, label: "Brands", accent: "hsl(210 62% 48%)" },
      { id: "pages", icon: FileText, label: "Pages", accent: "hsl(200 55% 50%)" },
      { id: "files", icon: FileQuestion, label: "Files", accent: "hsl(175 55% 45%)" },
      { id: "seo", icon: Zap, label: "SEO", accent: "hsl(152 55% 40%)" },
      { id: "calculator", icon: Calculator, label: "Calculator", accent: "hsl(22 78% 52%)" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "integrations", icon: Zap, label: "Integrations", accent: "hsl(175 55% 45%)" },
      { id: "settings", icon: Settings, label: "Settings", accent: "hsl(28 14% 40%)" },
    ],
  },
];

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 admin-glass-sidebar transition-all duration-300 z-30",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(22,78%,52%)] to-[hsl(28,14%,16%)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>C</span>
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <p className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(28,18%,14%)' }}>Admin Console</p>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Creative Caricature Club</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/10 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 px-3 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
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
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 mb-0.5",
                    isActive
                      ? "bg-foreground/[0.06] font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  )}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  title={collapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                    isActive ? "text-white shadow-sm" : "bg-transparent"
                  )} style={isActive ? { background: item.accent } : {}}>
                    <item.icon className={cn("w-3.5 h-3.5", !isActive && "text-muted-foreground")} />
                  </div>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: item.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border/20 space-y-0.5">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] transition-all"
          style={{ fontFamily: 'Inter, sans-serif' }}
          title={collapsed ? "Home" : undefined}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Go to Website</span>}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-destructive hover:bg-destructive/5 transition-all"
          style={{ fontFamily: 'Inter, sans-serif' }}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
