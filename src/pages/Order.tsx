import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OrderFormData, initialFormData } from "@/lib/order-types";
import { calculatePrice } from "@/lib/pricing";
import StepTypeSelect from "@/components/order/StepTypeSelect";
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

function getSteps(type: "digital" | "physical") {
  if (type === "digital") {
    return ["type", "details", "photos", "summary"] as const;
  }
  return ["type", "location", "customer", "details", "photos", "address", "summary"] as const;
}

const Order = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const steps = getSteps(formData.caricatureType);
  const step = steps[currentStep];
  const totalSteps = steps.length;
  const amount = calculatePrice(formData.caricatureType, formData.orderType, formData.faceCount);

  const update = (partial: Partial<OrderFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const next = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleTypeChange = (type: "digital" | "physical") => {
    update({ caricatureType: type });
    setCurrentStep(1);
  };

  const handleOrderComplete = (id: string) => {
    setOrderId(id);
    setOrderComplete(true);
  };

  if (orderComplete && orderId) {
    return <OrderConfirmation orderId={orderId} type={formData.caricatureType} />;
  }

  const stepLabel = (() => {
    switch (step) {
      case "type": return "Choose Type";
      case "location": return "Location";
      case "customer": return "Your Details";
      case "details": return formData.caricatureType === "digital" ? "Order Details" : "Order Details";
      case "photos": return "Upload Photos";
      case "address": return "Delivery Address";
      case "summary": return "Order Summary";
      default: return "";
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate("/") : prev()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Order Your Caricature</h1>
            {currentStep > 0 && (
              <p className="text-xs text-muted-foreground font-sans">
                Step {currentStep + 1} of {totalSteps} — {stepLabel}
              </p>
            )}
          </div>
        </div>
        {/* Progress bar */}
        {currentStep > 0 && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === "type" && <StepTypeSelect onSelect={handleTypeChange} />}
            {step === "location" && <StepLocation data={formData} update={update} onNext={next} />}
            {step === "customer" && <StepCustomerDetails data={formData} update={update} onNext={next} />}
            {step === "details" && (
              <StepOrderDetails
                data={formData}
                update={update}
                onNext={next}
                includeCustomerFields={formData.caricatureType === "digital"}
              />
            )}
            {step === "photos" && <StepPhotoUpload data={formData} update={update} onNext={next} />}
            {step === "address" && <StepDeliveryAddress data={formData} update={update} onNext={next} />}
            {step === "summary" && (
              <StepSummary data={formData} amount={amount} onComplete={handleOrderComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Order;
