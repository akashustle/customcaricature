import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepCustomerDetails = ({ data, update, onNext }: Props) => {
  const canProceed = data.customerName.trim() && data.customerMobile.trim() && data.customerEmail.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Your Details</h2>
        <p className="text-sm text-muted-foreground font-sans">We'll use these to contact you about your order</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-sans">Full Name</Label>
          <Input value={data.customerName} onChange={(e) => update({ customerName: e.target.value })} placeholder="Your full name" />
        </div>
        <div>
          <Label className="font-sans">Mobile Number</Label>
          <Input value={data.customerMobile} onChange={(e) => update({ customerMobile: e.target.value })} placeholder="+91 98765 43210" type="tel" />
        </div>
        <div>
          <Label className="font-sans">Email Address</Label>
          <Input value={data.customerEmail} onChange={(e) => update({ customerEmail: e.target.value })} placeholder="you@email.com" type="email" />
        </div>
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepCustomerDetails;
