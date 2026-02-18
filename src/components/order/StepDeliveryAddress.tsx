import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import LocationDropdowns from "@/components/LocationDropdowns";
import { useState } from "react";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepDeliveryAddress = ({ data, update, onNext }: Props) => {
  const validatePincode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 6) return;
    update({ deliveryPincode: digits });
  };

  const canProceed = data.deliveryAddress.trim() && data.deliveryCity.trim() && data.deliveryState.trim() && data.deliveryPincode.trim().length === 6;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Delivery Address</h2>
        <p className="text-sm text-muted-foreground font-sans">Where should we deliver your artwork?</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-sans">Full Address *</Label>
          <Input value={data.deliveryAddress} onChange={(e) => update({ deliveryAddress: e.target.value })} placeholder="House no, Street, Area" />
        </div>
        <LocationDropdowns
          state={data.deliveryState}
          district={data.district || ""}
          city={data.deliveryCity}
          onStateChange={(v) => update({ deliveryState: v, deliveryCity: "" })}
          onDistrictChange={() => {}}
          onCityChange={(v) => update({ deliveryCity: v })}
          showLabels={true}
        />
        <div>
          <Label className="font-sans">Pincode * (6 digits)</Label>
          <Input 
            value={data.deliveryPincode} 
            onChange={(e) => validatePincode(e.target.value)} 
            placeholder="400001" 
            maxLength={6}
          />
          {data.deliveryPincode && data.deliveryPincode.length < 6 && (
            <p className="text-xs text-destructive font-sans mt-1">Enter 6-digit pincode</p>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground font-sans">
        📦 Caricatures are delivered within 25–30 days due to high demand.
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepDeliveryAddress;
