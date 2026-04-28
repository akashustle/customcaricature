import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plane, Upload, Edit2, FileText, Image, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  eventId: string;
  userId: string;
  isOutsideMumbai: boolean;
  advancePaid: boolean;
}

const FlightTicketUpload = ({ eventId, userId, isOutsideMumbai, advancePaid }: Props) => {
  const [ticket, setTicket] = useState<{ id: string; file_name: string; storage_path: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const fetchTicket = async () => {
    const { data } = await supabase.from("event_flight_tickets").select("id, file_name, storage_path").eq("event_id", eventId).order("created_at", { ascending: false }).limit(1);
    if (data && data.length > 0) {
      setTicket(data[0] as any);
      const { data: signed } = await supabase.storage.from("event-documents").createSignedUrl((data[0] as any).storage_path, 3600);
      if (signed?.signedUrl) setPreviewUrl(signed.signedUrl);
    }
  };

  useEffect(() => {
    fetchTicket();
    const ch = supabase.channel(`flight-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_flight_tickets", filter: `event_id=eq.${eventId}` }, () => fetchTicket())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  if (!isOutsideMumbai || !advancePaid) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `flights/${eventId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("event-documents").upload(path, file);
      if (upErr) throw upErr;

      // Delete old ticket if replacing
      if (ticket) {
        await supabase.storage.from("event-documents").remove([ticket.storage_path]);
        await supabase.from("event_flight_tickets").delete().eq("id", ticket.id);
      }

      await supabase.from("event_flight_tickets").insert({
        event_id: eventId,
        uploaded_by: userId,
        file_name: file.name,
        storage_path: path,
      } as any);

      toast({ title: "Flight ticket uploaded! ✈️" });
      fetchTicket();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    setShowReplace(false);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Upload JPG, PNG, or PDF", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    handleUpload(file);
  };

  const isPdf = ticket?.file_name?.toLowerCase().endsWith(".pdf");

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" /> Flight Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {ticket && previewUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-border">
              {isPdf ? (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/50 hover:bg-muted transition-colors">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-sans font-medium">{ticket.file_name}</p>
                    <p className="text-xs text-muted-foreground font-sans">Tap to view PDF</p>
                  </div>
                </a>
              ) : (
                <img src={previewUrl} alt="Flight ticket" className="w-full max-h-48 object-contain bg-muted/30"  loading="lazy" decoding="async" />
              )}
              <button
                onClick={() => setShowReplace(true)}
                className="absolute top-2 right-2 w-8 h-8 bg-card/90 rounded-full flex items-center justify-center border border-border hover:bg-card transition-colors"
              >
                <Edit2 className="w-4 h-4 text-primary" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground font-sans">✅ Flight ticket uploaded · Tap pencil to replace</p>
          </div>
        ) : (
          <div>
            <label className="cursor-pointer">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onFileSelect} className="hidden" />
              <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
                <Upload className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm font-sans font-medium">{uploading ? "Uploading..." : "Upload Flight Ticket"}</p>
                  <p className="text-xs text-muted-foreground font-sans">JPG, PNG, or PDF · Max 10MB</p>
                </div>
              </div>
            </label>
          </div>
        )}

        <AlertDialog open={showReplace} onOpenChange={setShowReplace}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace Flight Ticket?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to replace this document? The old ticket will be removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <label className="cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onFileSelect} className="hidden" />
                  <span>Choose New File</span>
                </label>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default FlightTicketUpload;
