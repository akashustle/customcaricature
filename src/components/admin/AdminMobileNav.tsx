import { 
  LayoutDashboard, Package, Calendar, Users, BarChart3, 
  Settings, MoreHorizontal 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const MORE_TABS = [
  { section: "Main", items: [
    { id: "payments", label: "Payments" },
    { id: "revenue", label: "Revenue" },
    { id: "ai-intelligence", label: "AI Insights" },
  ]},
  { section: "AI & Chat", items: [
    { id: "ai-conversations", label: "AI Chats" },
    { id: "chatbot", label: "AI Training" },
  ]},
  { section: "CRM", items: [
    { id: "crm-pipeline", label: "Pipeline" },
    { id: "enquiries", label: "Enquiries" },
    { id: "support", label: "Support" },
  ]},
  { section: "People", items: [
    { id: "event-users", label: "Event Users" },
    { id: "artists", label: "Artists" },
    { id: "reviews", label: "Reviews" },
  ]},
  { section: "Pricing", items: [
    { id: "pricing", label: "Domestic" },
    { id: "intl-pricing", label: "International" },
  ]},
  { section: "Operations", items: [
    { id: "locations", label: "Locations" },
    { id: "voice", label: "Voice Monitor" },
    { id: "push-center", label: "Push Center" },
    { id: "notify", label: "Notifications" },
    { id: "sessions", label: "Sessions" },
  ]},
  { section: "Content", items: [
    { id: "homepage", label: "Homepage" },
    { id: "blog", label: "Blog" },
    { id: "gallery", label: "Gallery" },
    { id: "hp-reviews", label: "HP Reviews" },
    { id: "brands", label: "Brands" },
    { id: "pages", label: "Pages" },
    { id: "files", label: "Files" },
    { id: "seo", label: "SEO" },
    { id: "calculator", label: "Calculator" },
  ]},
  { section: "System", items: [
    { id: "team", label: "Team" },
    { id: "automation", label: "Automation" },
    { id: "integrations", label: "Integrations" },
    { id: "settings", label: "Settings" },
  ]},
];

const AdminMobileNav = ({ activeTab, onTabChange }: AdminMobileNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const isPrimaryActive = PRIMARY_TABS.some(t => t.id === activeTab);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/20 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {PRIMARY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-0 flex-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[9px] font-medium truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                {tab.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all min-w-0 flex-1",
              !isPrimaryActive ? "text-primary" : "text-muted-foreground"
            )}>
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[9px] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>More</span>
              {!isPrimaryActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0">
            <ScrollArea className="h-full px-4">
              <h3 className="text-sm font-bold mb-4 px-2" style={{ fontFamily: 'Inter, sans-serif' }}>All Sections</h3>
              {MORE_TABS.map((section) => (
                <div key={section.section} className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {section.section}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {section.items.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        size="sm"
                        className="h-9 text-[11px] justify-start rounded-lg"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                        onClick={() => { onTabChange(item.id); setMoreOpen(false); }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default AdminMobileNav;
