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

export const EVENT_PRICING = {
  mumbai: {
    1: { total: 30000, advance: 20000 },
    2: { total: 50000, advance: 35000 },
  },
  outside: {
    1: { total: 40000, advance: 25000 },
    2: { total: 70000, advance: 45000 },
  },
  extraHourRate: 5000,
} as const;

export function getEventPrice(isMumbai: boolean, artistCount: 1 | 2, extraHours: number) {
  const region = isMumbai ? EVENT_PRICING.mumbai : EVENT_PRICING.outside;
  const base = region[artistCount];
  const extraCost = extraHours * EVENT_PRICING.extraHourRate;
  return {
    total: base.total + extraCost,
    advance: base.advance,
  };
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
