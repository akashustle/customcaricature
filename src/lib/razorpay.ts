declare global {
  interface Window {
    Razorpay: any;
    __loadRazorpay?: () => Promise<void>;
  }
}

let loadPromise: Promise<void> | null = null;

export async function loadRazorpay(): Promise<void> {
  // Already available
  if (window.Razorpay) return;

  // Custom loader provided (e.g. by test harness)
  if (window.__loadRazorpay) {
    await window.__loadRazorpay();
    return;
  }

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      // Remove any previous broken script tags
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) existing.remove();

      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => {
        if (window.Razorpay) {
          resolve();
        } else {
          // Script loaded but Razorpay not on window — retry once after short delay
          setTimeout(() => {
            if (window.Razorpay) resolve();
            else {
              loadPromise = null; // allow retry
              reject(new Error("Payment gateway loaded but not initialized. Please try again."));
            }
          }, 500);
        }
      };
      s.onerror = () => {
        loadPromise = null; // Reset so next attempt retries
        reject(new Error("Failed to load payment gateway. Check your internet connection and try again."));
      };
      document.body.appendChild(s);
    });
  }

  try {
    await loadPromise;
  } catch (err) {
    loadPromise = null; // Ensure future calls retry
    throw err;
  }
}

export function openRazorpay(options: Record<string, any>): void {
  if (!window.Razorpay) {
    throw new Error("Payment gateway not loaded. Please refresh the page and try again.");
  }
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (response: any) => {
    console.error("Razorpay payment failed:", response?.error?.description || "Unknown error");
    if (options._onPaymentFailed) {
      options._onPaymentFailed(response);
    }
  });
  rzp.open();
}

export async function initRazorpay(options: Record<string, any>): Promise<void> {
  await loadRazorpay();
  openRazorpay(options);
}

/**
 * Helper to safely invoke create-razorpay-order and extract the response.
 * Throws a clear error message on any failure.
 */
export async function createRazorpayOrder(
  supabase: any,
  body: { amount: number; order_id: string; customer_name: string; customer_email: string; customer_mobile: string; [key: string]: any }
): Promise<{ razorpay_order_id: string; razorpay_key_id: string; amount: number; currency: string }> {
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", { body });

  if (error) {
    console.error("create-razorpay-order invocation error:", error);
    throw new Error("Failed to create payment order. Please try again.");
  }

  if (!data || data.error) {
    const msg = data?.error || "Failed to create payment order";
    console.error("create-razorpay-order returned error:", msg);
    throw new Error(typeof msg === "string" ? msg : "Failed to create payment order. Please try again.");
  }

  if (!data.razorpay_order_id || !data.razorpay_key_id) {
    console.error("create-razorpay-order missing fields:", data);
    throw new Error("Invalid payment order response. Please try again.");
  }

  return data;
}

/**
 * Helper to safely invoke verify-razorpay-payment and extract the response.
 * Throws a clear error message on any failure.
 */
export async function verifyRazorpayPayment(
  supabase: any,
  body: Record<string, any>
): Promise<{ success: boolean; verified: boolean }> {
  const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", { body });

  if (error) {
    console.error("verify-razorpay-payment invocation error:", error);
    throw new Error("Payment verification failed. Please contact support.");
  }

  if (!data || data.error) {
    const msg = data?.error || "Payment verification failed";
    console.error("verify-razorpay-payment returned error:", msg);
    throw new Error(typeof msg === "string" ? msg : "Payment verification failed. Please contact support.");
  }

  if (!data.verified) {
    throw new Error("Payment could not be verified. Please contact support.");
  }

  return data;
}
