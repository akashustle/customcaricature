import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormFields, FormField } from "@/hooks/useFormFields";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, GripVertical, FormInput, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

const FORMS = [
  { id: "registration", label: "User Registration" },
  { id: "enquiry", label: "Enquiry Form" },
  { id: "event_booking", label: "Event Booking" },
  { id: "order", label: "Caricature Order" },
  { id: "workshop_registration", label: "Workshop Registration" },
  { id: "support", label: "Support Form" },
];

const FIELD_TYPES = [
  { id: "text", label: "Text Input" },
  { id: "email", label: "Email" },
  { id: "tel", label: "Phone" },
  { id: "number", label: "Number" },
  { id: "textarea", label: "Text Area" },
  { id: "select", label: "Dropdown" },
  { id: "date", label: "Date Picker" },
  { id: "file", label: "File Upload" },
  { id: "checkbox", label: "Checkbox" },
  { id: "radio", label: "Radio Group" },
];

const DEFAULT_FIELDS: Record<string, Partial<FormField>[]> = {
  registration: [
    { field_key: "full_name", label: "Full Name", field_type: "text", placeholder: "Enter your full name", is_required: true },
    { field_key: "email", label: "Email Address", field_type: "email", placeholder: "you@example.com", is_required: true },
    { field_key: "mobile", label: "WhatsApp Number", field_type: "tel", placeholder: "+91 9876543210", is_required: true },
    { field_key: "password", label: "Password", field_type: "text", placeholder: "Min 6 characters", is_required: true },
    { field_key: "instagram_id", label: "Instagram ID", field_type: "text", placeholder: "@yourhandle", is_required: false },
    { field_key: "city", label: "City", field_type: "text", placeholder: "Your city", is_required: false },
    { field_key: "state", label: "State", field_type: "select", placeholder: "Select state", is_required: false },
    { field_key: "gender", label: "Gender", field_type: "select", placeholder: "Select gender", is_required: false, options: { items: ["Male", "Female", "Other"] } },
    { field_key: "age", label: "Age", field_type: "number", placeholder: "Your age", is_required: false },
  ],
  enquiry: [
    { field_key: "name", label: "Your Name", field_type: "text", placeholder: "Full name", is_required: true },
    { field_key: "mobile", label: "Mobile", field_type: "tel", placeholder: "+91...", is_required: true },
    { field_key: "email", label: "Email", field_type: "email", placeholder: "you@email.com", is_required: false },
    { field_key: "enquiry_type", label: "Enquiry Type", field_type: "select", placeholder: "Select type", is_required: true, options: { items: ["Caricature Order", "Event Booking", "Workshop", "Other"] } },
    { field_key: "event_date", label: "Event Date", field_type: "date", placeholder: "Select date", is_required: false },
    { field_key: "city", label: "City", field_type: "text", placeholder: "Your city", is_required: false },
    { field_key: "state", label: "State", field_type: "select", placeholder: "Select state", is_required: false },
    { field_key: "budget", label: "Budget (₹)", field_type: "number", placeholder: "Approximate budget", is_required: false },
    { field_key: "instagram_id", label: "Instagram ID", field_type: "text", placeholder: "@handle", is_required: false },
  ],
  event_booking: [
    { field_key: "client_name", label: "Client Name", field_type: "text", placeholder: "Full name", is_required: true },
    { field_key: "client_email", label: "Email", field_type: "email", placeholder: "you@email.com", is_required: true },
    { field_key: "client_mobile", label: "Mobile", field_type: "tel", placeholder: "+91...", is_required: true },
    { field_key: "event_type", label: "Event Type", field_type: "select", placeholder: "Select event type", is_required: true, options: { items: ["Wedding", "Birthday", "Corporate", "College Fest", "Other"] } },
    { field_key: "event_date", label: "Event Date", field_type: "date", placeholder: "Select date", is_required: true },
    { field_key: "event_start_time", label: "Start Time", field_type: "text", placeholder: "HH:MM", is_required: true },
    { field_key: "event_end_time", label: "End Time", field_type: "text", placeholder: "HH:MM", is_required: true },
    { field_key: "venue_name", label: "Venue Name", field_type: "text", placeholder: "Venue", is_required: true },
    { field_key: "full_address", label: "Full Address", field_type: "textarea", placeholder: "Complete address", is_required: true },
    { field_key: "city", label: "City", field_type: "text", placeholder: "City", is_required: true },
    { field_key: "state", label: "State", field_type: "select", placeholder: "Select state", is_required: true },
    { field_key: "pincode", label: "Pincode", field_type: "text", placeholder: "6-digit pin", is_required: true },
    { field_key: "artist_count", label: "Number of Artists", field_type: "number", placeholder: "1", is_required: true },
    { field_key: "notes", label: "Special Notes", field_type: "textarea", placeholder: "Any special requirements", is_required: false },
    { field_key: "client_instagram", label: "Instagram", field_type: "text", placeholder: "@handle", is_required: false },
  ],
  order: [
    { field_key: "customer_name", label: "Your Name", field_type: "text", placeholder: "Full name", is_required: true },
    { field_key: "customer_email", label: "Email", field_type: "email", placeholder: "you@email.com", is_required: true },
    { field_key: "customer_mobile", label: "Mobile", field_type: "tel", placeholder: "+91...", is_required: true },
    { field_key: "caricature_type", label: "Caricature Type", field_type: "select", placeholder: "Select type", is_required: true },
    { field_key: "order_type", label: "Order Type", field_type: "select", placeholder: "Select", is_required: true, options: { items: ["Single", "Couple", "Group"] } },
    { field_key: "style", label: "Art Style", field_type: "select", placeholder: "Select style", is_required: true, options: { items: ["Cute", "Romantic", "Fun", "Royal", "Minimal", "Artist's Choice"] } },
    { field_key: "face_count", label: "Number of Faces", field_type: "number", placeholder: "1", is_required: true },
    { field_key: "photos", label: "Upload Photos", field_type: "file", placeholder: "Upload clear photos", is_required: true },
    { field_key: "notes", label: "Special Instructions", field_type: "textarea", placeholder: "Any special requests", is_required: false },
    { field_key: "delivery_address", label: "Delivery Address", field_type: "textarea", placeholder: "Full address", is_required: true },
    { field_key: "delivery_city", label: "City", field_type: "text", placeholder: "City", is_required: true },
    { field_key: "delivery_state", label: "State", field_type: "select", placeholder: "Select state", is_required: true },
    { field_key: "delivery_pincode", label: "Pincode", field_type: "text", placeholder: "6-digit pin", is_required: true },
  ],
  workshop_registration: [
    { field_key: "full_name", label: "Full Name", field_type: "text", placeholder: "Your name", is_required: true },
    { field_key: "email", label: "Email", field_type: "email", placeholder: "you@email.com", is_required: true },
    { field_key: "mobile", label: "Mobile", field_type: "tel", placeholder: "+91...", is_required: true },
    { field_key: "batch", label: "Select Batch", field_type: "select", placeholder: "Choose batch", is_required: true },
    { field_key: "experience", label: "Drawing Experience", field_type: "select", placeholder: "Select level", is_required: false, options: { items: ["Beginner", "Intermediate", "Advanced"] } },
  ],
  support: [
    { field_key: "name", label: "Your Name", field_type: "text", placeholder: "Full name", is_required: true },
    { field_key: "email", label: "Email", field_type: "email", placeholder: "you@email.com", is_required: true },
    { field_key: "subject", label: "Subject", field_type: "text", placeholder: "Brief subject", is_required: true },
    { field_key: "category", label: "Category", field_type: "select", placeholder: "Select category", is_required: true, options: { items: ["Order Issue", "Payment", "Event Booking", "Workshop", "General"] } },
    { field_key: "message", label: "Message", field_type: "textarea", placeholder: "Describe your issue", is_required: true },
    { field_key: "order_id", label: "Order / Booking ID", field_type: "text", placeholder: "If applicable", is_required: false },
  ],
};

