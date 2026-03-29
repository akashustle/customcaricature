import { OrderFormData } from "@/lib/order-types";
import { formatPrice, STYLES } from "@/lib/pricing";
import { isMumbaiRegion } from "@/lib/india-locations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";
import { playPaymentSuccessSound } from "@/lib/sounds";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Props {
  data: OrderFormData;
  amount: number;
  onComplete: (orderId: string) => void;
  userId: string | null;
}

const StepSummary = ({ data, amount, onComplete, userId }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const styleName = STYLES.find((s) => s.value === data.style)?.label || data.style;
  const isMumbai = isMumbaiRegion(data.state, data.district, data.city);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const orderId = crypto.randomUUID();

      // 1. Upload images
      const imagePaths: { storage_path: string; file_name: string }[] = [];
      for (const photo of data.photos) {
        const ext = photo.name.split(".").pop();
        const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("order-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;
        imagePaths.push({ storage_path: path, file_name: photo.name });
      }

      // 2. Create order in DB (payment_status = pending)
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
        user_id: userId,
      });
      if (orderError) throw orderError;

      if (imagePaths.length > 0) {
        const { error: imgError } = await supabase.from("order_images").insert(
          imagePaths.map((img) => ({ order_id: orderId, ...img }))
        );
        if (imgError) throw imgError;
      }

      // 3. Create Razorpay order via edge function
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount,
          order_id: orderId,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_mobile: data.customerMobile,
        },
      });

      if (rzpError || !rzpData?.razorpay_order_id) {
        throw new Error(rzpError?.message || "Failed to create payment order");
      }

      // 4. Open Razorpay checkout
      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club™",
        description: `${data.orderType} Caricature - ${styleName}`,
        image: "/logo.png",
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            // 5. Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderId,
              },
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error("Payment verification failed");
            }

            playPaymentSuccessSound();
            onComplete(orderId);

            // Send confirmation email (fire-and-forget)
            supabase.functions.invoke("send-notification-email", {
              body: {
                type: "order_placed",
                data: {
                  customer_name: data.customerName,
                  customer_email: data.customerEmail,
                  order_type: data.orderType,
                  style: data.style,
                  amount,
                  order_id: orderId.slice(0, 8).toUpperCase(),
                },
              },
            }).catch(() => {});
          } catch (err: any) {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support with your order ID: " + orderId.slice(0, 8).toUpperCase(),
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: data.customerName,
          email: data.customerEmail,
          contact: `+91${data.customerMobile}`,
        },
        theme: {
          color: "#E3DED3",
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast({
              title: "Payment Cancelled",
              description: "Your order has been saved. You can pay later from your dashboard.",
            });
          },
        },
      };

      await initRazorpay(options);
    } catch (err: any) {
      console.error("Order submission error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Order Summary & Payment</h2>
        <p className="text-sm text-muted-foreground font-sans">Review your order and proceed to secure payment</p>
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

      <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans bg-muted/50 rounded-lg p-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <span>Secure payment powered by Razorpay. Your payment details are encrypted and safe.</span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full font-sans text-lg py-6"
        size="lg"
      >
        {submitting ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
        ) : (
          `Pay ${formatPrice(amount)} & Place Order`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground font-sans">
        After payment, you'll receive an order confirmation email with tracking details.
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
