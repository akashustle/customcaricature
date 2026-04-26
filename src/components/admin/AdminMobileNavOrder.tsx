import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Layout, RotateCcw, Save, Smartphone } from "lucide-react";

/**
 * Admin tool: drag-and-drop reorder of the mobile bottom-nav tabs
 * for both the Booking dashboard and the Workshop dashboard.
 *
 * Stored in `admin_site_settings` under the keys:
 *   - booking_nav_order  → { order: string[] }
 *   - workshop_nav_order → { order: string[] }
 *
 * The user dashboards (Dashboard.tsx, WorkshopDashboard.tsx) read these
 * orders via useSiteSettings and render the mobile bottom nav accordingly.
 */

const BOOKING_TABS: Record<string, string> = {
  home: "Home",
  events: "Events",
  orders: "Orders",
  payments: "Pay",
  chat: "Chat",
  profile: "Me",
};

const WORKSHOP_TABS: Record<string, string> = {
  home: "Home",
  profile: "Profile",
  videos: "Videos",
  notifications: "Alerts",
  assignments: "Tasks",
  certificates: "Certs",
  feedback: "Feedback",
};

const DEFAULT_BOOKING = ["home", "events", "orders", "payments", "chat", "profile"];
const DEFAULT_WORKSHOP = ["home", "profile", "videos", "notifications", "assignments", "certificates", "feedback"];

const AdminMobileNavOrder = () => {
  const [bookingOrder, setBookingOrder] = useState<string[]>(DEFAULT_BOOKING);
  const [workshopOrder, setWorkshopOrder] = useState<string[]>(DEFAULT_WORKSHOP);
  const [saving, setSaving] = useState<"booking" | "workshop" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("id, value")
        .in("id", ["booking_nav_order", "workshop_nav_order"]);
      if (data) {
        for (const row of data as any[]) {
          const order = (row.value as any)?.order;
          if (Array.isArray(order) && order.length > 0) {
            if (row.id === "booking_nav_order") {
              // Merge with defaults so any newly-added tab keys still appear.
              const merged = [...order.filter((k: string) => DEFAULT_BOOKING.includes(k)),
                ...DEFAULT_BOOKING.filter(k => !order.includes(k))];
              setBookingOrder(merged);
            }
            if (row.id === "workshop_nav_order") {
              const merged = [...order.filter((k: string) => DEFAULT_WORKSHOP.includes(k)),
                ...DEFAULT_WORKSHOP.filter(k => !order.includes(k))];
              setWorkshopOrder(merged);
            }
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const reorder = (list: string[], from: number, to: number) => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const handleDragEnd = (which: "booking" | "workshop") => (res: DropResult) => {
    if (!res.destination) return;
    if (which === "booking") setBookingOrder(reorder(bookingOrder, res.source.index, res.destination.index));
    else setWorkshopOrder(reorder(workshopOrder, res.source.index, res.destination.index));
  };

  const save = async (which: "booking" | "workshop") => {
    setSaving(which);
    const id = which === "booking" ? "booking_nav_order" : "workshop_nav_order";
    const value = { order: which === "booking" ? bookingOrder : workshopOrder };
    const { error } = await supabase
      .from("admin_site_settings")
      .upsert({ id, value, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Tab order saved", description: "User dashboards will update instantly." });
    }
  };

  const reset = (which: "booking" | "workshop") => {
    if (which === "booking") setBookingOrder([...DEFAULT_BOOKING]);
    else setWorkshopOrder([...DEFAULT_WORKSHOP]);
  };

  const renderList = (
    which: "booking" | "workshop",
    title: string,
    order: string[],
    labels: Record<string, string>,
  ) => (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4" /> {title}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Drag to reorder how tabs appear in the mobile bottom navigation. Changes apply instantly to all users on this dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DragDropContext onDragEnd={handleDragEnd(which)}>
          <Droppable droppableId={`nav-${which}`}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {order.map((key, idx) => (
                  <Draggable key={key} draggableId={key} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card transition-all ${
                          snap.isDragging
                            ? "shadow-lg border-primary ring-2 ring-primary/30"
                            : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium flex-1">{labels[key] || key}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => save(which)} disabled={saving === which} className="flex-1">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving === which ? "Saving…" : "Save Order"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => reset(which)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading nav order…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Layout className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Mobile Bottom Nav — Tab Order</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderList("booking", "Booking Dashboard", bookingOrder, BOOKING_TABS)}
        {renderList("workshop", "Workshop Dashboard", workshopOrder, WORKSHOP_TABS)}
      </div>
    </div>
  );
};

export default AdminMobileNavOrder;
