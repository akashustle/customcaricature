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
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PRIMARY_TABS = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "orders", icon: Package },
  { id: "events", icon: Calendar },
  { id: "customers", icon: Users },
  { id: "payments", icon: DollarSign },
  { id: "analytics", icon: BarChart3 },
];

const ALL_SECTIONS = [
  { section: "Main", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package },
    { id: "events", label: "Events", icon: Calendar },
    { id: "payments", label: "Payments", icon: Receipt },
    { id: "invoices", label: "Invoices", icon: FileText },
  ]},
  { section: "Analytics & Intelligence", items: [
    { id: "analytics", label: "Overview", icon: BarChart3 },
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
  { section: "CRM & Support", items: [
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
    { id: "locations", label: "Locations", icon: MapPin },
    { id: "voice", label: "Voice Monitor", icon: Radio },
    { id: "push-center", label: "Push Center", icon: Zap },
    { id: "notify", label: "Notifications", icon: Bell },
    { id: "sessions", label: "Sessions", icon: Monitor },
  ]},
  { section: "Frontend Control", items: [
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
  ]},
  { section: "Team", items: [
    { id: "team", label: "Team Mgmt", icon: Users },
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
    { id: "automation", label: "Automation", icon: Zap },
    { id: "integrations", label: "Integrations", icon: Shield },
    { id: "maintenance", label: "Maintenance", icon: AlertTriangle },
    { id: "settings", label: "Settings", icon: Settings },
  ]},
];

const AdminMobileNav = ({ activeTab, onTabChange }: AdminMobileNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const isPrimaryActive = PRIMARY_TABS.some(t => t.id === activeTab);

  // Find active section label for "More" sheet
  const activeSection = !isPrimaryActive
    ? ALL_SECTIONS.find(s => s.items.some(i => i.id === activeTab))?.section
    : null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
        <div className="flex items-center h-[56px] overflow-x-auto scrollbar-hide px-2">
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                whileTap={{ scale: 0.75 }}
                className="flex items-center justify-center min-w-[52px] w-[52px] h-14 relative flex-shrink-0"
              >
                <tab.icon
                  className={`transition-all duration-200 ${
                    isActive ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                  size={isActive ? 24 : 20}
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

          {/* More button - opens full section sheet */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.75 }}
                className="flex items-center justify-center min-w-[52px] w-[52px] h-14 relative flex-shrink-0"
              >
                <GripHorizontal
                  className={`transition-all duration-200 ${
                    !isPrimaryActive ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                  size={!isPrimaryActive ? 24 : 20}
                  strokeWidth={!isPrimaryActive ? 2.2 : 1.4}
                />
                {!isPrimaryActive && (
                  <motion.div
                    layoutId="admin-insta-dot"
                    className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl px-0 bg-background border-border">
              <ScrollArea className="h-full px-4 pt-2 pb-8">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-base font-bold text-foreground mb-1 px-1">All Admin Sections</h3>
                <p className="text-[11px] text-muted-foreground mb-4 px-1">
                  {activeSection && <span>Current: <span className="text-primary font-medium">{activeSection}</span></span>}
                </p>
                {ALL_SECTIONS.map((section) => {
                  const sectionHasActive = section.items.some(i => i.id === activeTab);
                  return (
                    <div key={section.section} className="mb-5">
                      <div className={cn(
                        "flex items-center gap-2 px-1 mb-2 pb-1 border-b",
                        sectionHasActive ? "border-primary/30" : "border-border/30"
                      )}>
                        <p className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          sectionHasActive ? "text-primary" : "text-muted-foreground/60"
                        )}>
                          {section.section}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {section.items.map((item) => {
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all text-center min-h-[72px] justify-center",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-card border border-border/50 hover:bg-muted/60 active:scale-95"
                              )}
                              onClick={() => { onTabChange(item.id); setMoreOpen(false); }}
                            >
                              <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
                              <span className={cn("text-[10px] font-semibold leading-tight", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="h-8" />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default AdminMobileNav;
