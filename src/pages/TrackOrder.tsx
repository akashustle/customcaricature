import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { Search, Package, ArrowLeft, Clock, CreditCard, Truck, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_STEPS = [
  { key: "new", label: "Order Placed", icon: Package },
  { key: "in_progress", label: "In Progress", icon: Clock },
  { key: "artwork_ready", label: "Artwork Ready", icon: CheckCircle },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const STATUS_INDEX: Record<string, number> = {
  new: 0, in_progress: 1, artwork_ready: 2, dispatched: 3, delivered: 4, completed: 4,
};

type TrackedOrder = {
  id: string;
  order_type: string;
  style: string;
  amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  expected_delivery_date: string | null;
  customer_name: string;
  face_count: number;
};

const TrackOrder = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setSearched(true);
    setOrder(null);

    const searchId = orderId.trim().toLowerCase();
    
    // Use secure RPC function for tracking - supports short ID or full UUID
    const { data, error } = await supabase.rpc("track_order", { order_id_input: searchId });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      toast({ title: "Order Not Found", description: "Please check your Order ID and try again.", variant: "destructive" });
    } else {
      const orderData = Array.isArray(data) ? data[0] : data;
      setOrder(orderData as any);
    }
    setLoading(false);
  };

  const getDeliveryDate = (order: TrackedOrder) => {
    if (order.expected_delivery_date) return new Date(order.expected_delivery_date);
    const created = new Date(order.created_at);
    created.setDate(created.getDate() + 28);
    return created;
  };

  const currentStep = order ? (STATUS_INDEX[order.status] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">Track Your Order</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <Package className="w-12 h-12 text-primary mx-auto mb-2" />
            <CardTitle className="font-display text-xl">Track Order</CardTitle>
            <CardDescription className="font-sans">Enter your Order ID to check status</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="flex gap-2">
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. A1B2C3D4)"
                className="font-mono"
              />
              <Button type="submit" disabled={loading || !orderId.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {order && (
          <Card className="mt-6">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="font-sans font-semibold capitalize">{order.order_type} Caricature — {order.style}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    Ordered: {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <p className="font-display text-lg font-bold text-primary">{formatPrice(order.amount)}</p>
              </div>

              <div className="flex gap-2">
                <Badge className={`${order.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} border-none text-xs`}>
                  <CreditCard className="w-3 h-3 mr-1" />
                  Payment: {order.payment_status === "confirmed" ? "Confirmed ✅" : "Pending"}
                </Badge>
              </div>

              {/* Timeline */}
              <div className="space-y-1">
                <p className="font-sans font-semibold text-sm mb-3">Order Progress</p>
                <div className="space-y-4">
                  {STATUS_STEPS.map((step, i) => {
                    const isCompleted = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-sans text-sm ${isCompleted ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</p>
                        </div>
                        {isCurrent && <Badge className="bg-primary/10 text-primary border-none text-xs">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="border-t border-border pt-4">
                <p className="font-sans text-sm text-muted-foreground">Expected Delivery</p>
                <p className="font-sans font-semibold">
                  {getDeliveryDate(order).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                {!["delivered", "completed"].includes(order.status) && (
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    {Math.max(0, Math.ceil((getDeliveryDate(order).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {searched && !order && !loading && (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-sans text-muted-foreground">No order found with that ID</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
