import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, STYLES } from "@/lib/pricing";
import { ArrowLeft, Download } from "lucide-react";

interface Props {
  orderId: string;
  onBack: () => void;
}

type OrderFull = {
  id: string;
  caricature_type: string;
  order_type: string;
  style: string;
  notes: string | null;
  customer_name: string;
  customer_mobile: string;
  customer_email: string;
  face_count: number;
  amount: number;
  country: string | null;
  state: string | null;
  city: string | null;
  district: string | null;
  is_framed: boolean | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_pincode: string | null;
  razorpay_payment_id: string | null;
  payment_verified: boolean | null;
  status: string;
  created_at: string;
};

type OrderImage = {
  id: string;
  storage_path: string;
  file_name: string;
};

const OrderDetail = ({ orderId, onBack }: Props) => {
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [images, setImages] = useState<OrderImage[]>([]);

  useEffect(() => {
    fetchOrder();
    fetchImages();
  }, [orderId]);

  const fetchOrder = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (data) setOrder(data as any);
  };

  const fetchImages = async () => {
    const { data } = await supabase.from("order_images").select("id, storage_path, file_name").eq("order_id", orderId);
    if (data) setImages(data);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  if (!order) return <div className="p-8 text-center font-sans text-muted-foreground">Loading...</div>;

  const styleName = STYLES.find((s) => s.value === order.style)?.label || order.style;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="font-display text-xl font-bold">Order {order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground font-sans">{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 font-sans text-sm">
            <Row label="Name" value={order.customer_name} />
            <Row label="Mobile" value={order.customer_mobile} />
            <Row label="Email" value={order.customer_email} />
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 font-sans text-sm">
            <Row label="Type" value={order.caricature_type === "digital" ? "Digital" : "Physical"} />
            <Row label="Order Type" value={`${order.order_type}${order.order_type === "group" ? ` (${order.face_count} faces)` : ""}`} />
            <Row label="Style" value={styleName} />
            {order.notes && <Row label="Notes" value={order.notes} />}
            <Row label="Amount" value={formatPrice(order.amount)} />
            {order.caricature_type === "physical" && (
              <>
                <Row label="Location" value={`${order.city}, ${order.state}`} />
                <Row label="Framed" value={order.is_framed ? "Yes" : "No"} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Delivery (physical only) */}
        {order.caricature_type === "physical" && order.delivery_address && (
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Delivery Address</CardTitle></CardHeader>
            <CardContent className="font-sans text-sm">
              <p>{order.delivery_address}</p>
              <p>{order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</p>
            </CardContent>
          </Card>
        )}

        {/* Images */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Uploaded Photos ({images.length})</CardTitle></CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">No images uploaded</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={getImageUrl(img.storage_path)}
                      alt={img.file_name}
                      className="w-full aspect-square object-cover rounded-lg border border-border"
                    />
                    <a
                      href={getImageUrl(img.storage_path)}
                      download={img.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 w-8 h-8 bg-card/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium capitalize">{value}</span>
  </div>
);

export default OrderDetail;
