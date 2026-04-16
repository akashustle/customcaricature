import { useState } from "react";
import { Info, X, Search, ChevronDown, ChevronRight, Settings, Package, Calendar, Users, CreditCard, BarChart3, Globe, Bell, Shield, Bot, FileText, Image, MessageCircle, Target, Palette, Zap, Database, MapPin, Radio, Receipt, GraduationCap, Store, Megaphone, ClipboardList, HelpCircle, Link2, Percent, Wrench, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const ADMIN_GUIDE = [
  {
    category: "📊 Dashboard & Analytics",
    icon: BarChart3,
    items: [
      { name: "Premium Dashboard", tab: "dashboard", desc: "Overview with revenue, orders, events, and customer stats. Real-time widgets with drill-down." },
      { name: "Analytics", tab: "analytics", desc: "Detailed charts for orders, revenue, customer growth over time." },
      { name: "Website Analytics", tab: "website-analytics", desc: "Visitor tracking, page views, bounce rate, device breakdown, live heatmap." },
      { name: "Revenue Dashboard", tab: "revenue", desc: "Monthly/yearly revenue breakdown, payment method split, P&L overview." },
      { name: "Revenue Target Tracker", tab: "revenue-targets", desc: "Set monthly targets (default ₹10L), track daily/weekly goals." },
      { name: "Live Activity Ticker", tab: "live-activity", desc: "Real-time scrolling ticker of all platform actions (orders, payments, signups)." },
      { name: "Heatmap", tab: "heatmap", desc: "Geographic visualization of orders, events, and enquiries across India." },
    ]
  },
  {
    category: "📦 Orders & Products",
    icon: Package,
    items: [
      { name: "Orders Management", tab: "orders", desc: "View, filter, update status, assign artists, upload artwork, negotiate pricing." },
      { name: "Caricature Types", tab: "orders (sub-section)", desc: "Manage caricature styles, pricing, face limits. Under Orders tab." },
      { name: "Artwork Upload Flow", tab: "artwork", desc: "Upload finished artwork photos for customer approval before dispatch." },
      { name: "Media Audit Log", tab: "media-audit", desc: "Track all media uploads/deletes by admin users." },
    ]
  },
  {
    category: "🎉 Events",
    icon: Calendar,
    items: [
      { name: "Events Management", tab: "events", desc: "All event bookings, assign artists, manage dates, negotiate pricing." },
      { name: "Calendar", tab: "calendar", desc: "Interactive calendar view of events, blocked dates, artist availability." },
      { name: "Event Pricing (Regional)", tab: "Settings > Quick Controls", desc: "Mumbai vs Pan-India rates. Set under regional pricing settings." },
      { name: "International Pricing", tab: "international-pricing", desc: "Country-specific event pricing with custom rates." },
      { name: "Blocked Dates", tab: "events (sub-section)", desc: "Block dates to prevent bookings. Max 3 events per date." },
    ]
  },
  {
    category: "👥 Customers & CRM",
    icon: Users,
    items: [
      { name: "Customers", tab: "customers", desc: "All registered users, profiles, event booking permissions, custom pricing." },
      { name: "Customer Pricing", tab: "customer-pricing (per user)", desc: "Set custom caricature prices per customer. Access via customer row actions." },
      { name: "Customer Event Pricing", tab: "customer-event-pricing (per user)", desc: "Custom event rates per customer. Access via customer row actions." },
      { name: "Partial Advance Config", tab: "partial-advance (per user)", desc: "Split advance into 2 parts for specific customers." },
      { name: "CRM Pipeline", tab: "crm", desc: "Kanban-style lead management, follow-ups, conversion tracking." },
      { name: "Enquiries", tab: "enquiries", desc: "All enquiry submissions with status, region, estimated price." },
      { name: "Lead Links", tab: "lead-links", desc: "Generate one-time-use URLs with custom pricing overrides." },
      { name: "Referrals", tab: "referrals", desc: "Referral tracking and management." },
    ]
  },
  {
    category: "💰 Payments & Finance",
    icon: CreditCard,
    items: [
      { name: "Payments", tab: "payments", desc: "All payment history, Razorpay transactions, refunds." },
      { name: "Invoices", tab: "invoices", desc: "Auto-generated invoices for orders and events. Download/print." },
      { name: "Accounting", tab: "accounting", desc: "P&L statements, balance sheets, monthly financial breakdown." },
      { name: "Coupons", tab: "coupons", desc: "Create discount codes with limits, expiry, user restrictions." },
      { name: "Gateway Charge %", tab: "Settings > Quick Controls", desc: "Set payment gateway fee percentage charged to customers." },
    ]
  },
  {
    category: "🎨 Artists",
    icon: Palette,
    items: [
      { name: "Artists", tab: "artists", desc: "Manage artist profiles, secret codes, portfolios, blocked dates." },
      { name: "Artist Payouts", tab: "artist-payouts", desc: "Configure payout rules (% or fixed), process payout requests." },
      { name: "Auto-Assign", tab: "Settings > Quick Controls", desc: "Enable/disable automatic artist assignment based on scoring." },
      { name: "Artist Matching", tab: "artists (sub-feature)", desc: "Score-based matching considering rating, experience, distance." },
    ]
  },
  {
    category: "🔔 Notifications & Communication",
    icon: Bell,
    items: [
      { name: "Push Center", tab: "push-center", desc: "Send push notifications to all or specific users." },
      { name: "Notification Sender", tab: "notify", desc: "Send in-app notifications to users." },
      { name: "Live Chat", tab: "live-chat", desc: "Real-time chat with customers. View AI chat conversations." },
      { name: "AI Chat Conversations", tab: "ai-conversations", desc: "Review all AI chatbot conversations with customers." },
      { name: "Chatbot Training", tab: "chatbot-training", desc: "Add Q&A pairs to train the AI chatbot." },
      { name: "Quick Questions", tab: "quick-questions", desc: "Pre-set quick reply buttons for live chat." },
      { name: "Automation", tab: "automation", desc: "Automated message templates triggered by events (booking, payment)." },
      { name: "Colleagues Hub", tab: "colleagues", desc: "Internal team communication between admin members." },
    ]
  },
  {
    category: "🌐 Website & Content",
    icon: Globe,
    items: [
      { name: "Homepage Control", tab: "homepage", desc: "Toggle and configure homepage sections (hero, reviews, gallery, etc)." },
      { name: "Content Editor", tab: "content-editor", desc: "Edit text blocks and content across the website." },
      { name: "Blog", tab: "blog", desc: "Create and manage blog posts with SEO settings." },
      { name: "Gallery", tab: "gallery", desc: "Manage caricature gallery images." },
      { name: "Before/After", tab: "before-after", desc: "Manage before/after comparison images." },
      { name: "Homepage Reviews", tab: "hp-reviews", desc: "Curate reviews shown on homepage." },
      { name: "Trusted Brands", tab: "trusted-brands", desc: "Manage brand logos shown on homepage." },
      { name: "Social Links", tab: "social-links", desc: "Configure social media links." },
      { name: "CMS Pages", tab: "pages", desc: "Create custom pages with dynamic content." },
      { name: "FAQs", tab: "faqs", desc: "Manage frequently asked questions." },
      { name: "SEO Settings", tab: "seo", desc: "Meta tags, sitemap, Google indexing controls." },
      { name: "Explore Editor", tab: "explore", desc: "Edit the Explore page content." },
      { name: "Design Control", tab: "design-control", desc: "Theme colors, fonts, UI customization." },
      { name: "Form Builder", tab: "form-builder", desc: "Create and manage custom forms." },
    ]
  },
  {
    category: "🛍️ Shop",
    icon: Store,
    items: [
      { name: "Shop Admin", tab: "Separate page: /shop-admin", desc: "Manage shop products, variants, pricing, orders." },
      { name: "Shop Visibility", tab: "Settings > Quick Controls", desc: "Toggle shop navigation visibility." },
    ]
  },
  {
    category: "🎓 Workshop",
    icon: GraduationCap,
    items: [
      { name: "Workshop Admin", tab: "workshop", desc: "Manage workshops, students, attendance, certificates." },
      { name: "Workshop Dashboard", tab: "Settings > Quick Controls", desc: "Toggle workshop dashboard visibility for users." },
    ]
  },
  {
    category: "🔒 Security & Access",
    icon: Shield,
    items: [
      { name: "Security Dashboard", tab: "security", desc: "Failed logins, blocked IPs, risk scores, security alerts." },
      { name: "Sessions Log", tab: "sessions", desc: "Active admin sessions, login history, device info." },
      { name: "Activity Logs", tab: "activity-logs", desc: "Detailed audit trail of all admin actions." },
      { name: "Team Management", tab: "team", desc: "Manage admin team members and permissions." },
      { name: "Admin Location Required", tab: "Settings > Quick Controls", desc: "Force location access for admin login." },
      { name: "OTP Login", tab: "Settings > Quick Controls", desc: "Enable OTP verification for admin login." },
    ]
  },
  {
    category: "⚙️ Settings & Controls",
    icon: Settings,
    items: [
      { name: "Quick Controls", tab: "settings", desc: "Master toggles for all features: Custom Caricature, Event Booking, Shop, Permissions, Splash Screen, etc." },
      { name: "Custom Caricature Toggle", tab: "Settings > Quick Controls", desc: "Enable/disable custom caricature ordering site-wide." },
      { name: "Event Booking Toggle", tab: "Settings > Quick Controls", desc: "Enable/disable event booking globally." },
      { name: "Permission Controls", tab: "Settings > Quick Controls", desc: "Toggle Location, Notification, Microphone, Camera permission prompts." },
      { name: "Gateway Charge %", tab: "Settings > Quick Controls", desc: "Set the payment gateway fee percentage." },
      { name: "Dashboard Tab Controls", tab: "Settings > Quick Controls", desc: "Show/hide specific tabs in user dashboard." },
      { name: "Splash Screen", tab: "Settings > Quick Controls", desc: "Toggle admin splash screen on login." },
      { name: "Maintenance Mode", tab: "maintenance", desc: "Put website in maintenance mode with custom message." },
      { name: "Feature Gating", tab: "feature-gating", desc: "Control feature access and rollout." },
      { name: "Integrations", tab: "integrations", desc: "Google Sheets, Razorpay, OneSignal, VAPID keys." },
      { name: "Google Sheet Sync", tab: "google-sheet", desc: "Sync data to Google Sheets for backup." },
      { name: "Mini Database", tab: "mini-db", desc: "Mirror database to external Google Sheet." },
      { name: "File Explorer", tab: "files", desc: "Browse and manage uploaded files in storage." },
      { name: "Push Update", tab: "push-update", desc: "Force app update for all users." },
      { name: "Lil Flea", tab: "lil-flea", desc: "Manage Lil Flea event page and gallery." },
      { name: "Calculator History", tab: "calculator", desc: "View pricing calculator usage history." },
    ]
  },
  {
    category: "🤖 AI & Intelligence",
    icon: Bot,
    items: [
      { name: "AI Intelligence", tab: "ai-intelligence", desc: "AI-powered insights, anomaly detection, smart suggestions." },
      { name: "AI Monitoring", tab: "ai-monitoring", desc: "Monitor AI system health and performance." },
      { name: "Voice Monitor", tab: "voice", desc: "Monitor voice stream activity from users." },
    ]
  },
];

const AdminInfoPanel = ({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = ADMIN_GUIDE.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()) ||
      item.tab.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">Admin Panel Guide</h2>
                <p className="text-[10px] text-muted-foreground font-sans">All features, settings & their locations</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features, settings, tabs..."
              className="pl-9 rounded-xl h-9 text-sm"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-sans">
            {ADMIN_GUIDE.reduce((sum, cat) => sum + cat.items.length, 0)} features across {ADMIN_GUIDE.length} categories
          </p>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(85vh-140px)]">
          <div className="p-4 space-y-2">
            {filtered.map((cat) => (
              <div key={cat.category} className="rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <cat.icon className="w-4 h-4 text-primary" />
                    <span className="font-sans text-sm font-semibold">{cat.category}</span>
                    <Badge variant="outline" className="text-[9px] h-4">{cat.items.length}</Badge>
                  </div>
                  {expanded === cat.category ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expanded === cat.category && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-1.5">
                        {cat.items.map((item) => (
                          <div key={item.name} className="rounded-xl bg-muted/20 p-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-sans text-xs font-semibold">{item.name}</p>
                              <Badge className="text-[8px] h-4 bg-primary/10 text-primary border-none">{item.tab}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-sans">No matching features found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
};

export default AdminInfoPanel;
