import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Eye, Check, MessageCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type ArtworkPhoto = {
  id: string;
  order_id: string;
  storage_path: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
};

interface Props {
  orderId: string;
  orderStatus: string;
  artConfirmationStatus: string | null;
  onStatusChange?: () => void;
  isArtist?: boolean;
}

const ArtworkUploadFlow = ({ orderId, orderStatus, artConfirmationStatus, onStatusChange, isArtist = false }: Props) => {
  const [photos, setPhotos] = useState<ArtworkPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchArtworkPhotos();
    const ch = supabase
      .channel(`artwork-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "artwork_ready_photos", filter: `order_id=eq.${orderId}` }, () => fetchArtworkPhotos())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId]);

  const fetchArtworkPhotos = async () => {
    const { data } = await supabase.from("artwork_ready_photos").select("*").eq("order_id", orderId).order("created_at", { ascending: false }) as any;
    if (data) {
      setPhotos(data);
      const urls: Record<string, string> = {};
      for (const p of data) {
        const { data: signed } = await supabase.storage.from("order-photos").createSignedUrl(p.storage_path, 3600);
        if (signed?.signedUrl) urls[p.id] = signed.signedUrl;
      }
      setPhotoUrls(urls);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    for (const file of Array.from(files)) {
      const path = `artwork-ready/${orderId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
      if (!upErr) {
        await supabase.from("artwork_ready_photos").insert({
          order_id: orderId,
          storage_path: path,
          file_name: file.name,
          uploaded_by: user.id,
        } as any);
      }
    }

    // Update order status to artwork_ready and set confirmation pending
    await supabase.from("orders").update({
      status: "artwork_ready" as any,
      art_confirmation_status: "pending",
    } as any).eq("id", orderId);

    // Create notification for user
    const { data: order } = await supabase.from("orders").select("user_id, customer_name").eq("id", orderId).maybeSingle();
    if (order?.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "🎨 Your Artwork is Ready!",
        message: "Your caricature artwork is ready! Please view and confirm to proceed with dispatch.",
        type: "order",
        link: "/dashboard",
      } as any);
    }

    toast({ title: "Artwork uploaded & user notified!" });
    setUploading(false);
    e.target.value = "";
    onStatusChange?.();
  };

  // Only show upload when status is in_progress or artwork_ready
  const canUpload = ["in_progress", "artwork_ready", "new"].includes(orderStatus);
  const showConfirmationStatus = orderStatus === "artwork_ready" || artConfirmationStatus;

  return (
    <div className="space-y-2">
      {/* Upload section */}
      {canUpload && (
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            <Button size="sm" variant="outline" className="text-xs h-7" asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                Upload Art Ready
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Confirmation status */}
      {showConfirmationStatus && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-sans">Art Confirm:</span>
          <Badge className={`text-[10px] border-none ${
            artConfirmationStatus === "confirmed" ? "bg-green-100 text-green-800" :
            artConfirmationStatus === "chat" ? "bg-yellow-100 text-yellow-800" :
            "bg-orange-100 text-orange-800"
          }`}>
            {artConfirmationStatus === "confirmed" ? "✅ Confirmed - Dispatch" :
             artConfirmationStatus === "chat" ? "💬 User Raised Query" :
             "⏳ Awaiting User Confirm"}
          </Badge>
        </div>
      )}

      {/* Artwork thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {photos.map(p => (
            <div key={p.id} className="relative w-12 h-12 rounded border border-border overflow-hidden cursor-pointer" onClick={() => setPreviewUrl(photoUrls[p.id] || null)}>
              {photoUrls[p.id] ? (
                <img src={photoUrls[p.id]} alt={p.file_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Artwork Preview</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Artwork" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtworkUploadFlow;
