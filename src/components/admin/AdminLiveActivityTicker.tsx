import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, UserPlus, ShoppingCart, Calendar, CreditCard, MousePointer } from "lucide-react";

type LiveEvent = {
  id: string;
  type: "visit" | "register" | "booking" | "order" | "payment" | "page";
  text: string;
  time: string;
  details?: Record<string, any>;
};

const ICONS: Record<string, any> = {
  visit: Eye,
  register: UserPlus,
  booking: Calendar,
  order: ShoppingCart,
  payment: CreditCard,
  page: MousePointer,
};

const COLORS: Record<string, string> = {
  visit: "text-blue-600",
  register: "text-emerald-600",
  booking: "text-violet-600",
  order: "text-amber-600",
  payment: "text-green-600",
  page: "text-muted-foreground",
};

const AdminLiveActivityTicker = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEvent = (e: LiveEvent) => {
    setEvents(prev => {
      const next = [e, ...prev].slice(0, 50);
      return next;
    });
  };

  useEffect(() => {
    // Seed with recent activity
    const seedRecent = async () => {
      const { data: actions } = await supabase
        .from("app_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15) as any;
      if (actions) {
        const seeded: LiveEvent[] = actions.map((a: any) => {
          const meta = a.metadata || {};
          let type: LiveEvent["type"] = "page";
          let text = "";
          if (a.action_type === "page_view") {
            type = "visit";
            text = `Someone visited ${a.screen || "/"}`;
          } else if (a.action_type === "register") {
            type = "register";
            text = "New user registered";
          } else {
            text = `${a.action_type} on ${a.screen || "app"}`;
          }
          return {
            id: a.id,
            type,
            text,
            time: new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            details: { ...meta, screen: a.screen, device: a.device_info },
          };
        });
        setEvents(seeded);
      }
    };
    seedRecent();

    // Real-time subscriptions
    const ch = supabase
      .channel("admin-live-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "app_actions" }, (payload) => {
        const d = payload.new as any;
        const meta = d.metadata || {};
        let type: LiveEvent["type"] = "page";
        let text = "";
        if (d.action_type === "page_view") {
          type = "visit";
          text = `Visitor on ${d.screen || "/"}`;
        } else {
          text = `${d.action_type} on ${d.screen || "app"}`;
        }
        addEvent({ id: d.id, type, text, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), details: { ...meta, screen: d.screen, device: d.device_info } });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const d = payload.new as any;
        addEvent({ id: d.user_id, type: "register", text: `🆕 ${d.full_name || "Someone"} just registered`, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), details: { name: d.full_name, email: d.email, city: d.city } });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_bookings" }, (payload) => {
        const d = payload.new as any;
        addEvent({ id: d.id, type: "booking", text: `📅 Event booked by ${d.client_name || "someone"} in ${d.city || ""}`, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), details: d });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const d = payload.new as any;
        addEvent({ id: d.id, type: "order", text: `🛒 New order from ${d.customer_name || "someone"} — ₹${d.amount}`, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), details: d });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  if (events.length === 0) return null;

  return (
    <>
      <div className="w-full bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-b border-border/50 overflow-hidden relative h-8">
        <div
          ref={scrollRef}
          className="flex items-center gap-6 animate-[ticker_30s_linear_infinite] whitespace-nowrap h-full px-4"
          style={{ width: "max-content" }}
        >
          {events.concat(events).map((e, i) => {
            const Icon = ICONS[e.type] || Eye;
            return (
              <button
                key={`${e.id}-${i}`}
                onClick={() => setSelectedEvent(e)}
                className="flex items-center gap-1.5 text-[11px] font-sans hover:bg-primary/5 px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <Icon className={`w-3 h-3 ${COLORS[e.type]}`} />
                <span className="text-muted-foreground">{e.text}</span>
                <span className="text-[9px] text-muted-foreground/50">{e.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-display">
              {selectedEvent && (() => { const I = ICONS[selectedEvent.type]; return <I className={`w-4 h-4 ${COLORS[selectedEvent.type]}`} />; })()}
              Activity Details
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <p className="text-sm font-sans">{selectedEvent.text}</p>
              <p className="text-xs text-muted-foreground">Time: {selectedEvent.time}</p>
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  {Object.entries(selectedEvent.details).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2 text-xs font-sans">
                      <span className="text-muted-foreground font-medium min-w-[80px]">{k}:</span>
                      <span className="text-foreground break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLiveActivityTicker;
