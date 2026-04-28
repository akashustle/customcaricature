import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHomepageBlocks, invalidateHomepageBlocks, type HomepageBlock } from "@/hooks/useHomepageBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  GripVertical, Eye, EyeOff, Trash2, Copy, Plus, Pencil, Upload, ExternalLink,
  RefreshCcw, Sparkles, Image as ImageIcon, Layout, Type, AlignLeft,
  Square as SquareIcon, Grid3x3, MousePointerClick, Code as CodeIcon, Video as VideoIcon, Star, Heart, Trophy, Calendar,
  ChevronUp, ChevronDown, Download, Upload as UploadIcon,
} from "lucide-react";
import AssetPicker from "@/components/admin/AssetPicker";

/* ----------------------------- Block library ------------------------------ */

type BlockDef = {
  type: string;
  label: string;
  description: string;
  icon: any;
  group: "section" | "content";
  defaultContent: Record<string, any>;
};

const BLOCK_LIBRARY: BlockDef[] = [
  // Canonical homepage sections
  { type: "hero",           label: "Hero",                description: "Top hero with title, CTAs, image marquee", icon: Sparkles, group: "section",
    defaultContent: { eyebrow: "INDIA'S #1 LIVE CARICATURE STUDIO", title: "Unforgettable live caricatures, delivered with style.", subtitle: "Wedding, corporate & private events across India and worldwide.", cta_primary: "Book an event", cta_secondary: "Get instant quote" } },
  { type: "video",          label: "Video",               description: "Watch live MP4/YouTube embed", icon: VideoIcon, group: "section",
    defaultContent: { enabled: true, custom_video_url: "", youtube_url: "" } },
  { type: "gallery",        label: "Event Gallery",       description: "Grid of recent event photos", icon: ImageIcon, group: "section", defaultContent: {} },
  { type: "clients",        label: "Trusted Brands",      description: "Logos of clients we've worked with", icon: Layout, group: "section", defaultContent: {} },
  { type: "about",          label: "About Us",            description: "Story, stats and brand intro", icon: AlignLeft, group: "section",
    defaultContent: { eyebrow: "About • About", title_pre: "Who is", title_highlight: "Creative Caricature?", body: "" } },
  { type: "services",       label: "Services",            description: "Service cards (event types)", icon: Grid3x3, group: "section",
    defaultContent: { eyebrow: "Services • Services", title_pre: "What we", title_highlight: "do best", subtitle: "", cta_label: "Book for your event", items: [] } },
  { type: "how",            label: "How It Starts",       description: "3-step booking process", icon: Layout, group: "section",
    defaultContent: { eyebrow: "Onboarding • Onboarding", title_pre: "How it", title_highlight: "starts?", cta_label: "Start your booking", steps: [] } },
  { type: "why",            label: "Why Unique",          description: "Why choose us — value props", icon: Sparkles, group: "section",
    defaultContent: { eyebrow: "Special • Special", title_pre: "What makes us", title_highlight: "unique?", subtitle: "", others_label: "OTHERS", ours_label: "CREATIVE CARICATURE CLUB", others: [], ours: [] } },
  { type: "reviews",        label: "Reviews",             description: "Customer testimonials", icon: Star, group: "section",
    defaultContent: { eyebrow: "Reviews • Reviews", title_pre: "Hear from", title_highlight: "them", items: [] } },
  { type: "faqs",           label: "FAQs",                description: "Frequently asked questions", icon: AlignLeft, group: "section",
    defaultContent: { eyebrow: "Help • Help", title_pre: "Need", title_highlight: "help?", items: [] } },
  { type: "still_confused", label: "Still Confused?",     description: "Final help / contact CTA", icon: MousePointerClick, group: "section", defaultContent: {} },
  // Generic content blocks
  { type: "heading",        label: "Heading",             description: "Bold section heading", icon: Type, group: "content",
    defaultContent: { text: "New heading", level: 2, align: "center" } },
  { type: "paragraph",      label: "Paragraph",           description: "Plain text paragraph", icon: AlignLeft, group: "content",
    defaultContent: { text: "Add some descriptive text here.", align: "center" } },
  { type: "image",          label: "Image",               description: "Standalone full-width image", icon: ImageIcon, group: "content",
    defaultContent: { url: "", alt: "", height: 360, rounded: true } },
  { type: "button",         label: "Button / CTA",        description: "Clickable button", icon: MousePointerClick, group: "content",
    defaultContent: { text: "Click me", href: "/book-event", variant: "gradient", align: "center" } },
  { type: "card_grid",      label: "Card Grid",           description: "Grid of icon + title + body cards", icon: Grid3x3, group: "content",
    defaultContent: { title: "", columns: 3, cards: [
      { icon: "Sparkles", title: "Card 1", body: "Body text" },
      { icon: "Star",     title: "Card 2", body: "Body text" },
      { icon: "Heart",    title: "Card 3", body: "Body text" },
    ] } },
  { type: "spacer",         label: "Spacer",              description: "Vertical space between blocks", icon: SquareIcon, group: "content",
    defaultContent: { height: 48 } },
  { type: "html",           label: "Custom HTML",         description: "Embed raw HTML", icon: CodeIcon, group: "content",
    defaultContent: { html: "<p>Custom HTML</p>" } },
];

