export const PRICING = {
  single: 5000,
  couple: 9000,
  groupPerFace: 3000,
} as const;

export const STYLES = [
  { value: "cute", label: "Cute" },
  { value: "romantic", label: "Romantic" },
  { value: "fun", label: "Fun" },
  { value: "royal", label: "Royal" },
  { value: "minimal", label: "Minimal" },
  { value: "artists_choice", label: "Artist's Choice" },
] as const;

export function calculatePrice(
  orderType: "single" | "couple" | "group",
  faceCount: number
): number {
  if (orderType === "single") return PRICING.single;
  if (orderType === "couple") return PRICING.couple;
  return PRICING.groupPerFace * faceCount;
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
