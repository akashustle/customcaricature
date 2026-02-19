import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, STYLES } from "@/lib/pricing";
import { ArrowLeft, Download, Edit2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  instagram_id: string | null;
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
  payment_status: string | null;
  priority: number | null;
  artist_name: string | null;
  expected_delivery_date: string | null;
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
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<OrderFull>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
    fetchImages();
  }, [orderId]);

  const fetchOrder = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (data) { setOrder(data as any); setEditData(data as any); }
  };

  const fetchImages = async () => {
    const { data } = await supabase.from("order_images").select("id, storage_path, file_name").eq("order_id", orderId);
    if (data) {
      setImages(data);
      loadSignedUrls(data);
    }
  };

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const loadSignedUrls = async (imgs: OrderImage[]) => {
    const urls: Record<string, string> = {};
    for (const img of imgs) {
      const { data } = await supabase.storage.from("order-photos").createSignedUrl(img.storage_path, 3600);
      if (data?.signedUrl) urls[img.storage_path] = data.signedUrl;
    }
    setImageUrls(urls);
  };

  const getImageUrl = (path: string) => imageUrls[path] || "";

  const saveChanges = async () => {
    const { error } = await supabase.from("orders").update({
      customer_name: editData.customer_name,
      customer_mobile: editData.customer_mobile,
      customer_email: editData.customer_email,
      instagram_id: editData.instagram_id,
      delivery_address: editData.delivery_address,
      delivery_city: editData.delivery_city,
      delivery_state: editData.delivery_state,
      delivery_pincode: editData.delivery_pincode,
      notes: editData.notes,
      artist_name: editData.artist_name as any,
      priority: editData.priority as any,
      expected_delivery_date: editData.expected_delivery_date as any,
      created_at: editData.created_at as any,
    }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Order details updated" });
      setEditing(false);
      fetchOrder();
    }
  };

  const deleteImage = async (imageId: string, storagePath: string) => {
    if (!confirm("Delete this image?")) return;
    await supabase.storage.from("order-photos").remove([storagePath]);
    await supabase.from("order_images").delete().eq("id", imageId);
    toast({ title: "Image Deleted" });
    fetchImages();
  };

  if (!order) return <div className="p-8 text-center font-sans text-muted-foreground">Loading...</div>;

  const styleName = STYLES.find((s) => s.value === order.style)?.label || order.style;
  const orderDate = new Date(order.created_at);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="font-display text-lg md:text-xl font-bold">Order {order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground font-sans">Placed {orderDate.toLocaleDateString()}</p>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4 mr-1" />Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveChanges}><Save className="w-4 h-4 mr-1" />Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditData(order); }}><X className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 font-sans text-sm">
            {editing ? (
              <>
                <EditRow label="Name" value={editData.customer_name || ""} onChange={(v) => setEditData({ ...editData, customer_name: v })} />
                <EditRow label="Mobile" value={editData.customer_mobile || ""} onChange={(v) => setEditData({ ...editData, customer_mobile: v })} />
                <EditRow label="Email" value={editData.customer_email || ""} onChange={(v) => setEditData({ ...editData, customer_email: v })} />
                <EditRow label="Instagram" value={editData.instagram_id || ""} onChange={(v) => setEditData({ ...editData, instagram_id: v })} />
              </>
            ) : (
              <>
                <Row label="Name" value={order.customer_name} />
                <Row label="Mobile" value={order.customer_mobile} />
                <Row label="Email" value={order.customer_email} />
                {order.instagram_id && <Row label="Instagram" value={order.instagram_id} />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 font-sans text-sm">
            <Row label="Order Type" value={`${order.order_type}${order.order_type === "group" ? ` (${order.face_count} faces)` : ""}`} />
            <Row label="Style" value={styleName} />
            <Row label="Amount" value={formatPrice(order.amount)} />
            <Row label="Location" value={`${order.city || "—"}, ${order.state || "—"}`} />
            <Row label="Framed" value={order.is_framed ? "Yes" : "No"} />
            {editing ? (
              <>
                <EditRow label="Notes" value={editData.notes || ""} onChange={(v) => setEditData({ ...editData, notes: v })} />
                <EditRow label="Artist" value={editData.artist_name || ""} onChange={(v) => setEditData({ ...editData, artist_name: v })} />
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">Priority (0=normal)</Label>
                  <Input type="number" className="w-20 h-8" value={editData.priority || 0} onChange={(e) => setEditData({ ...editData, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">Expected Delivery</Label>
                  <Input type="date" className="w-40 h-8" value={editData.expected_delivery_date || ""} onChange={(e) => setEditData({ ...editData, expected_delivery_date: e.target.value })} />
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">Order Date & Time</Label>
                  <Input type="datetime-local" step="1" className="w-56 h-8" value={editData.created_at ? new Date(editData.created_at).toISOString().slice(0, 19) : ""} onChange={(e) => setEditData({ ...editData, created_at: new Date(e.target.value).toISOString() })} />
                </div>
              </>
            ) : (
              <>
                {order.notes && <Row label="Notes" value={order.notes} />}
                {order.artist_name && <Row label="Artist" value={order.artist_name} />}
                <Row label="Priority" value={order.priority ? `${order.priority}` : "Normal"} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Delivery */}
        {order.delivery_address && (
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Delivery Address</CardTitle></CardHeader>
            <CardContent className="font-sans text-sm space-y-3">
              {editing ? (
                <>
                  <EditRow label="Address" value={editData.delivery_address || ""} onChange={(v) => setEditData({ ...editData, delivery_address: v })} />
                  <EditRow label="City" value={editData.delivery_city || ""} onChange={(v) => setEditData({ ...editData, delivery_city: v })} />
                  <EditRow label="State" value={editData.delivery_state || ""} onChange={(v) => setEditData({ ...editData, delivery_state: v })} />
                  <EditRow label="Pincode" value={editData.delivery_pincode || ""} onChange={(v) => setEditData({ ...editData, delivery_pincode: v })} />
                </>
              ) : (
                <>
                  <p>{order.delivery_address}</p>
                  <p>{order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</p>
                </>
              )}
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
                  <div key={img.id} className="relative group cursor-pointer" onClick={() => setSelectedImage(getImageUrl(img.storage_path))}>
                    <img
                      src={getImageUrl(img.storage_path)}
                      alt={img.file_name}
                      className="w-full aspect-square object-cover rounded-lg border border-border"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors rounded-lg flex items-end justify-center pb-2 gap-2">
                      <a
                        href={getImageUrl(img.storage_path)}
                        download={img.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-card/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {editing && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.storage_path); }}
                          className="w-8 h-8 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Popup */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={selectedImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 w-10 h-10 bg-card rounded-full flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium capitalize">{value}</span>
  </div>
);

const EditRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex justify-between items-center gap-4">
    <Label className="text-muted-foreground text-sm flex-shrink-0">{label}</Label>
    <Input className="h-8 max-w-[200px]" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export default OrderDetail;
