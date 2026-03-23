import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Package, Calendar, Users, FileText, GraduationCap, ShoppingBag, MessageCircle, Star, Settings, Receipt, MapPin, Bot, Bell, Tag, Percent, Loader2, Clock, BarChart3, PenTool, Zap, Image, Target, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: string;
  icon: any;
  label: string;
  sublabel: string;
  tabTarget: string;
  id?: string;
}

interface TabOption {
  id: string;
  label: string;
}

type PanelType = "main" | "shop" | "workshop" | "artist";

interface AdminSmartSearchProps {
  panelType: PanelType;
  tabs: TabOption[];
  onNavigate: (tab: string, highlightId?: string) => void;
}

const RECENT_KEY_PREFIX = "admin_search_recent_";
const MAX_RECENT = 5;

const TYPE_ICONS: Record<string, any> = {
  Order: Package, Event: Calendar, Customer: Users, Enquiry: MessageCircle,
  Workshop: GraduationCap, Blog: FileText, Product: ShoppingBag, Artist: PenTool,
  Review: Star, Payment: Receipt, Notification: Bell, Category: Tag,
  Coupon: Percent, Invoice: Receipt, "Shop Order": ShoppingBag,
  Video: Image, Assignment: FileText, Certificate: Star, Feedback: MessageCircle,
  Session: Zap, Setting: Settings, "AI Chat": Bot,
};

