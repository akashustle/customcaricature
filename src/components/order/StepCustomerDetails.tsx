import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepCustomerDetails = ({ data, update, onNext }: Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateMobile = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 10) return;
    update({ customerMobile: digits });
    if (digits === "" && val === "") update({ customerMobile: "" });
  };

  const canProceed = 
    data.customerName.trim() && 
    data.customerMobile.replace(/\D/g, "").length === 10 && 
    data.customerEmail.trim() &&
    data.customerEmail.includes("@");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Your Details</h2>
        <p className="text-sm text-muted-foreground font-sans">We'll use these to contact you about your order</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-sans">Full Name *</Label>
          <Input value={data.customerName} onChange={(e) => update({ customerName: e.target.value })} placeholder="Your full name" />
        </div>
        <div>
          <Label className="font-sans">Mobile Number * (10 digits)</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm font-sans">+91</div>
            <Input 
              value={data.customerMobile} 
              onChange={(e) => validateMobile(e.target.value)} 
              placeholder="9876543210" 
              type="tel" 
              maxLength={10}
            />
          </div>
          {data.customerMobile && data.customerMobile.length < 10 && (
            <p className="text-xs text-destructive font-sans mt-1">Enter 10-digit Indian mobile number</p>
          )}
        </div>
        <div>
          <Label className="font-sans">Email Address *</Label>
          <Input value={data.customerEmail} onChange={(e) => update({ customerEmail: e.target.value })} placeholder="you@email.com" type="email" />
        </div>
        <div>
          <Label className="font-sans">Instagram ID (optional)</Label>
          <Input value={data.instagramId} onChange={(e) => update({ instagramId: e.target.value })} placeholder="@yourusername" />
        </div>
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepCustomerDetails;
