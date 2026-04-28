import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSharedChannel } from "@/hooks/useSharedChannel";

export type FormField = {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  options: any;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  validation: any;
};

export const useFormFields = (formId: string) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFields = async () => {
    const { data } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", formId)
      .order("sort_order");
    if (data) setFields(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchFields();
  }, [formId]);

  useSharedChannel(() => fetchFields(), { table: "form_fields" });

  const addField = async (field: Partial<FormField>) => {
    const maxSort = fields.length > 0 ? Math.max(...fields.map(f => f.sort_order)) + 1 : 0;
    await supabase.from("form_fields").insert({
      form_id: formId,
      field_key: field.field_key || `field_${Date.now()}`,
      label: field.label || "New Field",
      field_type: field.field_type || "text",
      placeholder: field.placeholder || "",
      options: field.options || null,
      is_required: field.is_required || false,
      is_visible: true,
      sort_order: maxSort,
      validation: field.validation || null,
    } as any);
  };

  const updateField = async (id: string, updates: Partial<FormField>) => {
    await supabase.from("form_fields").update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id);
  };

  const deleteField = async (id: string) => {
    await supabase.from("form_fields").delete().eq("id", id);
  };

  const reorderFields = async (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from("form_fields").update({ sort_order: i } as any).eq("id", orderedIds[i]);
    }
  };

  return { fields: fields.filter(f => f.is_visible), allFields: fields, loading, addField, updateField, deleteField, reorderFields, refetch: fetchFields };
};
