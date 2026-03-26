import { useState } from "react";
import { 
  LayoutDashboard, Package, Calendar, Users, BarChart3, 
  MoreHorizontal, DollarSign, Target, Zap, Bot, Settings,
  ClipboardList, HelpCircle, Star, PenTool, Globe, MapPin,
  Radio, Bell, Monitor, Home as HomeIcon, FileText, Image,
  Shield, Activity, Brain, ShieldCheck, Type, FormInput, Palette,
  Calculator, FileQuestion, Layers, TrendingUp, UserCheck,
  Gift, Ticket, ToggleLeft, AlertTriangle, MessageCircle, Receipt,
  CalendarDays, LineChart, GripHorizontal, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PRIMARY_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "events", label: "Events", icon: Calendar },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const MORE_ITEMS = [
  { section: "Analytics", items: [
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "revenue-target", label: "₹10L Target", icon: Target },
    { id: "ai-intelligence", label: "AI Insights", icon: Zap },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "website-analytics", label: "Web Analytics", icon: LineChart },
  ]},
  { section: "AI & Chat", items: [
    { id: "ai-conversations", label: "AI Chats", icon: Bot },
    { id: "chatbot", label: "AI Training", icon: Settings },
    { id: "live-chat", label: "Live Chat", icon: MessageCircle },
    { id: "quick-questions", label: "Quick Q&A", icon: Brain },
  ]},
  { section: "CRM", items: [
    { id: "crm-pipeline", label: "Pipeline", icon: Target },
    { id: "enquiries", label: "Enquiries", icon: ClipboardList },
    { id: "support", label: "Support", icon: HelpCircle },
  ]},
  { section: "People", items: [
    { id: "customers", label: "Customers", icon: Users },
    { id: "event-users", label: "Event Users", icon: UserCheck },
    { id: "artists", label: "Artists", icon: PenTool },
    { id: "reviews", label: "Reviews", icon: Star },
  ]},
  { section: "Pricing", items: [
    { id: "pricing", label: "Domestic", icon: DollarSign },
    { id: "intl-pricing", label: "International", icon: Globe },
  ]},
  { section: "Operations", items: [
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "locations", label: "Locations", icon: MapPin },
    { id: "voice", label: "Voice", icon: Radio },
    { id: "push-center", label: "Push", icon: Zap },
    { id: "notify", label: "Notify", icon: Bell },
    { id: "sessions", label: "Sessions", icon: Monitor },
  ]},
  { section: "Frontend", items: [
    { id: "content-editor", label: "Text Editor", icon: Type },
    { id: "form-builder", label: "Forms", icon: FormInput },
    { id: "design-control", label: "Design", icon: Palette },
  ]},
  { section: "Content", items: [
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
    { id: "before-after", label: "Before/After", icon: Image },
    { id: "social-links", label: "Social", icon: Globe },
  ]},
  { section: "Team", items: [
    { id: "team", label: "Team", icon: Users },
    { id: "colleagues", label: "Colleagues", icon: MessageCircle },
  ]},
  { section: "Security", items: [
    { id: "admin-monitoring", label: "AI Monitor", icon: Brain },
    { id: "security-dashboard", label: "Security", icon: ShieldCheck },
    { id: "activity-logs", label: "Activity", icon: Activity },
  ]},
  { section: "Marketing", items: [
    { id: "referrals", label: "Referrals", icon: Gift },
    { id: "coupons", label: "Coupons", icon: Ticket },
    { id: "feature-gating", label: "Feature Gates", icon: ToggleLeft },
  ]},
  { section: "System", items: [
    { id: "google-sheet", label: "G-Sheet", icon: Globe },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "integrations", label: "Integrations", icon: Shield },
    { id: "maintenance", label: "Maintenance", icon: AlertTriangle },
    { id: "settings", label: "Settings", icon: Settings },
  ]},
  { section: "Other Panels", items: [
    { id: "link-workshop-admin", label: "Workshop", icon: CalendarDays },
    { id: "link-shop-admin", label: "Shop", icon: GripHorizontal },
  ]},
];

const AdminMobileNav = ({ activeTab, onTabChange }: AdminMobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const handleItemClick = (itemId: string) => {
    if (itemId === "link-workshop-admin") { navigate("/workshop-admin-panel"); return; }
    if (itemId === "link-shop-admin") { navigate("/CFCAdmin936"); return; }
    onTabChange(itemId);
    setShowMore(false);
  };

  // Check if active tab is in "More" items
  const isMoreActive = MORE_ITEMS.some(s => s.items.some(i => i.id === activeTab));

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div style={{ background: "hsla(0,0%,100%,0.82)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderTop: "1px solid hsl(30 18% 92%)" }}>
          <div className="flex items-center justify-evenly h-[56px] px-1">
            {PRIMARY_ITEMS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleItemClick(tab.id)}
                  whileTap={{ scale: 0.75 }}
                  className="flex items-center justify-center min-w-[48px] w-14 h-14 relative flex-shrink-0"
                >
                  <tab.icon
                    className={`transition-all duration-200 ${
                      isActive ? "text-foreground" : "text-muted-foreground/40"
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
            {/* More Button */}
            <motion.button
              onClick={() => setShowMore(true)}
              whileTap={{ scale: 0.75 }}
              className="flex items-center justify-center min-w-[48px] w-14 h-14 relative flex-shrink-0"
            >
              <MoreHorizontal
                className={`transition-all duration-200 ${
                  isMoreActive || showMore ? "text-foreground" : "text-muted-foreground/40"
                }`}
                size={isMoreActive ? 26 : 22}
                strokeWidth={isMoreActive ? 2.2 : 1.4}
              />
              {isMoreActive && (
                <motion.div
                  className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground"
                />
              )}
            </motion.button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* More Bottom Sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[60] backdrop-blur-sm"
              style={{ background: "hsla(0,0%,0%,0.15)" }}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
              style={{ background: "hsla(0,0%,100%,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: "1px solid hsl(30 18% 90%)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <h3 className="text-sm font-bold text-foreground">All Modules</h3>
                <button onClick={() => setShowMore(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pb-8">
                {MORE_ITEMS.map((section) => (
                  <div key={section.section} className="px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1 mb-2">
                      {section.section}
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {section.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item.id)}
                            className={cn(
                              "flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all",
                              isActive
                                ? "bg-primary/10 text-foreground"
                                : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <item.icon size={20} strokeWidth={isActive ? 2 : 1.4} />
                            <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminMobileNav;
