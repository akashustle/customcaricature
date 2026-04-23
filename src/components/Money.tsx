import { cn } from "@/lib/utils";

/**
 * Money — displays an amount with green (positive) / red (negative) coloring.
 * Use site-wide for any monetary figure.
 *
 *   <Money value={29999} />            // "₹29,999" green
 *   <Money value={-500} />             // "-₹500" red
 *   <Money value={0} neutral />        // muted color
 */
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

export const Money = ({
  value,
  className,
  neutral = false,
  prefix = "",
  showSign = true,
}: {
  value: number;
  className?: string;
  neutral?: boolean;
  prefix?: string;
  showSign?: boolean;
}) => {
  const isNeg = value < 0;
  const tone = neutral ? "" : isNeg ? "money-neg" : "money";
  const sign = showSign && isNeg ? "-" : "";
  return (
    <span className={cn(tone, className)}>
      {prefix}
      {sign}
      {fmt(value)}
    </span>
  );
};

export default Money;
