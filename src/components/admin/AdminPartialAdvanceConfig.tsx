import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Save, X, SplitSquareHorizontal } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

const AdminPartialAdvanceConfig = ({ userId, userName, onClose }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [partial1, setPartial1] = useState(0);
  const [partial2, setPartial2] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [userId]);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("user_partial_advance_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as any;
    if (data) {
      setEnabled(data.enabled);
      setPartial1(data.partial_1_amount);
      setPartial2(data.partial_2_amount);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("user_partial_advance_config").upsert({
      user_id: userId,
      enabled,
      partial_1_amount: partial1,
      partial_2_amount: partial2,
    } as any, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Partial Advance Config Saved!" });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-xs text-muted-foreground font-sans py-2">Loading...</p>;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4 text-primary" />
            Partial Advance for {userName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans text-sm font-medium">Enable Partial Advance</p>
            <p className="text-xs text-muted-foreground font-sans">Split advance payment into 2 parts</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-sans">Partial 1 Amount (₹)</Label>
              <Input
                type="number"
                value={partial1}
                onChange={(e) => setPartial1(parseInt(e.target.value) || 0)}
                placeholder="First partial amount"
              />
              <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Pay now</p>
            </div>
            <div>
              <Label className="text-xs font-sans">Partial 2 Amount (₹)</Label>
              <Input
                type="number"
                value={partial2}
                onChange={(e) => setPartial2(parseInt(e.target.value) || 0)}
                placeholder="Second partial amount"
              />
              <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Pay near event date</p>
            </div>
          </div>
        )}
        {enabled && partial1 > 0 && partial2 > 0 && (
          <p className="text-xs text-muted-foreground font-sans bg-muted/50 rounded-lg p-2">
            Total advance: ₹{(partial1 + partial2).toLocaleString("en-IN")} = ₹{partial1.toLocaleString("en-IN")} (now) + ₹{partial2.toLocaleString("en-IN")} (later)
          </p>
        )}
        <Button onClick={handleSave} disabled={saving} className="w-full font-sans" size="sm">
          <Save className="w-3 h-3 mr-1" />{saving ? "Saving..." : "Save Config"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminPartialAdvanceConfig;
