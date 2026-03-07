import { 
  Package, Calendar, Receipt, MessageCircle, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Search, Home, GraduationCap, ClipboardList, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "orders", icon: Package, label: "Orders" },
      { id: "events", icon: Calendar, label: "Events" },
      { id: "payments", icon: Receipt, label: "Payments" },
      { id: "analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "ai-conversations", icon: Bot, label: "AI Chats" },
      { id: "chatbot", icon: Settings, label: "AI Bot" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "customers", icon: Users, label: "Customers" },
      { id: "event-users", icon: Users, label: "Event Users" },
      { id: "artists", icon: Star, label: "Artists" },
      { id: "reviews", icon: Star, label: "Reviews" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { id: "pricing", icon: DollarSign, label: "Pricing" },
      { id: "intl-pricing", icon: Globe, label: "Intl Pricing" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "locations", icon: MapPin, label: "Locations" },
      { id: "voice", icon: Radio, label: "Voice" },
      { id: "notify", icon: Bell, label: "Notifications" },
      { id: "sessions", icon: Monitor, label: "Sessions" },
    ],
  },
  {
    label: "System",
    items: [
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
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar transition-all duration-300 z-30",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <img src="/logo.png" alt="CCC" className="w-9 h-9 rounded-xl border-2 border-primary/30 shadow-sm flex-shrink-0" />
          {!collapsed && <span className="font-display text-lg font-bold truncate text-gradient">Admin</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
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
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-sans transition-all duration-200 mb-0.5",
                    isActive
                      ? "sidebar-item-active"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
          title={collapsed ? "Home" : undefined}
        >
          <Home className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Go to Website</span>}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/customcad75"); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-sans text-destructive hover:bg-destructive/10 transition-all"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
