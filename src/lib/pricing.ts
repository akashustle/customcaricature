export const PRICING = {
  digital: {
    single: 3000,
    couple: 9000,
    groupPerFace: 3000,
  },
  physical: {
    single: 5000,
    couple: 9000,
    groupPerFace: 3000,
  },
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
  caricatureType: "digital" | "physical",
  orderType: "single" | "couple" | "group",
  faceCount: number
): number {
  const prices = PRICING[caricatureType];
  if (orderType === "single") return prices.single;
  if (orderType === "couple") return prices.couple;
  return prices.groupPerFace * faceCount;
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
