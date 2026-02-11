import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STYLES, calculatePrice, formatPrice } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
}

const StepOrderDetails = ({ data, update, onNext }: Props) => {
  const amount = calculatePrice(data.orderType, data.faceCount);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Order Details</h2>
        <p className="text-sm text-muted-foreground font-sans">Configure your caricature order</p>
      </div>

      {/* Order Type */}
      <div className="space-y-3">
        <Label className="font-sans text-base font-semibold">Order Type</Label>
        <div className="grid grid-cols-3 gap-3">
          {(["single", "couple", "group"] as const).map((type) => (
            <Card
              key={type}
              className={`cursor-pointer border-2 transition-all ${data.orderType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              onClick={() => {
                const fc = type === "single" ? 1 : type === "couple" ? 2 : Math.max(data.faceCount, 3);
                update({ orderType: type, faceCount: fc });
              }}
            >
              <CardContent className="p-3 text-center">
                <p className="font-sans font-semibold text-sm capitalize">{type}</p>
                <p className="text-xs text-muted-foreground font-sans">
                  {type === "group" ? `${formatPrice(3000)}/face` :
                    formatPrice(calculatePrice(type, type === "couple" ? 2 : 1))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Face count for group */}
      {data.orderType === "group" && (
        <div>
          <Label className="font-sans">Number of Faces</Label>
          <Input
            type="number"
            min={3}
            value={data.faceCount}
            onChange={(e) => update({ faceCount: Math.max(3, parseInt(e.target.value) || 3) })}
          />
        </div>
      )}

      {/* Style */}
      <div>
        <Label className="font-sans">Style / Theme</Label>
        <Select value={data.style} onValueChange={(v) => update({ style: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <Label className="font-sans">Any theme / reference / idea (optional)</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Describe any specific ideas, themes, or references..."
          rows={3}
        />
      </div>

      {/* Price display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-sans font-medium">Estimated Price</span>
          <span className="font-display text-2xl font-bold text-primary">{formatPrice(amount)}</span>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepOrderDetails;
