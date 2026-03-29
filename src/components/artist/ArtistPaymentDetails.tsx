import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Wallet, Save, Loader2, CheckCircle2 } from "lucide-react";

type PaymentDetails = {
  upi_id: string;
  upi_number: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_account_name: string;
  default_payment_method: string;
};

const ArtistPaymentDetails = ({ artistId }: { artistId: string }) => {
  const [details, setDetails] = useState<PaymentDetails>({
    upi_id: "", upi_number: "", bank_account_number: "",
    bank_ifsc_code: "", bank_account_name: "", default_payment_method: "upi_id",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("artist_payment_details" as any)
        .select("*").eq("artist_id", artistId).maybeSingle();
      if (data) {
        const d = data as any;
        setDetails({
          upi_id: d.upi_id || "",
          upi_number: d.upi_number || "",
          bank_account_number: d.bank_account_number || "",
          bank_ifsc_code: d.bank_ifsc_code || "",
          bank_account_name: d.bank_account_name || "",
          default_payment_method: d.default_payment_method || "upi_id",
        });
      }
      setLoaded(true);
    };
    fetch();
  }, [artistId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("artist_payment_details" as any).upsert({
      artist_id: artistId,
      ...details,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "artist_id" });
    
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else toast({ title: "Payment details saved! ✅" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="font-display text-base font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> Payment Details
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-sans">UPI ID</Label>
              <Input value={details.upi_id} onChange={e => setDetails(d => ({ ...d, upi_id: e.target.value }))}
                placeholder="example@upi" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-sans">UPI Mobile Number</Label>
              <Input value={details.upi_number} onChange={e => setDetails(d => ({ ...d, upi_number: e.target.value }))}
                placeholder="9876543210" className="h-9 text-sm" />
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-sans font-semibold text-muted-foreground">Bank Account Details</p>
            <div>
              <Label className="text-xs font-sans">Account Holder Name</Label>
              <Input value={details.bank_account_name} onChange={e => setDetails(d => ({ ...d, bank_account_name: e.target.value }))}
                placeholder="Full name as per bank" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-sans">Account Number</Label>
                <Input value={details.bank_account_number} onChange={e => setDetails(d => ({ ...d, bank_account_number: e.target.value }))}
                  placeholder="Bank account number" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-sans">IFSC Code</Label>
                <Input value={details.bank_ifsc_code} onChange={e => setDetails(d => ({ ...d, bank_ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Label className="text-xs font-sans">Default Payment Method</Label>
            <Select value={details.default_payment_method} onValueChange={v => setDetails(d => ({ ...d, default_payment_method: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upi_id">UPI ID</SelectItem>
                <SelectItem value="upi_number">UPI Mobile Number</SelectItem>
                <SelectItem value="bank_account">Bank Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-xl font-sans">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Payment Details</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistPaymentDetails;
