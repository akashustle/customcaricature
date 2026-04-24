/**
 * Reusable "Request to Edit My Profile" dialog.
 *
 * Once a user is verified they can no longer edit their own profile (or
 * avatar) until an admin explicitly grants them N edits. They submit a
 * reason from this dialog; the admin sees the request in the Verification
 * Inbox and can approve (granting 1+ edits) or reject.
 *
 * Works for both:
 *   scope="profile"  → public.profile_edit_requests (booking account)
 *   scope="workshop" → public.workshop_edit_requests (workshop student)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Lock, Loader2, Send, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  scope: "profile" | "workshop";
  /** Booking auth.uid for "profile" scope, workshop_users.id for "workshop". */
  userId: string;
  /** Display name shown in the admin notification. */
  userName?: string | null;
};

const EditRequestDialog = ({ open, onClose, scope, userId, userName }: Props) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      toast({ title: "Add more detail", description: "Please tell us why you need to edit (10+ chars).", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const table = scope === "profile" ? "profile_edit_requests" : "workshop_edit_requests";
      const row: Record<string, any> =
        scope === "profile"
          ? { user_id: userId, reason: trimmed, status: "pending" }
          : { workshop_user_id: userId, reason: trimmed, status: "pending" };

      const { error } = await (supabase.from(table as any) as any).insert(row);
      if (error) throw error;

      // Best-effort: ping admins via notifications table (admin trigger fan-out).
      try {
        const { data: admins } = await (supabase.from("user_roles") as any)
          .select("user_id")
          .eq("role", "admin");
        if (admins && admins.length) {
          await (supabase.from("notifications") as any).insert(
            (admins as { user_id: string }[]).map((a) => ({
              user_id: a.user_id,
              title: "✏️ Profile Edit Requested",
              message: `${userName || "A user"} (${scope}) wants to edit their verified profile.`,
              type: "system",
              link: "/admin-panel",
            })),
          );
        }
      } catch {/* non-fatal */}

      toast({ title: "Request sent", description: "We'll notify you once an admin reviews it." });
      setReason("");
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative"
          >
            <button
              onClick={() => !busy && onClose()}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Request profile edit</h3>
                <p className="text-xs text-slate-500">Your profile is locked because it's verified.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              Tell us briefly what you need to change and why. An admin will review and grant you a limited number of edits.
            </p>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. I moved to a new city and need to update my address & profile photo."
              className="rounded-xl bg-white shadow-none border-slate-200"
              disabled={busy}
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={onClose} disabled={busy} className="rounded-full">Cancel</Button>
              <Button onClick={submit} disabled={busy} className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                {busy ? "Sending…" : "Send request"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditRequestDialog;
