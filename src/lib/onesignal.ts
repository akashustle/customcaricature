// OneSignal Web SDK Integration
// Dynamically loads OneSignal SDK and initializes with app ID from admin settings

let initialized = false;

export const initOneSignal = async (appId: string) => {
  if (initialized || !appId) return;
  
  try {
    // Load OneSignal SDK
    if (!(window as any).OneSignalDeferred) {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
      
      await new Promise<void>((resolve) => {
        script.onload = () => resolve();
        script.onerror = () => resolve(); // Don't block if load fails
      });
    }

    (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false }, // We use our own UI
          serviceWorkerParam: { scope: "/onesignal/" },
          serviceWorkerPath: "OneSignalSDKWorker.js",
        });
        initialized = true;
        console.log("OneSignal initialized with app:", appId);
      } catch (err) {
        console.warn("OneSignal init error:", err);
      }
    });
  } catch (err) {
    console.warn("OneSignal load error:", err);
  }
};

export const setOneSignalExternalId = (userId: string) => {
  try {
    (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.login(userId);
        console.log("OneSignal external ID set:", userId);
      } catch (err) {
        console.warn("OneSignal login error:", err);
      }
    });
  } catch {}
};

export const removeOneSignalExternalId = () => {
  try {
    (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.logout();
      } catch {}
    });
  } catch {}
};

export const setOneSignalTags = (tags: Record<string, string>) => {
  try {
    (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.User.addTags(tags);
      } catch {}
    });
  } catch {}
};

export const promptOneSignalPush = () => {
  try {
    (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        const permission = OneSignal.Notifications.permission;
        if (!permission) {
          await OneSignal.Notifications.requestPermission();
        }
      } catch {}
    });
  } catch {}
};
