export const PRICING = {
  single: 3499,
  couple: 9499,
  groupPerFace: 3499,
} as const;

export const GROUP_MIN_FACES = 3;
export const GROUP_MAX_FACES = 6;

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
  return PRICING.groupPerFace * Math.max(faceCount, GROUP_MIN_FACES);
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
