import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepDeliveryAddress = ({ data, update, onNext }: Props) => {
  const canProceed = data.deliveryAddress.trim() && data.deliveryCity.trim() && data.deliveryState.trim() && data.deliveryPincode.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Delivery Address</h2>
        <p className="text-sm text-muted-foreground font-sans">Where should we deliver your artwork?</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-sans">Full Address</Label>
          <Input value={data.deliveryAddress} onChange={(e) => update({ deliveryAddress: e.target.value })} placeholder="House no, Street, Area" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="font-sans">City</Label>
            <Input value={data.deliveryCity} onChange={(e) => update({ deliveryCity: e.target.value })} placeholder="City" />
          </div>
          <div>
            <Label className="font-sans">State</Label>
            <Input value={data.deliveryState} onChange={(e) => update({ deliveryState: e.target.value })} placeholder="State" />
          </div>
        </div>
        <div>
          <Label className="font-sans">Pincode</Label>
          <Input value={data.deliveryPincode} onChange={(e) => update({ deliveryPincode: e.target.value })} placeholder="400001" />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground font-sans">
        📦 Physical caricatures are delivered within 20–25 days due to high demand.
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepDeliveryAddress;
