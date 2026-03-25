import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X, Package, Calendar, Users, FileText, GraduationCap, ShoppingBag, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  type: string;
  icon: any;
  label: string;
  sublabel: string;
  tabTarget: string;
  id?: string;
}

interface AdminGlobalSearchProps {
  onNavigate: (tab: string) => void;
}

const AdminGlobalSearch = ({ onNavigate }: AdminGlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query.trim()), 300);
  }, [query]);

  const performSearch = async (q: string) => {
    setSearching(true);
    const lower = q.toLowerCase();
    const all: SearchResult[] = [];

    try {
      // Search orders
      const { data: orders } = await supabase.from("orders").select("id, customer_name, customer_email, status, caricature_type").or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,id.ilike.%${q}%`).limit(5);
      orders?.forEach((o: any) => all.push({ type: "Order", icon: Package, label: o.customer_name, sublabel: `${o.caricature_type} · ${o.status}`, tabTarget: "orders", id: o.id }));

      // Search events
      const { data: events } = await supabase.from("event_bookings").select("id, client_name, client_email, event_type, city, status").or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%,city.ilike.%${q}%`).limit(5);
      events?.forEach((e: any) => all.push({ type: "Event", icon: Calendar, label: e.client_name, sublabel: `${e.event_type} · ${e.city} · ${e.status}`, tabTarget: "events", id: e.id }));

      // Search customers
      const { data: customers } = await supabase.from("profiles").select("user_id, full_name, email, mobile").or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`).limit(5);
      customers?.forEach((c: any) => all.push({ type: "Customer", icon: Users, label: c.full_name, sublabel: `${c.email} · ${c.mobile}`, tabTarget: "customers" }));

      // Search enquiries
      const { data: enquiries } = await supabase.from("enquiries").select("id, name, mobile, enquiry_type, status").or(`name.ilike.%${q}%,mobile.ilike.%${q}%`).limit(5);
      enquiries?.forEach((e: any) => all.push({ type: "Enquiry", icon: MessageCircle, label: e.name, sublabel: `${e.enquiry_type} · ${e.status}`, tabTarget: "enquiries" }));

      // Search workshop users
      const { data: wsUsers } = await supabase.from("workshop_users" as any).select("id, name, email, mobile, slot").or(`name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`).limit(5);
      (wsUsers as any[])?.forEach((w: any) => all.push({ type: "Workshop", icon: GraduationCap, label: w.name, sublabel: `${w.email} · ${w.slot}`, tabTarget: "workshop" }));

      // Search blog posts
      const { data: blogs } = await supabase.from("blog_posts").select("id, title, category").ilike("title", `%${q}%`).limit(5);
      blogs?.forEach((b: any) => all.push({ type: "Blog", icon: FileText, label: b.title, sublabel: b.category, tabTarget: "blog" }));

      // Search shop products
      const { data: products } = await supabase.from("shop_products" as any).select("id, name, category").ilike("name", `%${q}%`).limit(5);
      (products as any[])?.forEach((p: any) => all.push({ type: "Product", icon: ShoppingBag, label: p.name, sublabel: p.category || "Shop", tabTarget: "shop" }));

    } catch {}

    setResults(all);
    setSearching(false);
    setOpen(true);
  };

  // Prevent browser autofill by making input readonly on mount
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.setAttribute("readonly", "true");
      const timer = setTimeout(() => el.removeAttribute("readonly"), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      {/* Hidden honeypot to trap password managers */}
      <input type="text" name="fake_search_trap" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none", tabIndex: -1 }} tabIndex={-1} autoComplete="username" />
      <input type="password" name="fake_pwd_trap" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none", tabIndex: -1 }} tabIndex={-1} autoComplete="current-password" />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          role="searchbox"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value) setOpen(true); }}
          onFocus={() => { if (query && results.length) setOpen(true); }}
          placeholder="Search orders, users, events, workshop..."
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
          data-1p-ignore="true"
          aria-autocomplete="none"
          name="admin_global_search_query"
          id="admin_global_search_input"
          className="flex h-10 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (query.trim().length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto"
          >
            {searching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            ) : (
              <div className="py-1">
                {results.map((r, i) => (
                  <button
                    key={`${r.type}-${i}`}
                    onClick={() => { onNavigate(r.tabTarget); setOpen(false); setQuery(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <r.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.type} · {r.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGlobalSearch;
