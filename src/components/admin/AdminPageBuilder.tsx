import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContentBlocks, ContentBlock } from "@/hooks/useContentBlocks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Save, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  Heading1, Type, Image as ImageIcon, MousePointerClick, LayoutGrid,
  Minus, Code2, Loader2, Upload, Sparkles
} from "lucide-react";

/**
 * AdminPageBuilder — a unified visual block builder for any frontend surface.
 * Powers: workshop-builder, dashboard-builder, workshop-dashboard-builder.
 *
 * Block IDs are auto-generated as `pb_<page>_<timestamp>_<rand>`.
 * Renders via <PageBuilderRenderer page={...} />.
 */

const BLOCK_TYPES = [
  { id: "heading", label: "Heading", icon: Heading1, defaults: { text: "Section heading", level: 2, align: "center", color: "" } },
  { id: "paragraph", label: "Paragraph", icon: Type, defaults: { text: "Add your description here.", align: "center", color: "" } },
  { id: "image", label: "Image / Banner", icon: ImageIcon, defaults: { url: "", alt: "", caption: "", height: 320, rounded: true } },
  { id: "button", label: "Button / CTA", icon: MousePointerClick, defaults: { text: "Click me", href: "/", variant: "primary", align: "center" } },
  { id: "card-grid", label: "Card Grid", icon: LayoutGrid, defaults: { columns: 3, cards: [{ title: "Card 1", body: "Description", icon: "Sparkles" }, { title: "Card 2", body: "Description", icon: "Heart" }, { title: "Card 3", body: "Description", icon: "Star" }] } },
  { id: "spacer", label: "Spacer", icon: Minus, defaults: { height: 48 } },
  { id: "html", label: "Raw HTML", icon: Code2, defaults: { html: "<p>Your custom HTML</p>" } },
];

interface Props {
  page: string;          // e.g. "workshop-builder"
  pageLabel: string;     // human label
  bucket?: string;       // storage bucket for image uploads
}

