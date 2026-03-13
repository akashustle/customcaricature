import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Instagram, Calendar, Clock, Briefcase, Edit2, Save, X } from "lucide-react";

const WorkshopProfile = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    instagram_id: user.instagram_id || "",
    age: user.age?.toString() || "",
    occupation: user.occupation || "",
  });

  const dm = darkMode;
  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";
  const itemBg = dm ? "bg-white/5 border-white/5" : "bg-purple-50/40 border-purple-100/20";
  const iconBg = dm ? "bg-purple-500/20" : "bg-gradient-to-br from-purple-200/60 to-pink-200/60";
  const inputClass = dm ? "bg-white/10 border-white/10 text-white" : "bg-white border-purple-100";

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("workshop_users" as any).update({
      name: form.name,
      email: form.email || null,
      mobile: form.mobile,
      instagram_id: form.instagram_id || null,
      age: form.age ? parseInt(form.age) : null,
      occupation: form.occupation || null,
    } as any).eq("id", user.id);

    if (error) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } else {
      // Update localStorage
      const updated = { ...user, ...form, age: form.age ? parseInt(form.age) : null };
      localStorage.setItem("workshop_user", JSON.stringify(updated));
      toast({ title: "✅ Profile Updated!" });
      setEditing(false);
    }
    setSaving(false);
  };

  const details = [
    { icon: User, label: "Name", value: user.name, key: "name" },
    { icon: Mail, label: "Email", value: user.email, key: "email" },
    { icon: Phone, label: "Mobile", value: user.mobile, key: "mobile" },
    { icon: Instagram, label: "Instagram", value: user.instagram_id || "—", key: "instagram_id" },
    { icon: User, label: "Age", value: user.age || "—", key: "age" },
    { icon: Briefcase, label: "Occupation", value: user.occupation || "—", key: "occupation" },
  ];

  const readOnlyDetails = [
    { icon: Calendar, label: "Workshop Date", value: user.workshop_date ? new Date(user.workshop_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    { icon: Clock, label: "Slot", value: user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : user.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : user.slot },
  ];

  return (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${textPrimary} text-lg`}>My Profile</h2>
        <div className="flex items-center gap-2">
          <Badge className={`${dm ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-purple-100 text-purple-600 border-purple-200"} text-xs`}>
            {user.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
          </Badge>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className={`${textMuted} text-xs`}>
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          {details.map((d) => (
            <div key={d.key}>
              <Label className={`${textMuted} text-xs`}>{d.label}</Label>
              <Input
                value={(form as any)[d.key] || ""}
                onChange={e => setForm({ ...form, [d.key]: e.target.value })}
                className={inputClass}
                type={d.key === "age" ? "number" : "text"}
                maxLength={d.key === "mobile" ? 10 : undefined}
              />
            </div>
          ))}
          {/* Read-only fields */}
          {readOnlyDetails.map((d) => (
            <div key={d.label}>
              <Label className={`${textMuted} text-xs`}>{d.label} (cannot be changed)</Label>
              <Input value={d.value} disabled className={`${inputClass} opacity-60`} />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#b08d57] to-[#c9a96e] text-white font-bold">
              <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className={textMuted}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...details.map(d => ({ ...d, value: d.value })), ...readOnlyDetails].map((d) => (
            <div key={d.label} className={`flex items-center gap-3 p-3 rounded-xl ${itemBg} border`}>
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <d.icon className={`w-4 h-4 ${dm ? "text-purple-400" : "text-purple-500"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] ${textMuted} uppercase tracking-wider`}>{d.label}</p>
                <p className={`${textPrimary} text-sm truncate`}>{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkshopProfile;
