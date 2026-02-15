export const INDIA_STATES_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Kolhapur", "Solapur", "Navi Mumbai"],
  "Delhi": ["New Delhi"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Ajmer"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Noida", "Varanasi", "Ghaziabad"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Karnal"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamsala"],
  "Jammu & Kashmir": ["Srinagar", "Jammu"],
  "Tripura": ["Agartala"],
  "Meghalaya": ["Shillong"],
  "Manipur": ["Imphal"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Mizoram": ["Aizawl"],
  "Arunachal Pradesh": ["Itanagar"],
  "Sikkim": ["Gangtok"],
};

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "birthday", label: "Birthday Party" },
  { value: "other", label: "Other Event" },
] as const;

// Fallback pricing (used when DB pricing is not yet loaded)
export const EVENT_PRICING = {
  mumbai: {
    1: { total: 30000, advance: 20000 },
    2: { total: 50000, advance: 35000 },
  },
  outside: {
    1: { total: 40000, advance: 25000 },
    2: { total: 70000, advance: 45000 },
  },
  extraHourRateMumbai: 4000,
  extraHourRateOutside: 5000,
} as const;

export type EventPricingRow = {
  id: string;
  region: string;
  artist_count: number;
  total_price: number;
  advance_amount: number;
  extra_hour_rate: number;
  valid_until: string | null;
};

export function getEventPrice(
  isMumbai: boolean,
  artistCount: 1 | 2,
  extraHours: number,
  dbPricing?: EventPricingRow[]
): { total: number; advance: number; extraHourRate: number } {
  // Try DB pricing first
  if (dbPricing && dbPricing.length > 0) {
    const region = isMumbai ? "mumbai" : "outside";
    const row = dbPricing.find(p => p.region === region && p.artist_count === artistCount);
    if (row) {
      const extraCost = extraHours * row.extra_hour_rate;
      return {
        total: row.total_price + extraCost,
        advance: row.advance_amount,
        extraHourRate: row.extra_hour_rate,
      };
    }
  }
  // Fallback to hardcoded
  const region = isMumbai ? EVENT_PRICING.mumbai : EVENT_PRICING.outside;
  const base = region[artistCount];
  const rate = isMumbai ? EVENT_PRICING.extraHourRateMumbai : EVENT_PRICING.extraHourRateOutside;
  const extraCost = extraHours * rate;
  return {
    total: base.total + extraCost,
    advance: base.advance,
    extraHourRate: rate,
  };
}

export const PAYMENT_GATEWAY_CHARGE_PERCENT = 2.6;

export function calculateGatewayCharges(amount: number): number {
  return Math.round(amount * PAYMENT_GATEWAY_CHARGE_PERCENT / 100);
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
