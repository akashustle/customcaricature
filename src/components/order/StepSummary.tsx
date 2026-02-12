import { OrderFormData } from "@/lib/order-types";
import { formatPrice, STYLES } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Copy, CheckCircle2 } from "lucide-react";

interface Props {
  data: OrderFormData;
  amount: number;
  onComplete: (orderId: string) => void;
}

const UPI_ID = "artistritesh93242@okaxis";
const GPAY_NUMBER = "9967047351";
const WHATSAPP_NUMBER = "918369594271";
const INSTAGRAM_URL = "https://www.instagram.com/creativecaricatureclub";

const StepSummary = ({ data, amount, onComplete }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const styleName = STYLES.find((s) => s.value === data.style)?.label || data.style;
  const isMumbai = data.city.toLowerCase().trim() === "mumbai";

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const imagePaths: { storage_path: string; file_name: string }[] = [];
      const orderId = crypto.randomUUID();

      for (const photo of data.photos) {
        const ext = photo.name.split(".").pop();
        const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("order-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;
        imagePaths.push({ storage_path: path, file_name: photo.name });
      }

      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        caricature_type: "physical" as any,
        order_type: data.orderType,
        style: data.style as any,
        notes: data.notes || null,
        customer_name: data.customerName,
        customer_mobile: data.customerMobile,
        customer_email: data.customerEmail,
        instagram_id: data.instagramId || null,
        face_count: data.faceCount,
        amount,
        country: data.country,
        state: data.state,
        city: data.city,
        district: data.district || null,
        is_framed: isMumbai,
        delivery_address: data.deliveryAddress,
        delivery_city: data.deliveryCity,
        delivery_state: data.deliveryState,
        delivery_pincode: data.deliveryPincode,
      });

      if (orderError) throw orderError;

      if (imagePaths.length > 0) {
        const { error: imgError } = await supabase.from("order_images").insert(
          imagePaths.map((img) => ({ order_id: orderId, ...img }))
        );
        if (imgError) throw imgError;
      }

      onComplete(orderId);
    } catch (err: any) {
      console.error("Order submission error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Order Summary & Payment</h2>
        <p className="text-sm text-muted-foreground font-sans">Review your order, make payment, then confirm</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardContent className="p-5 space-y-3">
          <Row label="Order" value={`${data.orderType}${data.orderType === "group" ? ` (${data.faceCount} faces)` : ""}`} />
          <Row label="Style" value={styleName} />
          <Row label="Customer" value={data.customerName} />
          <Row label="Mobile" value={`+91 ${data.customerMobile}`} />
          <Row label="Email" value={data.customerEmail} />
          {data.instagramId && <Row label="Instagram" value={data.instagramId} />}
          {data.notes && <Row label="Notes" value={data.notes} />}
          <Row label="Location" value={`${data.city}, ${data.state}`} />
          <Row label="Frame" value={isMumbai ? "Yes (included)" : "No (outside Mumbai)"} />
          <Row label="Delivery To" value={`${data.deliveryAddress}, ${data.deliveryCity} - ${data.deliveryPincode}`} />
          <Row label="Photos" value={`${data.photos.length} image(s) uploaded`} />
          <Row label="Delivery" value="25–30 days" />

          <div className="border-t border-border pt-4 flex justify-between items-center">
            <span className="font-sans font-semibold text-lg">Total</span>
            <span className="font-display text-3xl font-bold text-primary">{formatPrice(amount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-display text-lg font-bold">Payment Details</h3>
          <p className="text-sm font-sans text-muted-foreground">Make payment via GPay/UPI and share screenshot to verify</p>
          
          <div className="space-y-2 font-sans text-sm">
            <div className="flex justify-between items-center bg-card rounded-lg p-3">
              <div>
                <p className="text-muted-foreground text-xs">GPay Number</p>
                <p className="font-semibold">{GPAY_NUMBER}</p>
              </div>
            </div>
            <div className="flex justify-between items-center bg-card rounded-lg p-3">
              <div>
                <p className="text-muted-foreground text-xs">UPI ID</p>
                <p className="font-semibold">{UPI_ID}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={copyUPI} className="text-xs">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex justify-between items-center bg-card rounded-lg p-3">
              <div>
                <p className="text-muted-foreground text-xs">Amount</p>
                <p className="font-display text-xl font-bold text-primary">{formatPrice(amount)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I have made payment of ${formatPrice(amount)} for my caricature order. Sharing screenshot.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Share on Instagram
            </a>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full font-sans text-lg py-6"
        size="lg"
      >
        {submitting ? "Placing Order..." : "I Have Made Payment — Confirm Order"}
      </Button>

      <p className="text-xs text-center text-muted-foreground font-sans">
        After payment verification on WhatsApp, you'll receive order updates and tracking details.
      </p>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-sm text-muted-foreground font-sans flex-shrink-0">{label}</span>
    <span className="text-sm font-sans font-medium text-right capitalize">{value}</span>
  </div>
);

export default StepSummary;
