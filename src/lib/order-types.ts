export interface OrderFormData {
  // Step 1
  caricatureType: "digital" | "physical";

  // Location (physical only)
  country: string;
  state: string;
  city: string;
  district: string;

  // Customer details
  customerName: string;
  customerMobile: string;
  customerEmail: string;

  // Order details
  orderType: "single" | "couple" | "group";
  faceCount: number;
  style: string;
  notes: string;

  // Photos
  photos: File[];

  // Delivery address (physical only)
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPincode: string;
}

export const initialFormData: OrderFormData = {
  caricatureType: "digital",
  country: "India",
  state: "",
  city: "",
  district: "",
  customerName: "",
  customerMobile: "",
  customerEmail: "",
  orderType: "single",
  faceCount: 1,
  style: "artists_choice",
  notes: "",
  photos: [],
  deliveryAddress: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryPincode: "",
};
