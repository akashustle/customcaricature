import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmCode?: string; // defaults to "DELETE"
}

const SecureDeleteConfirm = ({ open, onClose, onConfirm, title, description, confirmCode = "DELETE" }: Props) => {
  const [step, setStep] = useState(1);
  const [typedCode, setTypedCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setStep(1);
    setTypedCode("");
    onClose();
  };

  const handleFinalConfirm = async () => {
    if (typedCode !== confirmCode) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground font-sans">{description}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="destructive" onClick={() => setStep(2)}>
                <Trash2 className="w-4 h-4 mr-1" /> Yes, Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-destructive">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                ⚠ Final Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm font-semibold text-destructive font-sans">This action cannot be undone!</p>
                <p className="text-xs text-muted-foreground font-sans">
                  Type <span className="font-bold text-destructive">{confirmCode}</span> below to confirm.
                </p>
              </div>
              <Input
                value={typedCode}
                onChange={e => setTypedCode(e.target.value)}
                placeholder={`Type ${confirmCode} to confirm`}
                className="text-center font-mono text-lg tracking-wider"
                autoFocus
                onKeyDown={e => e.key === "Enter" && typedCode === confirmCode && handleFinalConfirm()}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setTypedCode(""); }}>Back</Button>
              <Button variant="destructive" onClick={handleFinalConfirm} disabled={typedCode !== confirmCode || submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Permanently Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SecureDeleteConfirm;
