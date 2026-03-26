import { 
  LayoutDashboard, Package, Calendar, Users, BarChart3, 
  MoreHorizontal, DollarSign, Target, Zap, Bot, Settings,
  ClipboardList, HelpCircle, Star, PenTool, Globe, MapPin,
  Radio, Bell, Monitor, Home as HomeIcon, FileText, Image,
  Shield, Activity, Brain, ShieldCheck, Type, FormInput, Palette,
  Calculator, FileQuestion, Layers, TrendingUp, UserCheck,
  Gift, Ticket, ToggleLeft, AlertTriangle, MessageCircle, Receipt,
  CalendarDays, LineChart, GripHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "events", label: "Events", icon: Calendar },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "analytics", label: "Overview", icon: BarChart3 },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "revenue-target", label: "₹10L Target", icon: Target },
  { id: "ai-intelligence", label: "AI Insights", icon: Zap },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "website-analytics", label: "Web Analytics", icon: LineChart },
  { id: "ai-conversations", label: "AI Chats", icon: Bot },
  { id: "chatbot", label: "AI Training", icon: Settings },
  { id: "live-chat", label: "Live Chat", icon: MessageCircle },
  { id: "quick-questions", label: "Quick Q&A", icon: Brain },
  { id: "crm-pipeline", label: "Pipeline", icon: Target },
  { id: "enquiries", label: "Enquiries", icon: ClipboardList },
  { id: "support", label: "Support", icon: HelpCircle },
  { id: "customers", label: "Customers", icon: Users },
  { id: "event-users", label: "Event Users", icon: UserCheck },
  { id: "artists", label: "Artists", icon: PenTool },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "pricing", label: "Domestic", icon: DollarSign },
  { id: "intl-pricing", label: "International", icon: Globe },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "voice", label: "Voice", icon: Radio },
  { id: "push-center", label: "Push", icon: Zap },
  { id: "notify", label: "Notify", icon: Bell },
  { id: "sessions", label: "Sessions", icon: Monitor },
  { id: "content-editor", label: "Text", icon: Type },
  { id: "form-builder", label: "Forms", icon: FormInput },
  { id: "design-control", label: "Design", icon: Palette },
  { id: "before-after", label: "Before/After", icon: Image },
  { id: "social-links", label: "Social", icon: Globe },
  { id: "homepage", label: "Homepage", icon: HomeIcon },
  { id: "blog", label: "Blog", icon: FileText },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "hp-reviews", label: "HP Reviews", icon: Star },
  { id: "brands", label: "Brands", icon: Shield },
  { id: "pages", label: "Pages", icon: FileQuestion },
  { id: "faqs", label: "FAQs", icon: FileQuestion },
  { id: "files", label: "Files", icon: Layers },
  { id: "seo", label: "SEO", icon: TrendingUp },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "team", label: "Team", icon: Users },
  { id: "colleagues", label: "Colleagues", icon: MessageCircle },
  { id: "admin-monitoring", label: "AI Monitor", icon: Brain },
  { id: "security-dashboard", label: "Security", icon: ShieldCheck },
  { id: "activity-logs", label: "Activity", icon: Activity },
  { id: "referrals", label: "Referrals", icon: Gift },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "feature-gating", label: "Feature Gates", icon: ToggleLeft },
  { id: "automation", label: "Automation", icon: Zap },
  { id: "integrations", label: "Integrations", icon: Shield },
  { id: "maintenance", label: "Maintenance", icon: AlertTriangle },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "link-workshop-admin", label: "Workshop", icon: CalendarDays },
  { id: "link-shop-admin", label: "Shop", icon: GripHorizontal },
];

const AdminMobileNav = ({ activeTab, onTabChange }: AdminMobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (itemId: string) => {
    if (itemId === "link-workshop-admin") {
      navigate("/workshop-admin-panel");
      return;
    }

    if (itemId === "link-shop-admin") {
      navigate("/CFCAdmin936");
      return;
    }

    onTabChange(itemId);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/20">
        <div className="flex items-center h-14 overflow-x-auto px-1 admin-mnav" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          <style>{`.admin-mnav::-webkit-scrollbar { display: none; }`}</style>
          <div className="flex items-center">
            {NAV_ITEMS.map((tab) => {
              const isRouteItem = tab.id === "link-workshop-admin" || tab.id === "link-shop-admin";
              const isActive = isRouteItem
                ? (tab.id === "link-workshop-admin" ? location.pathname.startsWith("/workshop-admin") || location.pathname.startsWith("/cccworkshop2006") : location.pathname.startsWith("/CFCAdmin936") || location.pathname.startsWith("/shop-admin"))
                : activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleItemClick(tab.id)}
                  whileTap={{ scale: 0.8 }}
                  className={cn(
                    "flex items-center justify-center min-w-[48px] w-14 h-14 relative flex-shrink-0",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                  title={tab.label}
                >
                  <tab.icon
                    className={`transition-all duration-200 ${
                      isActive ? "text-foreground" : "text-muted-foreground/45"
                    }`}
                    size={isActive ? 26 : 22}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    fill={isActive && tab.icon === LayoutDashboard ? "currentColor" : "none"}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="admin-insta-dot"
                      className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default AdminMobileNav;
