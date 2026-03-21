import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  action: string;
  details: string;
  onConfirm: (adminName: string) => Promise<void>;
  onCancel: () => void;
}

const AdminActionConfirm = ({ open, action, details, onConfirm, onCancel }: Props) => {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = sessionStorage.getItem("admin_action_name") || "";
      setName(stored);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    await onConfirm(name.trim());
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Confirm Action
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-sans font-medium">{action}</p>
            {details && <p className="text-xs text-muted-foreground font-sans">{details}</p>}
          </div>
          <div>
            <Label className="text-sm font-sans">Enter your name to confirm</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminActionConfirm;