const AdminPageBuilder = ({ page, pageLabel, bucket = "gallery-images" }: Props) => {
  const { blocks, refetch } = useContentBlocks();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, Record<string, any>>>({});

  const pageBlocks = useMemo(
    () => blocks.filter(b => b.page === page).sort((a, b) => a.sort_order - b.sort_order),
    [blocks, page]
  );

  const adminName = sessionStorage.getItem("admin_entered_name") || sessionStorage.getItem("workshop_admin_name") || "Admin";

  const handleAdd = async (type: string) => {
    const def = BLOCK_TYPES.find(t => t.id === type);
    if (!def) return;
    const id = `pb_${page}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const maxOrder = pageBlocks.reduce((m, b) => Math.max(m, b.sort_order), 0);
    const { error } = await supabase.from("content_blocks").insert({
      id, page, block_type: type, content: def.defaults as any,
      is_visible: true, sort_order: maxOrder + 10, updated_by: adminName,
    } as any);
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${def.label} added` });
    refetch();
  };

  const handleSave = async (block: ContentBlock) => {
    setSavingId(block.id);
    const merged = { ...block.content, ...(draftEdits[block.id] || {}) };
    const { error } = await supabase.from("content_blocks")
      .update({ content: merged as any, updated_by: adminName, updated_at: new Date().toISOString() } as any)
      .eq("id", block.id);
    setSavingId(null);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setDraftEdits(p => { const n = { ...p }; delete n[block.id]; return n; });
    toast({ title: "Saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this block? This cannot be undone.")) return;
    const { error } = await supabase.from("content_blocks").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Block deleted" });
    refetch();
  };

  const handleToggle = async (id: string, vis: boolean) => {
    await supabase.from("content_blocks").update({ is_visible: vis, updated_at: new Date().toISOString() } as any).eq("id", id);
  };

  const handleMove = async (block: ContentBlock, dir: -1 | 1) => {
    const idx = pageBlocks.findIndex(b => b.id === block.id);
    const swap = pageBlocks[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("content_blocks").update({ sort_order: swap.sort_order } as any).eq("id", block.id),
      supabase.from("content_blocks").update({ sort_order: block.sort_order } as any).eq("id", swap.id),
    ]);
  };

  const handleImageUpload = async (block: ContentBlock, file: File) => {
    setUploadingId(block.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `pagebuilder/${page}/${block.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setDraftEdits(p => ({ ...p, [block.id]: { ...(p[block.id] || {}), url: data.publicUrl } }));
      toast({ title: "Image uploaded — click Save to apply" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const updateDraft = (id: string, key: string, value: any) => {
    setDraftEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [key]: value } }));
  };

  const getValue = (block: ContentBlock, key: string, fallback: any = "") =>
    draftEdits[block.id]?.[key] ?? block.content?.[key] ?? fallback;

  const hasDraft = (id: string) => Object.keys(draftEdits[id] || {}).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" /> {pageLabel} — Visual Builder
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Add, edit, reorder, hide, or delete blocks. Changes appear live on the site instantly.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">{pageBlocks.length} blocks</Badge>
      </div>

      {/* Add block toolbar */}
      <Card className="bg-card/60 border-border/60">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add block</p>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map(t => (
              <Button key={t.id} size="sm" variant="outline" onClick={() => handleAdd(t.id)} className="gap-1.5">
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocks list */}
      {pageBlocks.length === 0 && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No blocks yet. Add your first block above.</p>
          </CardContent>
        </Card>
      )}

      {pageBlocks.map((block, idx) => {
        const def = BLOCK_TYPES.find(t => t.id === block.block_type);
        const Icon = def?.icon || Type;
        return (
          <Card key={block.id} className={`transition-shadow ${hasDraft(block.id) ? "ring-2 ring-primary/40" : ""}`}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground capitalize">{def?.label || block.block_type}</p>
                    <p className="text-[10px] text-muted-foreground truncate">#{idx + 1} • id: {block.id.slice(-8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => handleMove(block, -1)} disabled={idx === 0} className="h-8 w-8 p-0"><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleMove(block, 1)} disabled={idx === pageBlocks.length - 1} className="h-8 w-8 p-0"><ArrowDown className="w-4 h-4" /></Button>
                  <div className="flex items-center gap-1 px-2">
                    <Switch checked={block.is_visible} onCheckedChange={(v) => handleToggle(block.id, v)} />
                    {block.is_visible ? <Eye className="w-3.5 h-3.5 text-muted-foreground" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(block.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => handleSave(block)} disabled={savingId === block.id || !hasDraft(block.id)} className="h-8 gap-1.5">
                    {savingId === block.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </Button>
                </div>
              </div>

              {/* Editor by type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                {block.block_type === "heading" && <>
                  <Input placeholder="Heading text" value={getValue(block, "text")} onChange={e => updateDraft(block.id, "text", e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={String(getValue(block, "level", 2))} onValueChange={v => updateDraft(block.id, "level", Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>H{n}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={getValue(block, "align", "center")} onValueChange={v => updateDraft(block.id, "align", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Color (optional)" value={getValue(block, "color")} onChange={e => updateDraft(block.id, "color", e.target.value)} />
                  </div>
                </>}

                {block.block_type === "paragraph" && <>
                  <Textarea rows={3} placeholder="Body text" value={getValue(block, "text")} onChange={e => updateDraft(block.id, "text", e.target.value)} className="md:col-span-2" />
                  <Select value={getValue(block, "align", "center")} onValueChange={v => updateDraft(block.id, "align", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="Color (optional, e.g. #555)" value={getValue(block, "color")} onChange={e => updateDraft(block.id, "color", e.target.value)} />
                </>}

                {block.block_type === "image" && <>
                  <div className="md:col-span-2 space-y-2">
                    {getValue(block, "url") && (
                      <img src={getValue(block, "url")} alt="" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                    )}
                    <div className="flex items-center gap-2">
                      <Input placeholder="Image URL" value={getValue(block, "url")} onChange={e => updateDraft(block.id, "url", e.target.value)} className="flex-1" />
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleImageUpload(block, e.target.files[0])} />
                        <Button type="button" size="sm" variant="outline" disabled={uploadingId === block.id} asChild>
                          <span>{uploadingId === block.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  <Input placeholder="Alt text" value={getValue(block, "alt")} onChange={e => updateDraft(block.id, "alt", e.target.value)} />
                  <Input placeholder="Caption" value={getValue(block, "caption")} onChange={e => updateDraft(block.id, "caption", e.target.value)} />
                  <Input type="number" placeholder="Height px" value={getValue(block, "height", 320)} onChange={e => updateDraft(block.id, "height", Number(e.target.value))} />
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={getValue(block, "rounded", true)} onCheckedChange={v => updateDraft(block.id, "rounded", v)} />
                    <span className="text-sm text-muted-foreground">Rounded corners</span>
                  </div>
                </>}

                {block.block_type === "button" && <>
                  <Input placeholder="Button text" value={getValue(block, "text")} onChange={e => updateDraft(block.id, "text", e.target.value)} />
                  <Input placeholder="Link / URL (e.g. /workshop)" value={getValue(block, "href")} onChange={e => updateDraft(block.id, "href", e.target.value)} />
                  <Select value={getValue(block, "variant", "primary")} onValueChange={v => updateDraft(block.id, "variant", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                      <SelectItem value="gradient">Gradient (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={getValue(block, "align", "center")} onValueChange={v => updateDraft(block.id, "align", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                  </Select>
                </>}

                {block.block_type === "card-grid" && <>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Columns:</span>
                      <Select value={String(getValue(block, "columns", 3))} onValueChange={v => updateDraft(block.id, "columns", Number(v))}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => {
                        const cards = [...(getValue(block, "cards", []))];
                        cards.push({ title: "New card", body: "Description", icon: "Sparkles" });
                        updateDraft(block.id, "cards", cards);
                      }}><Plus className="w-3.5 h-3.5 mr-1" />Add card</Button>
                    </div>
                    {(getValue(block, "cards", []) as any[]).map((c, ci) => (
                      <div key={ci} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border border-border/60 rounded-lg">
                        <Input className="md:col-span-3" placeholder="Title" value={c.title || ""} onChange={e => {
                          const cards = [...(getValue(block, "cards", []))];
                          cards[ci] = { ...cards[ci], title: e.target.value };
                          updateDraft(block.id, "cards", cards);
                        }} />
                        <Input className="md:col-span-7" placeholder="Body" value={c.body || ""} onChange={e => {
                          const cards = [...(getValue(block, "cards", []))];
                          cards[ci] = { ...cards[ci], body: e.target.value };
                          updateDraft(block.id, "cards", cards);
                        }} />
                        <Input className="md:col-span-1" placeholder="Icon" value={c.icon || ""} onChange={e => {
                          const cards = [...(getValue(block, "cards", []))];
                          cards[ci] = { ...cards[ci], icon: e.target.value };
                          updateDraft(block.id, "cards", cards);
                        }} />
                        <Button size="sm" variant="ghost" className="md:col-span-1 text-destructive" onClick={() => {
                          const cards = [...(getValue(block, "cards", []))];
                          cards.splice(ci, 1);
                          updateDraft(block.id, "cards", cards);
                        }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                </>}

                {block.block_type === "spacer" && <>
                  <Input type="number" placeholder="Height in pixels" value={getValue(block, "height", 48)} onChange={e => updateDraft(block.id, "height", Number(e.target.value))} />
                </>}

                {block.block_type === "html" && <>
                  <Textarea rows={5} className="md:col-span-2 font-mono text-xs" placeholder="<div>Custom HTML…</div>" value={getValue(block, "html")} onChange={e => updateDraft(block.id, "html", e.target.value)} />
                </>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminPageBuilder;
