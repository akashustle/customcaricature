export interface OrderFormData {
  // Location
  country: string;
  state: string;
  city: string;
  district: string;

  // Customer details
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  instagramId: string;

  // Order details
  orderType: "single" | "couple" | "group";
  faceCount: number;
  style: string;
  notes: string;

  // Photos
  photos: File[];
  referencePhotos: File[];

  // Delivery address
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPincode: string;
}

export const initialFormData: OrderFormData = {
  country: "India",
  state: "",
  city: "",
  district: "",
  customerName: "",
  customerMobile: "",
  customerEmail: "",
  instagramId: "",
  orderType: "single",
  faceCount: 1,
  style: "artists_choice",
  notes: "",
  photos: [],
  referencePhotos: [],
  deliveryAddress: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryPincode: "",
};
