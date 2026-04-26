import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { SyncAction, SyncActionType } from "@/lib/sync-queue";

/**
 * Global listener that turns `ccc:sync-success` / `ccc:sync-failed` events
 * (dispatched by sync-queue.ts) into toast notifications. Mounted once
 * inside the Router so the "View" actions can navigate.
 */

const SUCCESS_LABEL: Record<SyncActionType, string> = {
  "auth.signup": "Account created",
  "order.create": "Order synced",
  "event.book": "Event booking synced",
  "image.upload": "Photo uploaded",
  "profile.update": "Profile updated",
};

const FAIL_LABEL: Record<SyncActionType, string> = {
  "auth.signup": "Signup failed to sync",
  "order.create": "Order failed to sync",
  "event.book": "Event booking failed",
  "image.upload": "Photo upload failed",
  "profile.update": "Profile update failed",
};

const SyncToastListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onSuccess = (e: Event) => {
      const action = (e as CustomEvent<{ action: SyncAction }>).detail?.action;
      if (!action) return;
      toast({
        title: `✓ ${SUCCESS_LABEL[action.type] || "Synced"}`,
        description: action.refKey
          ? `Reference: ${action.refKey}`
          : "Your offline changes are now live.",
      });
    };

    const onFail = (e: Event) => {
      const action = (e as CustomEvent<{ action: SyncAction }>).detail?.action;
      if (!action) return;
      const t = toast({
        title: `⚠️ ${FAIL_LABEL[action.type] || "Sync failed"}`,
        description: action.lastError?.slice(0, 140) || "Tap the badge to inspect & retry.",
        variant: "destructive",
        duration: 8000,
      });
      // Auto-route the user to the inspector after a short pause so the
      // notification doubles as a "tap to fix" affordance.
      const timer = setTimeout(() => {
        // Only redirect if user is still online & on a non-admin route
        if (!window.location.pathname.startsWith("/admin")) {
          navigate("/sync-queue");
        }
        t.dismiss();
      }, 6000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("ccc:sync-success", onSuccess);
    window.addEventListener("ccc:sync-failed", onFail);
    return () => {
      window.removeEventListener("ccc:sync-success", onSuccess);
      window.removeEventListener("ccc:sync-failed", onFail);
    };
  }, [navigate]);

  return null;
};

export default SyncToastListener;
