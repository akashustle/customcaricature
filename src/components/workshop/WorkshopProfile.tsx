import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Instagram, Calendar, Clock, Briefcase, Edit2, Save, X, CreditCard, MapPin, Key, Camera, Loader2 } from "lucide-react";

const WorkshopProfile = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<any>(user);
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    instagram_id: user.instagram_id || "",
    age: user.age?.toString() || "",
    occupation: user.occupation || "",
    gender: user.gender || "",
    why_join: user.why_join || "",
  });

  useEffect(() => {
    setProfileData(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      instagram_id: user.instagram_id || "",
      age: user.age?.toString() || "",
      occupation: user.occupation || "",
      gender: user.gender || "",
      why_join: user.why_join || "",
    });
  }, [user]);

  const dm = darkMode;
  const cardBg = dm ? "bg-card/80 border-border" : "bg-card border-border";
  const textPrimary = dm ? "text-foreground font-bold" : "text-foreground font-bold";
  const textMuted = dm ? "text-muted-foreground" : "text-muted-foreground";
  const itemBg = dm ? "bg-muted/30 border-border" : "bg-muted/20 border-border";
  const iconBg = dm ? "bg-primary/20" : "bg-primary/15";
  const inputClass = dm ? "bg-background border-border text-foreground" : "bg-background border-border";

  const callUpdate = async (extra: Record<string, any>) => {
    const payload = {
      user_id: profileData.id,
      login_mobile: profileData.mobile || "",
      login_email: profileData.email || "",
      ...extra,
    };
    return supabase.functions.invoke("workshop-update-profile", { body: payload });
  };

  const applyUpdated = (updated: any) => {
    setProfileData(updated);
    localStorage.setItem("workshop_user", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("workshop-user-updated", { detail: updated }));
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 4 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profileData.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;

      const { data, error } = await callUpdate({
        name: form.name, email: form.email || null, mobile: form.mobile,
        instagram_id: form.instagram_id || null,
        age: form.age ? parseInt(form.age, 10) : null,
        occupation: form.occupation || null, gender: form.gender || null,
        why_join: form.why_join || null,
        avatar_url: url,
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Upload failed");
      applyUpdated(data.user || { ...profileData, avatar_url: url });
      toast({ title: "✅ Photo updated" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await callUpdate({
      name: form.name,
      email: form.email || null,
      mobile: form.mobile,
      instagram_id: form.instagram_id || null,
      age: form.age ? parseInt(form.age, 10) : null,
      occupation: form.occupation || null,
      gender: form.gender || null,
      why_join: form.why_join || null,
    });
    if (error || !data?.success) {
      toast({ title: "Error updating profile", description: data?.error || error?.message || "Please try again.", variant: "destructive" });
      setSaving(false);
      return;
    }
    applyUpdated(data.user || { ...profileData, ...form, age: form.age ? parseInt(form.age, 10) : null });
    toast({ title: "✅ Profile Updated!" });
    setEditing(false);
    setSaving(false);
  };

  const details = [
    { icon: User, label: "Name", value: profileData.name, key: "name" },
    { icon: Mail, label: "Email", value: profileData.email, key: "email" },
    { icon: Phone, label: "Mobile", value: profileData.mobile, key: "mobile" },
    { icon: Instagram, label: "Instagram", value: profileData.instagram_id || "—", key: "instagram_id" },
    { icon: User, label: "Age", value: profileData.age || "—", key: "age" },
    { icon: Briefcase, label: "Occupation", value: profileData.occupation || "—", key: "occupation" },
    { icon: User, label: "Gender", value: profileData.gender || "—", key: "gender" },
    { icon: User, label: "Why Join", value: profileData.why_join || "—", key: "why_join" },
  ];

  const readOnlyDetails = [
    {
      icon: Calendar,
      label: "Workshop Date",
      value: profileData.workshop_date
        ? new Date(profileData.workshop_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
    },
    { icon: Clock, label: "Slot",
      value: profileData.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : profileData.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : profileData.slot,
    },
    { icon: MapPin, label: "Location", value: [profileData.city, profileData.state, profileData.country].filter(Boolean).join(", ") || "—" },
    { icon: Key, label: "Secret Code", value: profileData.secret_code || "—" },
  ];

  const paymentInfo = [
    { icon: CreditCard, label: "Payment Status", value: (profileData.payment_status || "pending").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    { icon: CreditCard, label: "Amount Paid", value: profileData.payment_amount ? `₹${profileData.payment_amount}` : "—" },
  ];

  const initials = (profileData.name || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-3xl p-5 shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.25)]`}>
      {/* Avatar header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <Avatar className="w-20 h-20 border-2 border-primary/40 shadow-lg">
            <AvatarImage src={profileData.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition"
            aria-label="Change profile photo"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`${textPrimary} text-xl truncate`}>{profileData.name || "Workshop Student"}</h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] mt-1">
            {profileData.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
          </Badge>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className={`${textMuted} text-xs rounded-xl`}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {details.map((d) => (
            <div key={d.key}>
              <Label className={`${textMuted} text-xs`}>{d.label}</Label>
              <Input
                value={(form as any)[d.key] || ""}
                onChange={(e) => setForm({ ...form, [d.key]: e.target.value })}
                className={inputClass}
                type={d.key === "age" ? "number" : "text"}
                maxLength={d.key === "mobile" ? 10 : undefined}
              />
            </div>
          ))}
          {readOnlyDetails.map((d) => (
            <div key={d.label}>
              <Label className={`${textMuted} text-xs`}>{d.label} (cannot be changed)</Label>
              <Input value={d.value} disabled className={`${inputClass} opacity-60`} />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className={`${textMuted} rounded-xl`}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...details.map((d) => ({ ...d, value: d.value })), ...readOnlyDetails].map((d) => (
            <div key={d.label} className={`flex items-center gap-3 p-3 rounded-xl ${itemBg} border shadow-sm`}>
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                <d.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] ${textMuted} uppercase tracking-wider`}>{d.label}</p>
                <p className={`${textPrimary} text-sm truncate`}>{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Details Section */}
      <div className="mt-6 pt-4 border-t border-border">
        <h3 className={`${textPrimary} text-base mb-3`}>💳 Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paymentInfo.map((d) => (
            <div key={d.label} className={`flex items-center gap-3 p-3 rounded-xl ${itemBg} border shadow-sm`}>
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                <d.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] ${textMuted} uppercase tracking-wider`}>{d.label}</p>
                <p className={`${textPrimary} text-sm truncate`}>{d.value}</p>
              </div>
            </div>
          ))}
        </div>
        {profileData.payment_status === "pending" && (
          <p className={`text-xs ${textMuted} mt-2`}>Payment status will be updated once confirmed by admin.</p>
        )}
      </div>
    </div>
  );
};

export default WorkshopProfile;
