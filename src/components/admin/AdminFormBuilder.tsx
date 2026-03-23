import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormFields } from "@/hooks/useFormFields";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, GripVertical, FormInput, ArrowUp, ArrowDown } from "lucide-react";

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

const AdminFormBuilder = () => {
  const [activeForm, setActiveForm] = useState("registration");
  const { allFields, addField, updateField, deleteField } = useFormFields(activeForm);
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState({ field_key: "", label: "", field_type: "text", placeholder: "", is_required: false, options: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

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
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FormInput className="w-5 h-5 text-primary" /> Form Builder
          </h2>
          <p className="text-xs text-muted-foreground">Add, remove, and reorder fields on any form</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Add Field
        </Button>
      </div>

      {/* Form Selector */}
      <div className="flex gap-2 flex-wrap">
        {FORMS.map(f => (
          <Button key={f.id} variant={activeForm === f.id ? "default" : "outline"} size="sm" onClick={() => setActiveForm(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Add Field Form */}
      {showAdd && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Field key (e.g. company_name)" value={newField.field_key} onChange={e => setNewField(p => ({ ...p, field_key: e.target.value }))} />
              <Input placeholder="Label (e.g. Company Name)" value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} />
              <Select value={newField.field_type} onValueChange={v => setNewField(p => ({ ...p, field_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Placeholder text" value={newField.placeholder} onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))} />
            </div>
            {(newField.field_type === "select" || newField.field_type === "radio") && (
              <Input placeholder="Options (comma-separated)" value={newField.options} onChange={e => setNewField(p => ({ ...p, options: e.target.value }))} />
            )}
            <div className="flex items-center gap-3">
              <Switch checked={newField.is_required} onCheckedChange={v => setNewField(p => ({ ...p, is_required: v }))} />
              <span className="text-sm">Required</span>
              <Button size="sm" onClick={handleAdd} className="ml-auto"><Save className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields List */}
      {allFields.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FormInput className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No custom fields for this form</p>
            <p className="text-xs mt-1">Add fields to customize the {FORMS.find(f => f.id === activeForm)?.label}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {allFields.map((field, idx) => (
          <Card key={field.id} className={`transition-all ${!field.is_visible ? "opacity-50" : ""}`}>
            <CardContent className="py-3 px-4">
              {editingId === field.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={editData.label || ""} onChange={e => setEditData((p: any) => ({ ...p, label: e.target.value }))} placeholder="Label" />
                    <Select value={editData.field_type || "text"} onValueChange={v => setEditData((p: any) => ({ ...p, field_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={editData.placeholder || ""} onChange={e => setEditData((p: any) => ({ ...p, placeholder: e.target.value }))} placeholder="Placeholder" />
                    {(editData.field_type === "select" || editData.field_type === "radio") && (
                      <Input value={editData.optionsStr || ""} onChange={e => setEditData((p: any) => ({ ...p, optionsStr: e.target.value }))} placeholder="Options (comma-separated)" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={editData.is_required} onCheckedChange={v => setEditData((p: any) => ({ ...p, is_required: v }))} />
                      <span className="text-xs">Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editData.is_visible} onCheckedChange={v => setEditData((p: any) => ({ ...p, is_visible: v }))} />
                      <span className="text-xs">Visible</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}><Save className="w-3 h-3 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveField(idx, 1)} disabled={idx === allFields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                    setEditingId(field.id);
                    setEditData({
                      ...field,
                      optionsStr: field.options?.items?.join(", ") || "",
                    });
                  }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{field.label}</span>
                      <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">{field.field_key}</code>
                      <Badge variant="secondary" className="text-[10px]">{FIELD_TYPES.find(t => t.id === field.field_type)?.label || field.field_type}</Badge>
                      {field.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                    </div>
                    {field.placeholder && <p className="text-xs text-muted-foreground mt-0.5">{field.placeholder}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
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
