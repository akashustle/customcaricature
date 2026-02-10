import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepLocation = ({ data, update, onNext }: Props) => {
  const isMumbai = data.city.toLowerCase().trim() === "mumbai";
  const canProceed = data.state.trim() && data.city.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Your Location</h2>
        <p className="text-sm text-muted-foreground font-sans">This helps us determine framing & delivery options</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="font-sans">Country</Label>
          <Input value={data.country} onChange={(e) => update({ country: e.target.value })} placeholder="India" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="font-sans">State</Label>
            <Input value={data.state} onChange={(e) => update({ state: e.target.value })} placeholder="Maharashtra" />
          </div>
          <div>
            <Label className="font-sans">City</Label>
            <Input value={data.city} onChange={(e) => update({ city: e.target.value })} placeholder="Mumbai" />
          </div>
        </div>
        <div>
          <Label className="font-sans">District (optional)</Label>
          <Input value={data.district} onChange={(e) => update({ district: e.target.value })} placeholder="District" />
        </div>
      </div>

      {/* Frame info */}
      {data.city.trim() && (
        <div className={`p-4 rounded-lg border text-sm font-sans ${isMumbai ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {isMumbai ? (
            <p>✅ Great! Mumbai orders include a premium frame at no extra cost.</p>
          ) : (
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              For locations outside Mumbai, we do not provide frames to avoid damage during courier transit.
            </p>
          )}
        </div>
      )}

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepLocation;
