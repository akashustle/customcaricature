import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, MessageSquare, Calendar, CreditCard, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Row = ({ icon: Icon, title, desc, checked, onChange }: any) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const NotificationPreferencesPanel = () => {
  const { prefs, loading, update } = useNotificationPreferences();
  if (loading || !prefs) return <div className="text-center py-6 text-sm text-muted-foreground">Loading preferences…</div>;
  return (
    <Card>
      <CardContent className="p-4 divide-y divide-border">
        <Row icon={Bell} title="Admin updates" desc="Announcements, releases, important changes"
          checked={prefs.admin_updates} onChange={(v: boolean) => update({ admin_updates: v })} />
        <Row icon={MessageSquare} title="Replies to my messages" desc="When the support team replies to your contact threads"
          checked={prefs.admin_contact_replies} onChange={(v: boolean) => update({ admin_contact_replies: v })} />
        <Row icon={Calendar} title="EMI due dates" desc="Payment plan installment reminders"
          checked={prefs.emi_due_dates} onChange={(v: boolean) => update({ emi_due_dates: v })} />
        <Row icon={CreditCard} title="Credit card bills" desc="Outstanding balance and bill reminders"
          checked={prefs.credit_card_bills} onChange={(v: boolean) => update({ credit_card_bills: v })} />
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Quiet hours</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">No push notifications during this window.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="time" value={prefs.quiet_hours_start ?? ""} onChange={e => update({ quiet_hours_start: e.target.value || null })} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="time" value={prefs.quiet_hours_end ?? ""} onChange={e => update({ quiet_hours_end: e.target.value || null })} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesPanel;
