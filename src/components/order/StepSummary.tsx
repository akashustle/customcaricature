import { OrderFormData } from "@/lib/order-types";
import { formatPrice, STYLES } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface Props {
  data: OrderFormData;
  amount: number;
  onComplete: (orderId: string) => void;
}

const StepSummary = ({ data, amount, onComplete }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const styleName = STYLES.find((s) => s.value === data.style)?.label || data.style;
  const isMumbai = data.city.toLowerCase().trim() === "mumbai";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload photos first
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

      // Create order
      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        caricature_type: data.caricatureType,
        order_type: data.orderType,
        style: data.style as any,
        notes: data.notes || null,
        customer_name: data.customerName,
        customer_mobile: data.customerMobile,
        customer_email: data.customerEmail,
        face_count: data.faceCount,
        amount,
        country: data.caricatureType === "physical" ? data.country : null,
        state: data.caricatureType === "physical" ? data.state : null,
        city: data.caricatureType === "physical" ? data.city : null,
        district: data.caricatureType === "physical" ? data.district || null : null,
        is_framed: data.caricatureType === "physical" ? isMumbai : false,
        delivery_address: data.caricatureType === "physical" ? data.deliveryAddress : null,
        delivery_city: data.caricatureType === "physical" ? data.deliveryCity : null,
        delivery_state: data.caricatureType === "physical" ? data.deliveryState : null,
        delivery_pincode: data.caricatureType === "physical" ? data.deliveryPincode : null,
      });

      if (orderError) throw orderError;

      // Insert image records
      if (imagePaths.length > 0) {
        const { error: imgError } = await supabase.from("order_images").insert(
          imagePaths.map((img) => ({ order_id: orderId, ...img }))
        );
        if (imgError) throw imgError;
      }

      // TODO: Razorpay payment integration will be added
      // For now, mark order as placed
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
        <h2 className="font-display text-2xl font-bold mb-1">Order Summary</h2>
        <p className="text-sm text-muted-foreground font-sans">Review your order before payment</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        <CardContent className="p-6 space-y-4">
          <Row label="Type" value={data.caricatureType === "digital" ? "Digital Caricature" : "Physical Caricature"} />
          <Row label="Order" value={`${data.orderType}${data.orderType === "group" ? ` (${data.faceCount} faces)` : ""}`} />
          <Row label="Style" value={styleName} />
          <Row label="Customer" value={data.customerName} />
          <Row label="Mobile" value={data.customerMobile} />
          <Row label="Email" value={data.customerEmail} />
          {data.notes && <Row label="Notes" value={data.notes} />}
          {data.caricatureType === "physical" && (
            <>
              <Row label="Location" value={`${data.city}, ${data.state}`} />
              <Row label="Frame" value={isMumbai ? "Yes (included)" : "No (outside Mumbai)"} />
              <Row label="Delivery To" value={`${data.deliveryAddress}, ${data.deliveryCity} - ${data.deliveryPincode}`} />
            </>
          )}
          <Row label="Photos" value={`${data.photos.length} image(s) uploaded`} />
          <Row label="Delivery" value={data.caricatureType === "digital" ? "15–20 days (digital file)" : "20–25 days"} />

          <div className="border-t border-border pt-4 flex justify-between items-center">
            <span className="font-sans font-semibold text-lg">Total</span>
            <span className="font-display text-3xl font-bold text-primary">{formatPrice(amount)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full font-sans text-lg py-6"
        size="lg"
      >
        {submitting ? "Placing Order..." : `Pay ${formatPrice(amount)} & Confirm Order`}
      </Button>

      <p className="text-xs text-center text-muted-foreground font-sans">
        100% advance payment required. No COD available.
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
