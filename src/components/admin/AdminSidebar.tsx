import { 
  Package, Calendar, Receipt, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Home, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  HelpCircle, Shield, Zap, PenTool, Image, FileText, Calculator, Target,
  LayoutDashboard, TrendingUp, UserCheck, Layers, FileQuestion,
  Type, FormInput, Palette, Activity, ShieldCheck, Brain
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
    label: "System",
    items: [
      { id: "automation", icon: Zap, label: "Automation" },
      { id: "integrations", icon: Shield, label: "Integrations" },
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
        "bg-card border-r border-border shadow-sm",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-border">
        <div 
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-md ring-1 ring-border">
            <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <p className="text-[13px] font-bold tracking-tight text-foreground font-sans">Admin</p>
              <p className="text-[9px] text-muted-foreground leading-none font-sans">Creative Caricature Club</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 px-2.5 mb-1 mt-1.5 font-sans">
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
                    "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] transition-all duration-200 mb-0.5 font-sans",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn(
                    "w-[15px] h-[15px] flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-1.5 border-t border-border space-y-0.5">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all font-sans"
          title={collapsed ? "Home" : undefined}
        >
          <Home className="w-[15px] h-[15px] flex-shrink-0" />
          {!collapsed && <span>Website</span>}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
          className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[12px] text-destructive/80 hover:bg-destructive/10 transition-all font-sans"
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
