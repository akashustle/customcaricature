import { OrderFormData } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STYLES, formatPrice } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { usePricing } from "@/hooks/usePricing";
import { Loader2 } from "lucide-react";

interface Props {
  data: OrderFormData;
  update: (partial: Partial<OrderFormData>) => void;
  onNext: () => void;
  getPrice?: (orderType: string, faceCount: number) => number;
}

const StepOrderDetails = ({ data, update, onNext, getPrice: externalGetPrice }: Props) => {
  const { types, loading: pricingLoading, getPrice: hookGetPrice, getType } = usePricing();

  const getPrice = externalGetPrice || hookGetPrice;
  const amount = getPrice(data.orderType, data.faceCount);
  const groupType = getType("group");
  const GROUP_MIN_FACES = groupType?.min_faces ?? 3;
  const GROUP_MAX_FACES = groupType?.max_faces ?? 6;

  const handleFaceCountChange = (val: string) => {
    const num = parseInt(val) || 0;
    if (val === "" || num === 0) {
      update({ faceCount: 0 });
    } else {
      update({ faceCount: Math.min(num, GROUP_MAX_FACES) });
    }
  };

  const canProceed = data.orderType !== "group" || data.faceCount >= GROUP_MIN_FACES;

  if (pricingLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
          {(["single", "couple", "group"] as const).map((type) => {
            const typeData = getType(type);
            return (
              <Card
                key={type}
                className={`cursor-pointer border-2 transition-all ${data.orderType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                onClick={() => {
                  const fc = type === "single" ? 1 : type === "couple" ? 2 : Math.max(data.faceCount, GROUP_MIN_FACES);
                  update({ orderType: type, faceCount: fc });
                }}
              >
                <CardContent className="p-3 text-center">
                  <p className="font-sans font-semibold text-sm capitalize">{type}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {formatPrice(getPrice(type, type === "single" ? 1 : type === "couple" ? 2 : (typeData?.min_faces ?? 3)))}
                    {typeData?.per_face ? "/face" : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Face count for group */}
      {data.orderType === "group" && (
        <div>
          <Label className="font-sans">Number of Faces (min {GROUP_MIN_FACES}, max {GROUP_MAX_FACES})</Label>
          <Input
            type="number"
            min={GROUP_MIN_FACES}
            max={GROUP_MAX_FACES}
            value={data.faceCount || ""}
            onChange={(e) => handleFaceCountChange(e.target.value)}
            placeholder={`${GROUP_MIN_FACES}`}
          />
          {data.faceCount > 0 && data.faceCount < GROUP_MIN_FACES && (
            <p className="text-xs text-destructive font-sans mt-1">Minimum {GROUP_MIN_FACES} faces required for group orders</p>
          )}
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
      {canProceed && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex justify-between items-center">
            <span className="font-sans font-medium">Estimated Price</span>
            <span className="font-display text-2xl font-bold text-primary">{formatPrice(amount)}</span>
          </CardContent>
        </Card>
      )}

      <Button onClick={onNext} disabled={!canProceed} className="w-full rounded-full font-sans" size="lg">
        Continue
      </Button>
    </div>
  );
};

export default StepOrderDetails;
