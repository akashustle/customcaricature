import { 
  Package, Calendar, Receipt, MessageCircle, Users, DollarSign, 
  BarChart3, Star, MapPin, Radio, Bell, Monitor, Globe, Bot, 
  Settings, Search, Home, GraduationCap, ClipboardList, LogOut, ChevronLeft, ChevronRight, Moon, Sun,
  HelpCircle, FileQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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
    label: "CRM",
    items: [
      { id: "enquiries", icon: FileQuestion, label: "Enquiries" },
      { id: "support", icon: HelpCircle, label: "Support" },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "blog", icon: FileQuestion, label: "Blog" },
      { id: "seo", icon: Globe, label: "SEO" },
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
        "hidden md:flex flex-col h-screen sticky top-0 admin-glass-sidebar transition-all duration-300 z-30",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate("/")}
        >
          <motion.img 
            src="/logo.png" alt="CCC" 
            className="w-10 h-10 rounded-xl border-2 border-primary/30 shadow-sm flex-shrink-0"
            animate={{ y: [0, -2, 0] }} 
            transition={{ duration: 3, repeat: Infinity }}
          />
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="font-body text-lg font-bold text-gradient"
            >
              Admin
            </motion.span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Expand button when collapsed - shows below logo */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1.5">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans transition-all duration-200 mb-0.5",
                    isActive
                      ? "bg-primary/12 text-primary font-bold shadow-sm border border-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary pulse-live" />
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border/30 space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all"
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