const findDef = (type: string) => BLOCK_LIBRARY.find(b => b.type === type);

/* ------------------------------ Default seed ------------------------------ */

const DEFAULT_SEED: { type: string; title: string }[] = [
  { type: "hero",           title: "Hero" },
  { type: "video",          title: "Watch the experience" },
  { type: "gallery",        title: "Event Gallery" },
  { type: "clients",        title: "Trusted Brands" },
  { type: "about",          title: "About Us" },
  { type: "services",       title: "Services" },
  { type: "how",            title: "How It Starts" },
  { type: "why",            title: "Why Choose Us" },
  { type: "reviews",        title: "Reviews" },
  { type: "faqs",           title: "FAQs" },
  { type: "still_confused", title: "Still Confused?" },
];

/* =============================== Component =============================== */

const HomepageBuilder = () => {
  const { toast } = useToast();
  const { blocks, refetch, loading } = useHomepageBlocks();
  const [editing, setEditing] = useState<HomepageBlock | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ----------- One-time auto-seed: if no blocks yet, populate ----------- */
  useEffect(() => {
    if (loading) return;
    if (blocks.length > 0) return;
    (async () => {
      const rows = DEFAULT_SEED.map((s, i) => ({
        block_type: s.type,
        title: s.title,
        content: findDef(s.type)?.defaultContent || {},
        is_visible: true,
        sort_order: i * 10,
      }));
      const { error } = await supabase.from("homepage_blocks").insert(rows as any);
      if (error) {
        toast({ title: "Seed failed", description: error.message, variant: "destructive" });
      } else {
        invalidateHomepageBlocks();
        refetch();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  /* --------------------------- CRUD operations -------------------------- */

  const addBlock = async (type: string) => {
    const def = findDef(type)!;
    const maxOrder = blocks.reduce((m, b) => Math.max(m, b.sort_order), 0);
    setBusy(true);
    const { error } = await supabase.from("homepage_blocks").insert({
      block_type: type,
      title: def.label,
      content: def.defaultContent,
      is_visible: true,
      sort_order: maxOrder + 10,
    } as any);
    setBusy(false);
    if (error) {
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
      return;
    }
    setAddOpen(false);
    invalidateHomepageBlocks();
    refetch();
    toast({ title: "Block added", description: def.label });
  };

  const updateBlock = async (id: string, patch: Partial<HomepageBlock>) => {
    const { error } = await supabase.from("homepage_blocks").update(patch as any).eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return false;
    }
    invalidateHomepageBlocks();
    refetch();
    return true;
  };

  const toggleVisible = async (b: HomepageBlock) => {
    await updateBlock(b.id, { is_visible: !b.is_visible });
  };

  const duplicateBlock = async (b: HomepageBlock) => {
    const { error } = await supabase.from("homepage_blocks").insert({
      block_type: b.block_type,
      title: (b.title || findDef(b.block_type)?.label || "Block") + " (copy)",
      content: b.content,
      is_visible: b.is_visible,
      sort_order: b.sort_order + 1,
    } as any);
    if (error) {
      toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidateHomepageBlocks();
    refetch();
    toast({ title: "Duplicated" });
  };

  const deleteBlock = async (id: string) => {
    if (!confirm("Delete this block? This cannot be undone.")) return;
    const { error } = await supabase.from("homepage_blocks").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidateHomepageBlocks();
    refetch();
    toast({ title: "Deleted" });
  };

  const onDragEnd = async (res: DropResult) => {
    if (!res.destination) return;
    const reordered = Array.from(blocks);
    const [moved] = reordered.splice(res.source.index, 1);
    reordered.splice(res.destination.index, 0, moved);
    // Re-stamp sort_order in tens, then persist
    const updates = reordered.map((b, i) => ({ id: b.id, sort_order: i * 10 }));
    // optimistic — Supabase realtime will refresh
    for (const u of updates) {
      await supabase.from("homepage_blocks").update({ sort_order: u.sort_order } as any).eq("id", u.id);
    }
    invalidateHomepageBlocks();
    refetch();
  };

  const resetToDefaults = async () => {
    if (!confirm("Reset homepage to default layout? All custom blocks will be deleted.")) return;
    setBusy(true);
    await supabase.from("homepage_blocks").delete().gte("sort_order", -1);
    const rows = DEFAULT_SEED.map((s, i) => ({
      block_type: s.type,
      title: s.title,
      content: findDef(s.type)?.defaultContent || {},
      is_visible: true,
      sort_order: i * 10,
    }));
    await supabase.from("homepage_blocks").insert(rows as any);
    setBusy(false);
    invalidateHomepageBlocks();
    refetch();
    toast({ title: "Reset to defaults" });
  };

  /* ------------------------------- Render ------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layout className="w-6 h-6 text-primary" />
            Homepage Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Click any block to edit content, images and visibility. Add or remove anything.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/", "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" /> View live
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={busy}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Block
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a Block</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {(["section", "content"] as const).map(group => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {group === "section" ? "Homepage Sections" : "Generic Blocks"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {BLOCK_LIBRARY.filter(b => b.group === group).map(def => {
                        const I = def.icon;
                        return (
                          <button
                            key={def.type}
                            onClick={() => addBlock(def.type)}
                            disabled={busy}
                            className="text-left p-3 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <I className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-semibold text-foreground">{def.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{def.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Block list */}
      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading blocks…</Card>
      ) : blocks.length === 0 ? (
        <Card className="p-8 text-center">
          <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No blocks yet. Click <strong>Add Block</strong> to start.</p>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="hp-blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {blocks.map((b, idx) => {
                  const def = findDef(b.block_type);
                  const I = def?.icon || Layout;
                  return (
                    <Draggable key={b.id} draggableId={b.id} index={idx}>
                      {(p, snapshot) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          className={`rounded-xl border bg-card p-3 flex items-center gap-3 transition-shadow ${
                            snapshot.isDragging ? "shadow-2xl border-primary" : "border-border"
                          } ${!b.is_visible ? "opacity-60" : ""}`}
                        >
                          <button
                            {...p.dragHandleProps}
                            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                            aria-label="Drag"
                          >
                            <GripVertical className="w-5 h-5" />
                          </button>
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <I className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground truncate">
                                {b.title || def?.label || b.block_type}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase">{b.block_type}</Badge>
                              {!b.is_visible && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {def?.description || "Custom block"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => toggleVisible(b)} title={b.is_visible ? "Hide" : "Show"}>
                              {b.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(b)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => duplicateBlock(b)} title="Duplicate">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteBlock(b.id)} title="Delete" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {editing && (
        <BlockEditorDialog
          block={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const ok = await updateBlock(editing.id, patch);
            if (ok) {
              setEditing(null);
              toast({ title: "Saved" });
            }
          }}
        />
      )}
    </div>
  );
};

export default HomepageBuilder;

/* ============================ Block Editor =============================== */

const BlockEditorDialog = ({
  block, onClose, onSave,
}: {
  block: HomepageBlock;
  onClose: () => void;
  onSave: (patch: Partial<HomepageBlock>) => Promise<void>;
}) => {
  const [title, setTitle] = useState(block.title || "");
  const [visible, setVisible] = useState(block.is_visible);
  const [content, setContent] = useState<Record<string, any>>(block.content || {});
  const def = findDef(block.block_type);

  const set = (k: string, v: any) => setContent(prev => ({ ...prev, [k]: v }));

  const fields = useMemo(() => buildFields(block.block_type, content), [block.block_type, content]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" /> Edit: {def?.label || block.block_type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>Internal title (admin only)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hero" />
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
              <Switch checked={visible} onCheckedChange={setVisible} />
              <Label className="cursor-pointer">{visible ? "Visible on site" : "Hidden"}</Label>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            {fields.map(f => (
              <FieldRenderer key={f.key} field={f} value={content[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                This block has no editable settings — it pulls from existing site data automatically.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ title, is_visible: visible, content })}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ----------------------------- Field schemas ----------------------------- */

type Field =
  | { key: string; type: "text"; label: string; placeholder?: string }
  | { key: string; type: "textarea"; label: string; placeholder?: string }
  | { key: string; type: "image"; label: string }
  | { key: string; type: "video"; label: string }
  | { key: string; type: "url"; label: string; placeholder?: string }
  | { key: string; type: "number"; label: string; min?: number; max?: number }
  | { key: string; type: "switch"; label: string }
  | { key: string; type: "select"; label: string; options: { value: string; label: string }[] }
  | { key: string; type: "html"; label: string }
  | { key: string; type: "cards"; label: string }
  | { key: string; type: "string_list"; label: string; placeholder?: string }
  | { key: string; type: "items"; label: string; schema: { key: string; label: string; type?: "text" | "textarea" | "image" }[] };

const buildFields = (blockType: string, _content: Record<string, any>): Field[] => {
  switch (blockType) {
    case "hero":
      return [
        { key: "chip_text",          type: "text",     label: "Chip text" },
        { key: "headline",           type: "textarea", label: "Headline" },
        { key: "headline_highlight", type: "text",     label: "Highlight word (will be coloured inside headline)" },
        { key: "subtext",            type: "textarea", label: "Subtext / description" },
        { key: "primary_cta",        type: "text",     label: "Primary button text" },
        { key: "primary_cta_link",   type: "url",      label: "Primary button link" },
        { key: "secondary_cta",      type: "text",     label: "Secondary button text" },
        { key: "secondary_cta_link", type: "url",      label: "Secondary button link" },
        { key: "pricing_line",       type: "text",     label: "Pricing strip line (optional)" },
        { key: "urgency_text",       type: "text",     label: "Urgency line (optional)" },
      ];
    case "video":
      return [
        { key: "enabled",          type: "switch", label: "Show video section" },
        { key: "custom_video_url", type: "video",  label: "Upload / pick MP4 video (preferred)" },
        { key: "youtube_url",      type: "url",    label: "YouTube URL (used if no MP4)" },
      ];
    case "about":
      return [
        { key: "eyebrow",         type: "text",     label: "Eyebrow" },
        { key: "title_pre",       type: "text",     label: "Title (before highlight)" },
        { key: "title_highlight", type: "text",     label: "Title (highlight word)" },
        { key: "body",            type: "textarea", label: "Body" },
        { key: "quote",           type: "textarea", label: "Quote (right card)" },
        { key: "signoff_name",    type: "text",     label: "Quote signoff name" },
        { key: "signoff_role",    type: "text",     label: "Quote signoff role" },
        { key: "signoff_initial", type: "text",     label: "Signoff initial (1 char)" },
        { key: "rating_value",    type: "text",     label: "Rating value (e.g. 4.9)" },
        { key: "rating_count",    type: "text",     label: "Rating count text" },
      ];
    case "services":
      return [
        { key: "eyebrow",         type: "text", label: "Eyebrow" },
        { key: "title_pre",       type: "text", label: "Title (before highlight)" },
        { key: "title_highlight", type: "text", label: "Title (highlight word)" },
        { key: "subtitle",        type: "textarea", label: "Subtitle" },
        { key: "cta_label",       type: "text", label: "Bottom CTA button text" },
        { key: "items",           type: "items", label: "Service cards", schema: [
          { key: "icon",  label: "Icon (Calendar/Sparkles/Trophy/Heart/Users/Award/Star)" },
          { key: "title", label: "Title" },
          { key: "body",  label: "Body", type: "textarea" },
        ] },
      ];
    case "how":
      return [
        { key: "eyebrow",         type: "text", label: "Eyebrow" },
        { key: "title_pre",       type: "text", label: "Title (before highlight)" },
        { key: "title_highlight", type: "text", label: "Title (highlight word)" },
        { key: "cta_label",       type: "text", label: "CTA button text" },
        { key: "steps",           type: "items", label: "Steps", schema: [
          { key: "n",     label: "Number" },
          { key: "title", label: "Title" },
          { key: "body",  label: "Body", type: "textarea" },
        ] },
      ];
    case "why":
      return [
        { key: "eyebrow",         type: "text", label: "Eyebrow" },
        { key: "title_pre",       type: "text", label: "Title (before highlight)" },
        { key: "title_highlight", type: "text", label: "Title (highlight word)" },
        { key: "subtitle",        type: "text", label: "Subtitle" },
        { key: "others_label",    type: "text", label: "Left column label" },
        { key: "ours_label",      type: "text", label: "Right column label" },
        { key: "others",          type: "string_list", label: "Other studios bullets", placeholder: "Slow turnaround time" },
        { key: "ours",            type: "string_list", label: "Our bullets",            placeholder: "On-time, every time" },
      ];
    case "reviews":
      return [
        { key: "eyebrow",         type: "text", label: "Eyebrow" },
        { key: "title_pre",       type: "text", label: "Title (before highlight)" },
        { key: "title_highlight", type: "text", label: "Title (highlight word)" },
        { key: "items",           type: "items", label: "Reviews", schema: [
          { key: "name", label: "Name" },
          { key: "role", label: "Role / Event" },
          { key: "text", label: "Review text", type: "textarea" },
        ] },
      ];
    case "faqs":
      return [
        { key: "eyebrow",         type: "text", label: "Eyebrow" },
        { key: "title_pre",       type: "text", label: "Title (before highlight)" },
        { key: "title_highlight", type: "text", label: "Title (highlight word)" },
        { key: "items",           type: "items", label: "Questions", schema: [
          { key: "q", label: "Question" },
          { key: "a", label: "Answer", type: "textarea" },
        ] },
      ];
    case "still_confused":
      return [
        { key: "eyebrow",         type: "text",     label: "Eyebrow" },
        { key: "title_pre",       type: "text",     label: "Title (before highlight)" },
        { key: "title_highlight", type: "text",     label: "Title (highlight word)" },
        { key: "subtitle",        type: "textarea", label: "Subtitle" },
        { key: "whatsapp_label",  type: "text",     label: "WhatsApp button text" },
        { key: "instagram_label", type: "text",     label: "Instagram button text" },
      ];
    case "heading":
      return [
        { key: "text",  type: "text", label: "Heading text" },
        { key: "level", type: "number", label: "Level (1=largest, 4=smallest)", min: 1, max: 4 },
        { key: "align", type: "select", label: "Alignment", options: [
          { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
        ] },
      ];
    case "paragraph":
      return [
        { key: "text",  type: "textarea", label: "Text" },
        { key: "align", type: "select",   label: "Alignment", options: [
          { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
        ] },
      ];
    case "image":
      return [
        { key: "url",     type: "image",  label: "Image" },
        { key: "alt",     type: "text",   label: "Alt text" },
        { key: "height",  type: "number", label: "Height (px)", min: 120, max: 800 },
        { key: "caption", type: "text",   label: "Caption (optional)" },
      ];
    case "button":
      return [
        { key: "text",    type: "text",   label: "Button text" },
        { key: "href",    type: "url",    label: "Link" },
        { key: "variant", type: "select", label: "Style", options: [
          { value: "gradient", label: "Gradient" },
          { value: "primary",  label: "Primary" },
          { value: "outline",  label: "Outline" },
          { value: "ghost",    label: "Ghost" },
        ] },
        { key: "align",   type: "select", label: "Alignment", options: [
          { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
        ] },
      ];
    case "card_grid":
      return [
        { key: "title",   type: "text",   label: "Section title (optional)" },
        { key: "columns", type: "number", label: "Columns (1–4)", min: 1, max: 4 },
        { key: "cards",   type: "cards",  label: "Cards" },
      ];
    case "spacer":
      return [{ key: "height", type: "number", label: "Height (px)", min: 8, max: 400 }];
    case "html":
      return [{ key: "html", type: "html", label: "Custom HTML" }];
    default:
      return [];
  }
};

/* ----------------------------- Field renderer ---------------------------- */

const FieldRenderer = ({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) => {
  switch (field.type) {
    case "text":
      return (
        <div>
          <Label>{field.label}</Label>
          <Input value={value || ""} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label>{field.label}</Label>
          <Textarea value={value || ""} placeholder={field.placeholder} rows={3} onChange={e => onChange(e.target.value)} />
        </div>
      );
    case "url":
      return (
        <div>
          <Label>{field.label}</Label>
          <Input type="url" value={value || ""} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div>
          <Label>{field.label}</Label>
          <Input type="number" min={field.min} max={field.max} value={value ?? ""} onChange={e => onChange(Number(e.target.value))} />
        </div>
      );
    case "switch":
      return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
          <Label className="cursor-pointer">{field.label}</Label>
          <Switch checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "select":
      return (
        <div>
          <Label>{field.label}</Label>
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {field.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    case "html":
      return (
        <div>
          <Label>{field.label}</Label>
          <Textarea value={value || ""} rows={6} className="font-mono text-xs" onChange={e => onChange(e.target.value)} />
        </div>
      );
    case "image":
      return <AssetPicker label={field.label} value={value} onChange={onChange} kind="image" />;
    case "video":
      return <AssetPicker label={field.label} value={value} onChange={onChange} kind="video" />;
    case "cards":
      return <CardsField label={field.label} value={value} onChange={onChange} />;
    case "string_list":
      return <StringListField label={field.label} value={value} onChange={onChange} placeholder={field.placeholder} />;
    case "items":
      return <ItemsField label={field.label} value={value} onChange={onChange} schema={field.schema} />;
  }
};

/* --------------------------- String list field --------------------------- */

const StringListField = ({ label, value, onChange, placeholder }: { label: string; value: any; onChange: (v: string[]) => void; placeholder?: string }) => {
  const list: string[] = Array.isArray(value) ? value : [];
  const update = (i: number, v: string) => onChange(list.map((s, idx) => idx === i ? v : s));
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, ""]);
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {list.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input value={s} placeholder={placeholder} onChange={e => update(i, e.target.value)} />
            <Button size="sm" variant="ghost" onClick={() => remove(i)} className="text-destructive shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------- Items field ----------------------------- */

const ItemsField = ({ label, value, onChange, schema }: {
  label: string;
  value: any;
  onChange: (v: any[]) => void;
  schema: { key: string; label: string; type?: "text" | "textarea" | "image" }[];
}) => {
  const items: any[] = Array.isArray(value) ? value : [];
  const update = (i: number, patch: any) => onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => {
    const blank: any = {};
    schema.forEach(f => { blank[f.key] = ""; });
    onChange([...items, blank]);
  };
  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => moveUp(i)} className="h-7" disabled={i === 0}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(i)} className="h-7 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {schema.map(f => (
              <div key={f.key}>
                {f.type === "image" ? (
                  <AssetPicker label={f.label} value={item[f.key]} onChange={v => update(i, { [f.key]: v })} kind="image" />
                ) : f.type === "textarea" ? (
                  <>
                    <Label className="text-xs">{f.label}</Label>
                    <Textarea rows={2} value={item[f.key] || ""} onChange={e => update(i, { [f.key]: e.target.value })} />
                  </>
                ) : (
                  <>
                    <Label className="text-xs">{f.label}</Label>
                    <Input value={item[f.key] || ""} onChange={e => update(i, { [f.key]: e.target.value })} />
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-2" /> Add item
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------ Cards field ------------------------------ */

const CardsField = ({ label, value, onChange }: { label: string; value: any[]; onChange: (v: any[]) => void }) => {
  const cards = Array.isArray(value) ? value : [];
  const setCard = (i: number, patch: any) =>
    onChange(cards.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeCard = (i: number) => onChange(cards.filter((_, idx) => idx !== i));
  const addCard = () => onChange([...cards, { icon: "Sparkles", title: "New card", body: "Body" }]);

  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {cards.map((card, i) => (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Card #{i + 1}</span>
              <Button size="sm" variant="ghost" onClick={() => removeCard(i)} className="h-7 text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <Input placeholder="Icon name (lucide-react, e.g. Sparkles)" value={card.icon || ""} onChange={e => setCard(i, { icon: e.target.value })} />
            <Input placeholder="Title" value={card.title || ""} onChange={e => setCard(i, { title: e.target.value })} />
            <Textarea placeholder="Body" rows={2} value={card.body || ""} onChange={e => setCard(i, { body: e.target.value })} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addCard}>
          <Plus className="w-4 h-4 mr-2" /> Add card
        </Button>
      </div>
    </div>
  );
};
