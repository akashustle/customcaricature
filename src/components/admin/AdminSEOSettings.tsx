import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Globe, Search } from "lucide-react";

const PAGES = [
  { id: "home", label: "Homepage", path: "/" },
  { id: "order", label: "Order Caricature", path: "/order" },
  { id: "book-event", label: "Book Event", path: "/book-event" },
  { id: "track-order", label: "Track Order", path: "/track-order" },
  { id: "shop", label: "Shop", path: "/shop" },
  { id: "blog", label: "Blog", path: "/blog" },
  { id: "about", label: "About Us", path: "/about" },
  { id: "enquiry", label: "Enquiry", path: "/enquiry" },
  { id: "support", label: "Support", path: "/support" },
  { id: "workshop", label: "Workshop", path: "/workshop" },
];

type SEOData = {
  id: string;
  page_title: string;
  meta_description: string;
  seo_keywords: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
};

const AdminSEOSettings = () => {
  const [seoData, setSeoData] = useState<SEOData[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SEOData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSEO();
    const ch = supabase.channel("seo-settings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_page_settings" }, fetchSEO)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSEO = async () => {
    const { data } = await supabase.from("seo_page_settings" as any).select("*");
    if (data) setSeoData(data as any[]);
  };

  const handleEdit = (pageId: string) => {
    const existing = seoData.find(s => s.id === pageId);
    setEditing(pageId);
    setEditForm(existing || { id: pageId, page_title: "", meta_description: "", seo_keywords: "", og_title: "", og_description: "", og_image: "" });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await supabase.from("seo_page_settings" as any).upsert({
      id: editing,
      page_title: editForm.page_title || "",
      meta_description: editForm.meta_description || "",
      seo_keywords: editForm.seo_keywords || "",
      og_title: editForm.og_title || null,
      og_description: editForm.og_description || null,
      og_image: editForm.og_image || null,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "id" });
    toast({ title: "SEO settings saved!" });
    setEditing(null);
    setSaving(false);
    fetchSEO();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-bold">Page SEO Settings</h2>
      </div>
      <p className="text-sm text-muted-foreground font-body">Edit SEO title, meta description, keywords, and Open Graph tags for each page.</p>
      
      <div className="grid gap-3">
        {PAGES.map(page => {
          const data = seoData.find(s => s.id === page.id);
          const isEditing = editing === page.id;

          return (
            <Card key={page.id} className="border">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-body font-semibold">{page.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{page.path}</p>
                  </div>
                  <Button size="sm" variant={isEditing ? "default" : "outline"} onClick={() => isEditing ? handleSave() : handleEdit(page.id)} disabled={saving}>
                    {isEditing ? <><Save className="w-3 h-3 mr-1" />Save</> : <><Search className="w-3 h-3 mr-1" />Edit SEO</>}
                  </Button>
                </div>
              </CardHeader>
              {isEditing && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3">
                  <div>
                    <Label className="text-xs font-body">Page Title</Label>
                    <Input value={editForm.page_title || ""} onChange={e => setEditForm(p => ({ ...p, page_title: e.target.value }))} placeholder="Page title for SEO" className="text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-1">{(editForm.page_title || "").length}/60 characters</p>
                  </div>
                  <div>
                    <Label className="text-xs font-body">Meta Description</Label>
                    <Textarea value={editForm.meta_description || ""} onChange={e => setEditForm(p => ({ ...p, meta_description: e.target.value }))} placeholder="Meta description for search results" className="text-sm" rows={2} />
                    <p className="text-[10px] text-muted-foreground mt-1">{(editForm.meta_description || "").length}/160 characters</p>
                  </div>
                  <div>
                    <Label className="text-xs font-body">SEO Keywords</Label>
                    <Input value={editForm.seo_keywords || ""} onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))} placeholder="keyword1, keyword2, keyword3" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Title (Social Sharing)</Label>
                    <Input value={editForm.og_title || ""} onChange={e => setEditForm(p => ({ ...p, og_title: e.target.value }))} placeholder="Title for social sharing" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Description</Label>
                    <Textarea value={editForm.og_description || ""} onChange={e => setEditForm(p => ({ ...p, og_description: e.target.value }))} placeholder="Description for social sharing" className="text-sm" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Image URL</Label>
                    <Input value={editForm.og_image || ""} onChange={e => setEditForm(p => ({ ...p, og_image: e.target.value }))} placeholder="https://..." className="text-sm" />
                  </div>
                  {data && (
                    <p className="text-[10px] text-muted-foreground">Current: {data.page_title || "(not set)"}</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSEOSettings;
