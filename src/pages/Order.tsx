import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { motion, AnimatePresence } from "framer-motion";
import { OrderFormData, initialFormData } from "@/lib/order-types";
import { usePricing } from "@/hooks/usePricing";
import StepLocation from "@/components/order/StepLocation";
import StepCustomerDetails from "@/components/order/StepCustomerDetails";
import StepOrderDetails from "@/components/order/StepOrderDetails";
import StepPhotoUpload from "@/components/order/StepPhotoUpload";
import StepDeliveryAddress from "@/components/order/StepDeliveryAddress";
import StepSummary from "@/components/order/StepSummary";
import OrderConfirmation from "@/components/order/OrderConfirmation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// New order: location → caricature details → photos → customer details → address → summary
const STEPS = ["location", "details", "photos", "customer", "address", "summary"] as const;

const STEP_LABELS: Record<string, string> = {
  location: "Location",
  details: "Caricature Selection",
  photos: "Upload Photos",
  customer: "Your Details",
  address: "Delivery Address",
  summary: "Payment & Summary",
};

const Order = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getPrice, fetchCustomerPricing } = usePricing();
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Redirect to register if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/register");
    }
  }, [authLoading, user, navigate]);

  // Auto-fill from profile & fetch custom pricing with real-time sync
  useEffect(() => {
    if (user && !profileLoaded) {
      loadProfile(user.id);
      fetchCustomerPricing(user.id);
    }
    if (user) {
      // Real-time sync for caricature pricing changes
      const channel = supabase
        .channel("order-pricing-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "customer_pricing", filter: `user_id=eq.${user.id}` }, () => {
          fetchCustomerPricing(user.id);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "caricature_types" }, () => {
          // usePricing hook already handles this via its own realtime channel
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, profileLoaded]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      setFormData((prev) => ({
        ...prev,
        customerName: data.full_name || prev.customerName,
        customerMobile: data.mobile || prev.customerMobile,
        customerEmail: data.email || prev.customerEmail,
        instagramId: data.instagram_id || prev.instagramId,
        state: data.state || prev.state,
        city: data.city || prev.city,
        // Only set delivery address from physical address, not email
        deliveryAddress: prev.deliveryAddress || data.address || "",
        deliveryCity: data.city || prev.deliveryCity,
        deliveryState: data.state || prev.deliveryState,
        deliveryPincode: data.pincode || prev.deliveryPincode,
      }));
    }
    setProfileLoaded(true);
  };

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const amount = getPrice(formData.orderType, formData.faceCount);

  const update = (partial: Partial<OrderFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const next = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleOrderComplete = (id: string) => {
    setOrderId(id);
    setOrderComplete(true);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;
  }

  if (orderComplete && orderId) {
    return <OrderConfirmation orderId={orderId} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Order Custom Caricature from Photos Online | Creative Caricature Club™" description="Order custom hand-crafted caricatures from your photos online. Choose from cute, romantic, fun, royal & minimal styles. Creative Caricature Club™ delivers across India & internationally. Perfect gift for birthdays, anniversaries & weddings." canonical="/order" />
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate("/") : prev()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full cursor-pointer" onClick={() => navigate("/")} />
              <h1 className="font-display text-lg md:text-xl font-bold truncate">Order Your Caricature</h1>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Step {currentStep + 1} of {totalSteps} — {STEP_LABELS[step]}
            </p>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === "location" && <StepLocation data={formData} update={update} onNext={next} />}
            {step === "details" && <StepOrderDetails data={formData} update={update} onNext={next} getPrice={getPrice} />}
            {step === "photos" && <StepPhotoUpload data={formData} update={update} onNext={next} />}
            {step === "customer" && <StepCustomerDetails data={formData} update={update} onNext={next} />}
            {step === "address" && <StepDeliveryAddress data={formData} update={update} onNext={next} />}
            {step === "summary" && <StepSummary data={formData} amount={amount} onComplete={handleOrderComplete} userId={user?.id || null} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Order;
