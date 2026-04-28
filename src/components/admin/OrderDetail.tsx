import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatPrice, STYLES } from "@/lib/pricing";
import { ArrowLeft, Download, Edit2, Save, X, CalendarClock, Upload, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  orderId: string;
  onBack: () => void;
}

type OrderFull = {
  id: string; caricature_type: string; order_type: string; style: string;
  notes: string | null; customer_name: string; customer_mobile: string;
  customer_email: string; instagram_id: string | null; face_count: number;
  amount: number; country: string | null; state: string | null;
  city: string | null; district: string | null; is_framed: boolean | null;
  delivery_address: string | null; delivery_city: string | null;
  delivery_state: string | null; delivery_pincode: string | null;
  payment_status: string | null; priority: number | null;
  artist_name: string | null; expected_delivery_date: string | null;
  status: string; created_at: string;
  extended_delivery_date: string | null; extension_reason: string | null;
  preview_image_url: string | null; timeline_logs: any;
  current_stage: string | null; artist_message: string | null;
};

type OrderImage = { id: string; storage_path: string; file_name: string; };

const OrderDetail = ({ orderId, onBack }: Props) => {
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [images, setImages] = useState<OrderImage[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<OrderFull>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Delivery Extension
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [extendNotify, setExtendNotify] = useState(true);

  // Preview Image
  const [previewUrl, setPreviewUrl] = useState("");

  // Artist Message
  const [artistMsg, setArtistMsg] = useState("");

  // Timeline
  const [timelineEntry, setTimelineEntry] = useState("");

  useEffect(() => { fetchOrder(); fetchImages(); }, [orderId]);

  const fetchOrder = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (data) {
      setOrder(data as any);
      setEditData(data as any);
      setArtistMsg((data as any).artist_message || "");
      setPreviewUrl((data as any).preview_image_url || "");
    }
  };

  const fetchImages = async () => {
    const { data } = await supabase.from("order_images").select("id, storage_path, file_name").eq("order_id", orderId);
    if (data) { setImages(data); loadSignedUrls(data); }
  };

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
      setEditing(false); fetchOrder();
    }
  };

  const handleExtendDelivery = async () => {
    if (!extendDate) { toast({ title: "Select new date", variant: "destructive" }); return; }
    const logs = Array.isArray(order?.timeline_logs) ? [...order.timeline_logs] : [];
    logs.push({ event: "Delivery Extended", label: `Delivery extended to ${extendDate}`, date: new Date().toISOString(), reason: extendReason });

    const { error } = await supabase.from("orders").update({
      extended_delivery_date: extendDate,
      extension_reason: extendReason || "Due to high demand, extra care is being taken to ensure premium quality 🎨",
      timeline_logs: logs,
    } as any).eq("id", orderId);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Log extension to order_extensions table
    await supabase.from("order_extensions" as any).insert({
      order_id: orderId,
      old_date: order?.expected_delivery_date || order?.extended_delivery_date || null,
      new_date: extendDate,
      reason: extendReason || "Due to high demand, extra care is being taken to ensure premium quality 🎨",
      admin_name: sessionStorage.getItem("admin_entered_name") || "Admin",
    });

    if (extendNotify && order) {
      // Create notification for customer
      if ((order as any).user_id) {
        await supabase.from("notifications").insert({
          user_id: (order as any).user_id,
          title: "📅 Delivery Date Updated",
          message: `Your order delivery has been updated to ${new Date(extendDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}. ${extendReason || ""}`,
          type: "order",
          link: "/track-order",
        });
      }
    }

    toast({ title: "✅ Delivery Extended", description: "Tracking page updated." });
    setShowExtend(false); setExtendDate(""); setExtendReason("");
    fetchOrder();
  };

  const saveArtistMessage = async () => {
    await supabase.from("orders").update({ artist_message: artistMsg } as any).eq("id", orderId);
    toast({ title: "Artist message saved" }); fetchOrder();
  };

  const savePreviewImage = async () => {
    await supabase.from("orders").update({ preview_image_url: previewUrl } as any).eq("id", orderId);
    toast({ title: "Preview image updated" }); fetchOrder();
  };

  const addTimelineEntry = async () => {
    if (!timelineEntry) return;
    const logs = Array.isArray(order?.timeline_logs) ? [...order.timeline_logs] : [];
    logs.push({ event: timelineEntry, label: timelineEntry, date: new Date().toISOString() });
    await supabase.from("orders").update({ timeline_logs: logs } as any).eq("id", orderId);
    toast({ title: "Timeline updated" }); setTimelineEntry(""); fetchOrder();
  };

  const deleteImage = async (imageId: string, storagePath: string) => {
    if (!confirm("Delete this image?")) return;
    await supabase.storage.from("order-photos").remove([storagePath]);
    await supabase.from("order_images").delete().eq("id", imageId);
    toast({ title: "Image Deleted" }); fetchImages();
  };

  if (!order) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const styleName = STYLES.find((s) => s.value === order.style)?.label || order.style;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Order {order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</p>
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
          <CardHeader><CardTitle className="text-lg">Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
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
          <CardHeader><CardTitle className="text-lg">Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
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
                  <Label className="text-muted-foreground text-sm">Priority</Label>
                  <Input type="number" className="w-20 h-8" value={editData.priority || 0} onChange={(e) => setEditData({ ...editData, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">Expected Delivery</Label>
                  <Input type="date" className="w-40 h-8" value={editData.expected_delivery_date || ""} onChange={(e) => setEditData({ ...editData, expected_delivery_date: e.target.value })} />
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">Order Date & Time</Label>
                  <Input type="datetime-local" step="1" className="w-56 h-8" value={editData.created_at ? (() => { const d = new Date(editData.created_at); const offset = d.getTimezoneOffset(); const local = new Date(d.getTime() - offset * 60000); return local.toISOString().slice(0, 19); })() : ""} max={(() => { const now = new Date(); now.setMinutes(now.getMinutes() - 1); const offset = now.getTimezoneOffset(); const local = new Date(now.getTime() - offset * 60000); return local.toISOString().slice(0, 19); })()} onChange={(e) => setEditData({ ...editData, created_at: new Date(e.target.value).toISOString() })} />
                </div>
              </>
            ) : (
              <>
                {order.notes && <Row label="Notes" value={order.notes} />}
                {order.artist_name && <Row label="Artist" value={order.artist_name} />}
                <Row label="Priority" value={order.priority ? `${order.priority}` : "Normal"} />
                {order.extended_delivery_date && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700 font-semibold">⚠️ Delivery Extended</p>
                    <p className="text-xs text-amber-600">New: {new Date(order.extended_delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    {order.extension_reason && <p className="text-xs text-amber-500 italic">{order.extension_reason}</p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* EXTEND DELIVERY */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-5 h-5 text-amber-600" /> Extend Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground flex-shrink-0">New Date</Label>
              <Input type="date" className="h-8 flex-1" value={extendDate} onChange={e => setExtendDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Reason / Note</Label>
              <Textarea className="mt-1 h-16" placeholder="e.g. Due to high demand, extra care is being taken..." value={extendReason} onChange={e => setExtendReason(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">🔔 Notify Customer</Label>
              <Switch checked={extendNotify} onCheckedChange={setExtendNotify} />
            </div>
            <Button size="sm" className="w-full" onClick={handleExtendDelivery} disabled={!extendDate}>
              <CalendarClock className="w-4 h-4 mr-1" /> Save & Extend
            </Button>
          </CardContent>
        </Card>

        {/* ARTIST MESSAGE */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">🎨 Artist Message (Tracking Page)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea className="h-16" placeholder="Custom message shown on tracking page..." value={artistMsg} onChange={e => setArtistMsg(e.target.value)} />
            <Button size="sm" onClick={saveArtistMessage}><Save className="w-4 h-4 mr-1" />Save Message</Button>
          </CardContent>
        </Card>

        {/* SNEAK PEEK / PREVIEW IMAGE */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">👀 Sneak Peek Image</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Preview image URL (partial/blurred)" value={previewUrl} onChange={e => setPreviewUrl(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={savePreviewImage}><Image className="w-4 h-4 mr-1" />Save Preview</Button>
              {previewUrl && <Button size="sm" variant="destructive" onClick={() => { setPreviewUrl(""); supabase.from("orders").update({ preview_image_url: null } as any).eq("id", orderId).then(() => { toast({ title: "Preview removed" }); fetchOrder(); }); }}>Remove</Button>}
            </div>
            {previewUrl && <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg mt-2"  loading="lazy" decoding="async" />}
          </CardContent>
        </Card>

        {/* TIMELINE LOGS */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">📋 Timeline Logs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Array.isArray(order.timeline_logs) && order.timeline_logs.length > 0 && (
              <div className="space-y-2 mb-3">
                {(order.timeline_logs as any[]).map((log: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{log.label || log.event}</span>
                      {log.date && <span className="text-muted-foreground ml-2">{new Date(log.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Add timeline entry..." value={timelineEntry} onChange={e => setTimelineEntry(e.target.value)} className="h-8" />
              <Button size="sm" onClick={addTimelineEntry} disabled={!timelineEntry}>Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        {order.delivery_address && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Delivery Address</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
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
          <CardHeader><CardTitle className="text-lg">Uploaded Photos ({images.length})</CardTitle></CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images uploaded</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group cursor-pointer" onClick={() => setSelectedImage(getImageUrl(img.storage_path))}>
                    <img src={getImageUrl(img.storage_path)} alt={img.file_name} className="w-full aspect-square object-cover rounded-lg border border-border"  loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors rounded-lg flex items-end justify-center pb-2 gap-2">
                      <a href={getImageUrl(img.storage_path)} download={img.file_name} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-card/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-border" onClick={(e) => e.stopPropagation()}>
                        <Download className="w-4 h-4" />
                      </a>
                      {editing && (
                        <button onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.storage_path); }} className="w-8 h-8 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={selectedImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg"  loading="lazy" decoding="async" />
            <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 w-10 h-10 bg-card rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
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
