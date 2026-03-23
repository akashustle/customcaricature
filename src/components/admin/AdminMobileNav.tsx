import { 
  LayoutDashboard, Package, Calendar, Users, BarChart3, 
  MoreHorizontal, DollarSign, Target, Zap, Bot, Settings,
  ClipboardList, HelpCircle, Star, PenTool, Globe, MapPin,
  Radio, Bell, Monitor, Home as HomeIcon, FileText, Image,
  Shield, Activity, Brain, ShieldCheck, Type, FormInput, Palette,
  Calculator, FileQuestion, Layers, TrendingUp, UserCheck,
  Gift, Ticket, ToggleLeft, AlertTriangle, MessageCircle, Receipt
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
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "orders", icon: Package, label: "Orders" },
  { id: "events", icon: Calendar, label: "Events" },
  { id: "customers", icon: Users, label: "Users" },
  { id: "analytics", icon: BarChart3, label: "Stats" },
];

const MORE_SECTIONS = [
  { section: "Analytics", icon: TrendingUp, items: [
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "revenue-target", label: "₹10L Target", icon: Target },
    { id: "ai-intelligence", label: "AI Insights", icon: Zap },
  ]},
  { section: "AI & Chat", icon: Bot, items: [
    { id: "ai-conversations", label: "AI Chats", icon: Bot },
    { id: "chatbot", label: "AI Training", icon: Settings },
    { id: "live-chat", label: "Live Chat", icon: MessageCircle },
  ]},
  { section: "CRM", icon: Target, items: [
    { id: "crm-pipeline", label: "Pipeline", icon: Target },
    { id: "enquiries", label: "Enquiries", icon: ClipboardList },
    { id: "support", label: "Support", icon: HelpCircle },
  ]},
  { section: "People", icon: Users, items: [
    { id: "event-users", label: "Event Users", icon: UserCheck },
    { id: "artists", label: "Artists", icon: PenTool },
    { id: "reviews", label: "Reviews", icon: Star },
  ]},
  { section: "Pricing", icon: DollarSign, items: [
    { id: "pricing", label: "Domestic", icon: DollarSign },
    { id: "intl-pricing", label: "International", icon: Globe },
  ]},
  { section: "Operations", icon: Settings, items: [
    { id: "locations", label: "Locations", icon: MapPin },
    { id: "voice", label: "Voice Monitor", icon: Radio },
    { id: "push-center", label: "Push Center", icon: Zap },
    { id: "notify", label: "Notifications", icon: Bell },
    { id: "sessions", label: "Sessions", icon: Monitor },
  ]},
  { section: "Frontend", icon: Palette, items: [
    { id: "content-editor", label: "Text Editor", icon: Type },
    { id: "form-builder", label: "Forms", icon: FormInput },
    { id: "design-control", label: "Design", icon: Palette },
  ]},
  { section: "Content", icon: FileText, items: [
    { id: "homepage", label: "Homepage", icon: HomeIcon },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "hp-reviews", label: "HP Reviews", icon: Star },
    { id: "brands", label: "Brands", icon: Shield },
    { id: "pages", label: "Pages", icon: FileQuestion },
    { id: "files", label: "Files", icon: Layers },
    { id: "seo", label: "SEO", icon: TrendingUp },
    { id: "calculator", label: "Calculator", icon: Calculator },
  ]},
  { section: "Security", icon: ShieldCheck, items: [
    { id: "admin-monitoring", label: "AI Monitor", icon: Brain },
    { id: "security-dashboard", label: "Security", icon: ShieldCheck },
    { id: "activity-logs", label: "Activity", icon: Activity },
  ]},
  { section: "System", icon: Settings, items: [
    { id: "team", label: "Team", icon: Users },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "integrations", label: "Integrations", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ]},
];

const AdminMobileNav = ({ activeTab, onTabChange }: AdminMobileNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const isPrimaryActive = PRIMARY_TABS.some(t => t.id === activeTab);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-stretch justify-evenly px-1 max-w-lg mx-auto">
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2.5 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-bar"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-primary/10" : ""
                }`}>
                  <tab.icon
                    className={`w-[22px] h-[22px] transition-all duration-200 ${
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span className={`text-[10px] leading-none font-medium transition-all duration-200 ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground/50"
                }`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2.5 relative"
              >
                {!isPrimaryActive && (
                  <motion.div
                    layoutId="admin-nav-bar"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                  !isPrimaryActive ? "bg-primary/10" : ""
                }`}>
                  <MoreHorizontal className={`w-[22px] h-[22px] ${!isPrimaryActive ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                <span className={`text-[10px] leading-none font-medium ${!isPrimaryActive ? "text-primary font-bold" : "text-muted-foreground/50"}`}>
                  More
                </span>
              </motion.button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl px-0 bg-background border-border">
              <ScrollArea className="h-full px-4 pt-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-foreground mb-4 px-1">All Sections</h3>
                {MORE_SECTIONS.map((section) => (
                  <div key={section.section} className="mb-4">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <section.icon className="w-3 h-3 text-primary/50" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {section.section}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {section.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center",
                              isActive
                                ? "bg-primary/10 border border-primary/20 shadow-sm"
                                : "bg-card border border-border hover:bg-muted/60"
                            )}
                            onClick={() => { onTabChange(item.id); setMoreOpen(false); }}
                          >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("text-[10px] font-medium leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