const AdminFormBuilder = () => {
  const [activeForm, setActiveForm] = useState("registration");
  const { allFields, addField, updateField, deleteField, loading: fieldsLoading } = useFormFields(activeForm);
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState({ field_key: "", label: "", field_type: "text", placeholder: "", is_required: false, options: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [seeding, setSeeding] = useState(false);

  const seedDefaults = async () => {
    if (seeding) return;
    setSeeding(true);
    const defaults = DEFAULT_FIELDS[activeForm] || [];
    for (let i = 0; i < defaults.length; i++) {
      const f = defaults[i];
      await addField({ ...f, sort_order: i } as any);
    }
    toast({ title: `${defaults.length} default fields seeded` });
    setSeeding(false);
  };

  const handleAdd = async () => {
    if (!newField.field_key || !newField.label) {
      toast({ title: "Field key and label required", variant: "destructive" });
      return;
    }
    const opts = newField.options ? newField.options.split(",").map(o => o.trim()).filter(Boolean) : null;
    await addField({
      field_key: newField.field_key,
      label: newField.label,
      field_type: newField.field_type,
      placeholder: newField.placeholder,
      is_required: newField.is_required,
      options: opts ? { items: opts } : null,
    });
    toast({ title: "Field added" });
    setShowAdd(false);
    setNewField({ field_key: "", label: "", field_type: "text", placeholder: "", is_required: false, options: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const opts = editData.optionsStr ? editData.optionsStr.split(",").map((o: string) => o.trim()).filter(Boolean) : null;
    await updateField(editingId, {
      label: editData.label,
      field_type: editData.field_type,
      placeholder: editData.placeholder,
      is_required: editData.is_required,
      is_visible: editData.is_visible,
      options: opts ? { items: opts } : editData.options,
    });
    toast({ title: "Field updated" });
    setEditingId(null);
  };

  const moveField = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= allFields.length) return;
    const a = allFields[idx];
    const b = allFields[target];
    await updateField(a.id, { sort_order: b.sort_order } as any);
    await updateField(b.id, { sort_order: a.sort_order } as any);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground font-sans">
            <FormInput className="w-5 h-5 text-primary" /> Form Builder
          </h2>
          <p className="text-xs text-muted-foreground font-sans">Add, remove, and reorder fields on any form</p>
        </div>
        <div className="flex gap-2">
          {allFields.length === 0 && !fieldsLoading && (
            <Button size="sm" variant="outline" onClick={seedDefaults} disabled={seeding}>
              <RefreshCw className={`w-4 h-4 mr-1 ${seeding ? "animate-spin" : ""}`} /> Load Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans">
            <Plus className="w-4 h-4 mr-1" /> Add Field
          </Button>
        </div>
      </div>

      {/* Form Selector */}
      <div className="flex gap-2 flex-wrap">
        {FORMS.map(f => (
          <Button key={f.id} variant={activeForm === f.id ? "default" : "outline"} size="sm"
            onClick={() => { setActiveForm(f.id); setEditingId(null); }}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Add Field Form */}
      {showAdd && (
        <Card className="bg-card border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Field key (e.g. company_name)" value={newField.field_key} onChange={e => setNewField(p => ({ ...p, field_key: e.target.value }))} className="bg-background border-border text-foreground font-sans" />
              <Input placeholder="Label (e.g. Company Name)" value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} className="bg-background border-border text-foreground font-sans" />
              <Select value={newField.field_type} onValueChange={v => setNewField(p => ({ ...p, field_type: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Placeholder text" value={newField.placeholder} onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))} className="bg-background border-border text-foreground font-sans" />
            </div>
            {(newField.field_type === "select" || newField.field_type === "radio") && (
              <Input placeholder="Options (comma-separated)" value={newField.options} onChange={e => setNewField(p => ({ ...p, options: e.target.value }))} className="bg-background border-border text-foreground font-sans" />
            )}
            <div className="flex items-center gap-3">
              <Switch checked={newField.is_required} onCheckedChange={v => setNewField(p => ({ ...p, is_required: v }))} />
              <span className="text-sm text-foreground font-sans">Required</span>
              <Button size="sm" onClick={handleAdd} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground font-sans"><Save className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields List */}
      {allFields.length === 0 && !fieldsLoading && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <FormInput className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground font-sans">No fields for this form yet</p>
            <p className="text-xs mt-1 text-muted-foreground/70 font-sans">Click "Load Defaults" to populate with current frontend fields, or add custom fields</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {allFields.map((field, idx) => (
          <Card key={field.id} className={`bg-card border-border transition-all ${!field.is_visible ? "opacity-50" : ""}`}>
            <CardContent className="py-3 px-4">
              {editingId === field.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={editData.label || ""} onChange={e => setEditData((p: any) => ({ ...p, label: e.target.value }))} placeholder="Label" className="bg-background border-border text-foreground font-sans" />
                    <Select value={editData.field_type || "text"} onValueChange={v => setEditData((p: any) => ({ ...p, field_type: v }))}>
                      <SelectTrigger className="bg-background border-border text-foreground font-sans"><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={editData.placeholder || ""} onChange={e => setEditData((p: any) => ({ ...p, placeholder: e.target.value }))} placeholder="Placeholder" className="bg-background border-border text-foreground font-sans" />
                    {(editData.field_type === "select" || editData.field_type === "radio") && (
                      <Input value={editData.optionsStr || ""} onChange={e => setEditData((p: any) => ({ ...p, optionsStr: e.target.value }))} placeholder="Options (comma-separated)" className="bg-background border-border text-foreground font-sans" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={editData.is_required} onCheckedChange={v => setEditData((p: any) => ({ ...p, is_required: v }))} />
                      <span className="text-xs text-foreground font-sans">Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editData.is_visible} onCheckedChange={v => setEditData((p: any) => ({ ...p, is_visible: v }))} />
                      <span className="text-xs text-foreground font-sans">Visible</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans"><Save className="w-3 h-3 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-muted-foreground font-sans">Cancel</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveField(idx, 1)} disabled={idx === allFields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                    setEditingId(field.id);
                    setEditData({ ...field, optionsStr: field.options?.items?.join(", ") || "" });
                  }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground font-sans">{field.label}</span>
                      <code className="text-[10px] font-mono bg-muted text-primary px-1.5 py-0.5 rounded">{field.field_key}</code>
                      <Badge variant="secondary" className="text-[10px] font-sans">{FIELD_TYPES.find(t => t.id === field.field_type)?.label || field.field_type}</Badge>
                      {field.is_required && <Badge className="text-[10px] bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 border-0 font-sans">Required</Badge>}
                    </div>
                    {field.placeholder && <p className="text-xs text-muted-foreground mt-0.5 font-sans">{field.placeholder}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => {
                    deleteField(field.id);
                    toast({ title: "Field removed" });
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminFormBuilder;