const AdminSmartSearch = ({ panelType, tabs, onNavigate }: AdminSmartSearchProps) => {
  const [query, setQuery] = useState("");
  const [tabFilter, setTabFilter] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showRecent, setShowRecent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const recentKey = RECENT_KEY_PREFIX + panelType;

  const getRecent = (): string[] => {
    try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; }
  };

  const addRecent = (q: string) => {
    const list = getRecent().filter(r => r !== q);
    list.unshift(q);
    localStorage.setItem(recentKey, JSON.stringify(list.slice(0, MAX_RECENT)));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowRecent(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (query.trim().length < 2) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tabFilter]);

  const performSearch = async (q: string) => {
    setSearching(true);
    setSelectedIdx(-1);
    const all: SearchResult[] = [];

    try {
      if (panelType === "main") await searchMainPanel(q, tabFilter, all);
      else if (panelType === "shop") await searchShopPanel(q, tabFilter, all);
      else if (panelType === "workshop") await searchWorkshopPanel(q, tabFilter, all);
      else if (panelType === "artist") await searchArtistPanel(q, tabFilter, all);
    } catch {}

    setResults(all);
    setSearching(false);
    setOpen(true);
    setShowRecent(false);
  };

  const handleSelect = (r: SearchResult) => {
    addRecent(query);
    onNavigate(r.tabTarget, r.id);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleRecentClick = (recent: string) => {
    setQuery(recent);
    setShowRecent(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && !showRecent) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIdx >= 0 && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowRecent(false);
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const recent = getRecent();
  let flatIdx = -1;

  return (
    <div ref={ref} className="relative w-full max-w-lg">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); if (e.target.value) setOpen(true); else setShowRecent(false); }}
            onFocus={() => { if (query && results.length) setOpen(true); else if (!query && recent.length) setShowRecent(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search everything..."
            className="pl-9 pr-8 h-9 rounded-xl bg-card border-border text-sm"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={tabFilter} onValueChange={setTabFilter}>
          <SelectTrigger className="w-[120px] h-9 rounded-xl text-xs">
            <SelectValue placeholder="All Tabs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tabs</SelectItem>
            {tabs.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {/* Recent searches */}
        {showRecent && !open && recent.length > 0 && !query && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-2 border-b border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Recent Searches</p>
            </div>
            <div className="py-1">
              {recent.map((r, i) => (
                <button key={i} onClick={() => handleRecentClick(r)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 transition-colors truncate">
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search results */}
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-[420px] overflow-y-auto"
          >
            {searching ? (
              <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            ) : (
              <div className="py-1">
                {Object.entries(grouped).map(([type, items]) => {
                  const Icon = TYPE_ICONS[type] || FileText;
                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30">
                        <Icon className="w-3 h-3" /> {type} ({items.length})
                      </div>
                      {items.map((r) => {
                        flatIdx++;
                        const idx = flatIdx;
                        return (
                          <button
                            key={`${r.type}-${r.id || idx}`}
                            onClick={() => handleSelect(r)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                              idx === selectedIdx ? "bg-primary/10" : "hover:bg-accent/10"
                            )}
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <r.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{r.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{r.tabTarget}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN ADMIN PANEL SEARCH ────
async function searchMainPanel(q: string, tabFilter: string, all: SearchResult[]) {
  const searches: PromiseLike<void>[] = [];
  const shouldSearch = (tab: string) => tabFilter === "all" || tabFilter === tab;

  if (shouldSearch("orders")) searches.push(
    supabase.from("orders").select("id, customer_name, customer_email, customer_mobile, status, caricature_type, order_type")
      .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_mobile.ilike.%${q}%,id.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((o: any) => all.push({ type: "Order", icon: Package, label: o.customer_name || "Unnamed", sublabel: `${o.caricature_type} · ${o.status} · ${o.customer_mobile || ""}`, tabTarget: "orders", id: o.id }));
      })
  );

  if (shouldSearch("events")) searches.push(
    supabase.from("event_bookings").select("id, client_name, client_email, client_mobile, event_type, city, status, event_date")
      .or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%,client_mobile.ilike.%${q}%,city.ilike.%${q}%,venue_name.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((e: any) => all.push({ type: "Event", icon: Calendar, label: e.client_name, sublabel: `${e.event_type} · ${e.city} · ${e.event_date} · ${e.status}`, tabTarget: "events", id: e.id }));
      })
  );

  if (shouldSearch("customers")) searches.push(
    supabase.from("profiles").select("user_id, full_name, email, mobile, instagram_id, city, state")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%,instagram_id.ilike.%${q}%,city.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((c: any) => all.push({ type: "Customer", icon: Users, label: c.full_name || "Unknown", sublabel: `${c.email || ""} · ${c.mobile || ""} · ${c.city || ""}`, tabTarget: "customers", id: c.user_id }));
      })
  );

  if (shouldSearch("enquiries")) searches.push(
    supabase.from("enquiries").select("id, name, mobile, email, enquiry_type, status, city, source")
      .or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%,enquiry_number.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((e: any) => all.push({ type: "Enquiry", icon: MessageCircle, label: e.name, sublabel: `${e.enquiry_type} · ${e.status} · ${e.mobile || ""}`, tabTarget: "enquiries", id: e.id }));
      })
  );

  if (shouldSearch("artists")) searches.push(
    supabase.from("artists").select("id, name, email, mobile, experience")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((a: any) => all.push({ type: "Artist", icon: PenTool, label: a.name, sublabel: `${a.email || ""} · ${a.mobile || ""}`, tabTarget: "artists", id: a.id }));
      })
  );

  if (shouldSearch("blog")) searches.push(
    supabase.from("blog_posts").select("id, title, category, author_name")
      .or(`title.ilike.%${q}%,category.ilike.%${q}%,author_name.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((b: any) => all.push({ type: "Blog", icon: FileText, label: b.title, sublabel: `${b.category} · ${b.author_name}`, tabTarget: "blog", id: b.id }));
      })
  );

  if (shouldSearch("reviews")) searches.push(
    supabase.from("homepage_reviews").select("id, reviewer_name, review_text, rating")
      .or(`reviewer_name.ilike.%${q}%,review_text.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((r: any) => all.push({ type: "Review", icon: Star, label: r.reviewer_name, sublabel: `⭐${r.rating} · ${(r.review_text || "").slice(0, 50)}`, tabTarget: "hp-reviews", id: r.id }));
      })
  );

  if (shouldSearch("payments")) searches.push(
    supabase.from("invoices").select("id, customer_name, customer_email, invoice_number, status, total_amount")
      .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,invoice_number.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((inv: any) => all.push({ type: "Payment", icon: Receipt, label: inv.customer_name, sublabel: `${inv.invoice_number} · ₹${inv.total_amount} · ${inv.status}`, tabTarget: "payments", id: inv.id }));
      })
  );

  if (shouldSearch("ai-conversations")) searches.push(
    supabase.from("ai_chat_sessions").select("id, guest_name, guest_email, status")
      .or(`guest_name.ilike.%${q}%,guest_email.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((s: any) => all.push({ type: "AI Chat", icon: Bot, label: s.guest_name || "Anonymous", sublabel: `${s.guest_email || ""} · ${s.status}`, tabTarget: "ai-conversations", id: s.id }));
      })
  );

  await Promise.all(searches);
}

// ─── SHOP ADMIN PANEL SEARCH ────
async function searchShopPanel(q: string, tabFilter: string, all: SearchResult[]) {
  const searches: PromiseLike<void>[] = [];
  const shouldSearch = (tab: string) => tabFilter === "all" || tabFilter === tab;

  if (shouldSearch("products")) searches.push(
    supabase.from("shop_products").select("id, name, sku, category_id, brand, price")
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%,id.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((p: any) => all.push({ type: "Product", icon: ShoppingBag, label: p.name, sublabel: `₹${p.price} · SKU: ${p.sku || "N/A"} · ${p.brand || ""}`, tabTarget: "products", id: p.id }));
      })
  );

  if (shouldSearch("orders")) searches.push(
    supabase.from("shop_orders").select("id, order_number, customer_name, customer_email, customer_phone, status, total_amount")
      .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%,order_number.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((o: any) => all.push({ type: "Shop Order", icon: Package, label: o.customer_name || "Guest", sublabel: `${o.order_number} · ₹${o.total_amount} · ${o.status}`, tabTarget: "orders", id: o.id }));
      })
  );

  if (shouldSearch("categories")) searches.push(
    supabase.from("shop_categories").select("id, name, slug")
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((c: any) => all.push({ type: "Category", icon: Tag, label: c.name, sublabel: c.slug, tabTarget: "categories", id: c.id }));
      })
  );

  if (shouldSearch("coupons")) searches.push(
    supabase.from("shop_coupons").select("id, code, discount_type, discount_value, is_active")
      .or(`code.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((c: any) => all.push({ type: "Coupon", icon: Percent, label: c.code, sublabel: `${c.discount_type} · ${c.discount_value} · ${c.is_active ? "Active" : "Inactive"}`, tabTarget: "coupons", id: c.id }));
      })
  );

  if (shouldSearch("reviews")) searches.push(
    supabase.from("shop_product_reviews").select("id, reviewer_name, review_text, rating")
      .or(`reviewer_name.ilike.%${q}%,review_text.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((r: any) => all.push({ type: "Review", icon: Star, label: r.reviewer_name || "Anonymous", sublabel: `⭐${r.rating} · ${(r.review_text || "").slice(0, 50)}`, tabTarget: "reviews", id: r.id }));
      })
  );

  if (shouldSearch("invoices")) searches.push(
    supabase.from("invoices").select("id, customer_name, invoice_number, status, total_amount")
      .eq("invoice_type", "shop_order")
      .or(`customer_name.ilike.%${q}%,invoice_number.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((inv: any) => all.push({ type: "Invoice", icon: Receipt, label: inv.customer_name, sublabel: `${inv.invoice_number} · ₹${inv.total_amount}`, tabTarget: "invoices", id: inv.id }));
      })
  );

  await Promise.all(searches);
}

// ─── WORKSHOP ADMIN PANEL SEARCH ────
async function searchWorkshopPanel(q: string, tabFilter: string, all: SearchResult[]) {
  const searches: PromiseLike<void>[] = [];
  const shouldSearch = (tab: string) => tabFilter === "all" || tabFilter === tab;

  if (shouldSearch("all-users") || shouldSearch("registered") || shouldSearch("manual")) searches.push(
    supabase.from("workshop_users" as any).select("id, name, email, mobile, slot, student_type, workshop_date")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`)
      .limit(8).then(({ data }) => {
        (data as any[])?.forEach((w: any) => all.push({ type: "Workshop", icon: GraduationCap, label: w.name, sublabel: `${w.email || ""} · ${w.mobile || ""} · ${w.slot || ""} · ${w.student_type || ""}`, tabTarget: "all-users", id: w.id }));
      })
  );

  if (shouldSearch("videos")) searches.push(
    supabase.from("workshop_videos" as any).select("id, title, video_type, slot")
      .ilike("title", `%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((v: any) => all.push({ type: "Video", icon: Image, label: v.title, sublabel: `${v.video_type} · ${v.slot || "all"}`, tabTarget: "videos", id: v.id }));
      })
  );

  if (shouldSearch("assignments")) searches.push(
    supabase.from("workshop_assignments" as any).select("id, title, workshop_users(name)")
      .ilike("title", `%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((a: any) => all.push({ type: "Assignment", icon: FileText, label: a.title || "Untitled", sublabel: a.workshop_users?.name || "", tabTarget: "assignments", id: a.id }));
      })
  );

  if (shouldSearch("feedback")) searches.push(
    supabase.from("workshop_feedback" as any).select("id, feedback_text, workshop_users(name)")
      .ilike("feedback_text", `%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((f: any) => all.push({ type: "Feedback", icon: MessageCircle, label: f.workshop_users?.name || "Anonymous", sublabel: (f.feedback_text || "").slice(0, 60), tabTarget: "feedback", id: f.id }));
      })
  );

  if (shouldSearch("live")) searches.push(
    supabase.from("workshop_live_sessions" as any).select("id, title, artist_name, session_date")
      .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        (data as any[])?.forEach((s: any) => all.push({ type: "Session", icon: Zap, label: s.title || "Untitled", sublabel: `${s.artist_name || ""} · ${s.session_date || ""}`, tabTarget: "live", id: s.id }));
      })
  );

  await Promise.all(searches);
}

// ─── ARTIST DASHBOARD SEARCH ────
async function searchArtistPanel(q: string, tabFilter: string, all: SearchResult[]) {
  const searches: PromiseLike<void>[] = [];
  const shouldSearch = (tab: string) => tabFilter === "all" || tabFilter === tab;

  if (shouldSearch("events")) searches.push(
    supabase.from("event_bookings").select("id, client_name, event_type, city, venue_name, event_date, status")
      .or(`client_name.ilike.%${q}%,city.ilike.%${q}%,venue_name.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((e: any) => all.push({ type: "Event", icon: Calendar, label: e.client_name, sublabel: `${e.event_type} · ${e.city} · ${e.event_date}`, tabTarget: "events", id: e.id }));
      })
  );

  if (shouldSearch("orders")) searches.push(
    supabase.from("orders").select("id, customer_name, status, caricature_type, customer_mobile")
      .or(`customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%,id.ilike.%${q}%`)
      .limit(5).then(({ data }) => {
        data?.forEach((o: any) => all.push({ type: "Order", icon: Package, label: o.customer_name, sublabel: `${o.caricature_type} · ${o.status}`, tabTarget: "orders", id: o.id }));
      })
  );

  await Promise.all(searches);
}

export default AdminSmartSearch;
