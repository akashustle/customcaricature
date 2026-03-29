declare global {
  interface Window {
    Razorpay: any;
    __loadRazorpay?: () => Promise<void>;
  }
}

let loadPromise: Promise<void> | null = null;

export async function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return;

  if (window.__loadRazorpay) {
    await window.__loadRazorpay();
    return;
  }

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load payment gateway. Check your internet connection."));
      document.body.appendChild(s);
    });
  }

  await loadPromise;
}

export function openRazorpay(options: Record<string, any>): void {
  if (!window.Razorpay) {
    throw new Error("Payment gateway not loaded. Please try again.");
  }
  const rzp = new window.Razorpay(options);
  rzp.open();
}

export async function initRazorpay(options: Record<string, any>): Promise<void> {
  await loadRazorpay();
  openRazorpay(options);
}
