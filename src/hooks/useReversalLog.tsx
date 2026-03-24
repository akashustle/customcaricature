import { supabase } from "@/integrations/supabase/client";

interface ReversalLogParams {
  entityType: string;
  entityId?: string;
  actionType: "create" | "update" | "delete" | "status_change" | "toggle" | "setting_change" | "role_change" | "restore";
  sourcePanel: "main_admin" | "workshop_admin" | "shop_admin" | "user_dashboard" | "system";
  performedBy?: string;
  role?: string;
  previousData?: any;
  newData?: any;
  fullSnapshot?: any;
}

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(ua);
  return `${isMobile ? "Mobile" : "Desktop"} | ${ua.slice(0, 120)}`;
};

export const logReversalAction = async (params: ReversalLogParams) => {
  try {
    const { data: logData, error: logError } = await supabase
      .from("reversal_logs" as any)
      .insert({
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        action_type: params.actionType,
        source_panel: params.sourcePanel,
        performed_by: params.performedBy || "unknown",
        role: params.role || "admin",
        device_info: getDeviceInfo(),
        ip_address: null,
      } as any)
      .select("id")
      .single();

    if (logError || !logData) {
      console.warn("Reversal log insert failed:", logError);
      return null;
    }

    const logId = (logData as any).id;

    // Count existing versions for this entity
    let version = 1;
    if (params.entityId) {
      const { count } = await supabase
        .from("reversal_snapshots" as any)
        .select("id", { count: "exact", head: true })
        .eq("log_id", logId) as any;
      version = (count || 0) + 1;
    }

    await supabase.from("reversal_snapshots" as any).insert({
      log_id: logId,
      previous_data: params.previousData || null,
      new_data: params.newData || null,
      full_snapshot: params.fullSnapshot || null,
      version,
    } as any);

    return logId;
  } catch (err) {
    console.warn("Reversal logging error (non-fatal):", err);
    return null;
  }
};

export const useReversalLog = (sourcePanel: ReversalLogParams["sourcePanel"], performedBy?: string, role?: string) => {
  const log = (params: Omit<ReversalLogParams, "sourcePanel" | "performedBy" | "role">) => {
    return logReversalAction({
      ...params,
      sourcePanel,
      performedBy: performedBy || "unknown",
      role: role || "admin",
    });
  };

  return { log };
};
