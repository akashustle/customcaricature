import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPrice } from "@/lib/pricing";
import { CheckCircle2, Clock, CreditCard, TrendingUp } from "lucide-react";

interface EventRevenueWidgetProps {
  totalAmount: number;
  advanceAmount: number;
  paymentStatus: string;
  negotiated?: boolean;
  negotiatedTotal?: number | null;
  negotiatedAdvance?: number | null;
  advanceDate?: string;
  fullPaymentDate?: string;
}

const EventRevenueWidget = ({
  totalAmount, advanceAmount, paymentStatus,
  negotiated, negotiatedTotal, negotiatedAdvance,
  advanceDate, fullPaymentDate,
}: EventRevenueWidgetProps) => {
  const effectiveTotal = negotiated && negotiatedTotal ? negotiatedTotal : totalAmount;
  const effectiveAdvance = negotiated && negotiatedAdvance ? negotiatedAdvance : advanceAmount;
  const fullyPaid = paymentStatus === "fully_paid";
  const advancePaid = paymentStatus === "confirmed" || fullyPaid;
  const paidAmount = fullyPaid ? effectiveTotal : advancePaid ? effectiveAdvance : 0;
  const remaining = effectiveTotal - paidAmount;
  const progressPercent = effectiveTotal > 0 ? Math.round((paidAmount / effectiveTotal) * 100) : 0;

  const milestones = [
    { label: "Booking", done: true, icon: CheckCircle2 },
    { label: "Advance Paid", done: advancePaid, icon: CreditCard },
    { label: "Fully Paid", done: fullyPaid, icon: TrendingUp },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide">Revenue Impact</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fullyPaid ? "bg-green-100 text-green-800" : advancePaid ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
            {progressPercent}% collected
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-[10px] font-sans text-muted-foreground">
            <span>Paid: {formatPrice(paidAmount)}</span>
            <span>Total: {formatPrice(effectiveTotal)}</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex items-center justify-between">
          {milestones.map((m, i) => (
            <div key={m.label} className="flex flex-col items-center gap-1 flex-1">
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center ${m.done ? "bg-green-100" : "bg-muted"}`}>
                <m.icon className={`w-4 h-4 ${m.done ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[9px] font-sans text-center ${m.done ? "text-green-700 font-semibold" : "text-muted-foreground"}`}>{m.label}</span>
              {i < milestones.length - 1 && (
                <div className={`absolute h-0.5 w-8 ${m.done ? "bg-green-300" : "bg-muted"}`} style={{ display: "none" }} />
              )}
            </div>
          ))}
        </div>

        {/* Remaining balance */}
        {!fullyPaid && remaining > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-sans text-amber-800">
              Remaining: <span className="font-bold">{formatPrice(remaining)}</span>
            </p>
          </div>
        )}

        {/* Payment dates */}
        {(advanceDate || fullPaymentDate) && (
          <div className="text-[10px] font-sans text-muted-foreground space-y-0.5 border-t border-border pt-2">
            {advanceDate && <p>Advance: {new Date(advanceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
            {fullPaymentDate && <p>Full Payment: {new Date(fullPaymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventRevenueWidget;
