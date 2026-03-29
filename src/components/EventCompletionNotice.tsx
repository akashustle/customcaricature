import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import { PartyPopper, Share2, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EventCompletionNoticeProps {
  event: {
    id: string;
    client_name: string;
    event_type: string;
    event_date: string;
    venue_name: string;
    city: string;
    artist_count: number;
    total_price: number;
    negotiated?: boolean;
    negotiated_total?: number | null;
  };
  assignedArtists?: { name: string }[];
}

const EventCompletionNotice = ({ event, assignedArtists = [] }: EventCompletionNoticeProps) => {
  const totalAmount = event.negotiated && event.negotiated_total ? event.negotiated_total : event.total_price;
  const eventDate = new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const summaryText = `🎉 Event Completed!\n\n📋 ${event.event_type} Event\n📅 ${eventDate}\n📍 ${event.venue_name}, ${event.city}\n🎨 ${event.artist_count} Artist${event.artist_count > 1 ? "s" : ""}${assignedArtists.length > 0 ? `: ${assignedArtists.map(a => a.name).join(", ")}` : ""}\n💰 Total: ${formatPrice(totalAmount)}\n\nBooking ID: ${event.id.slice(0, 8).toUpperCase()}\n\nPowered by Creative Caricature Club™ ✨`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    toast({ title: "Summary copied!" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Event Summary", text: summaryText });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5 text-green-600" />
          <p className="font-display text-sm font-bold text-green-800">Event Completed Successfully! 🎊</p>
        </div>

        <div className="bg-white/60 rounded-lg p-3 text-xs font-sans space-y-1 text-green-900">
          <p><span className="text-muted-foreground">Event:</span> {event.event_type}</p>
          <p><span className="text-muted-foreground">Date:</span> {eventDate}</p>
          <p><span className="text-muted-foreground">Venue:</span> {event.venue_name}, {event.city}</p>
          {assignedArtists.length > 0 && (
            <p><span className="text-muted-foreground">Artists:</span> {assignedArtists.map(a => a.name).join(", ")}</p>
          )}
          <p><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatPrice(totalAmount)}</span></p>
          <p><span className="text-muted-foreground">Booking ID:</span> {event.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs rounded-full font-sans" onClick={handleShare}>
            <Share2 className="w-3 h-3 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs rounded-full font-sans" onClick={handleCopy}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCompletionNotice;
