import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FolderOpen, Link2, Loader2, Check, Image as ImageIcon } from "lucide-react";

/**
 * Universal asset picker used across the admin to attach images / videos / sounds.
 * Three sources: Library (storage buckets), System (file upload to a chosen bucket),
 * and URL (paste). All return a public URL string back via onChange.
 */

const BUCKETS = [
  { id: "homepage-assets",    label: "Homepage Assets" },
  { id: "blog-images",        label: "Blog Images" },
  { id: "shop-images",        label: "Shop Images" },
  { id: "gallery-images",     label: "Gallery Images" },
  { id: "caricature-uploads", label: "Caricature Uploads" },
  { id: "avatars",            label: "Avatars" },
];

type AssetKind = "image" | "video" | "audio" | "any";

const accept = (kind: AssetKind) =>
  kind === "image" ? "image/*" :
  kind === "video" ? "video/*" :
  kind === "audio" ? "audio/*" :
  "*";

export const AssetPicker = ({
  value,
  onChange,
  kind = "image",
  label = "Asset",
  defaultBucket = "homepage-assets",
}: {
  value?: string;
  onChange: (url: string) => void;
  kind?: AssetKind;
  label?: string;
  defaultBucket?: string;
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "system" | "url">("library");
  const [bucket, setBucket] = useState(defaultBucket);
  const [items, setItems] = useState<{ name: string; publicUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");

  useEffect(() => { if (open && tab === "library") load(); /* eslint-disable-next-line */ }, [open, tab, bucket]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.storage.from(bucket).list("homepage", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      const root = await supabase.storage.from(bucket).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      const all = [
        ...(data || []).filter((f: any) => f.id !== null).map((f: any) => ({ name: `homepage/${f.name}` })),
        ...(root.data || []).filter((f: any) => f.id !== null).map((f: any) => ({ name: f.name })),
      ];
      const enriched = all.map((f) => ({
        name: f.name,
        publicUrl: supabase.storage.from(bucket).getPublicUrl(f.name).data.publicUrl,
      }));
      setItems(enriched);
    } finally { setLoading(false); }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `homepage/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Uploaded ✅" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const isMatch = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (kind === "image") return ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(ext);
    if (kind === "video") return ["mp4", "mov", "webm", "ogg"].includes(ext);
    if (kind === "audio") return ["mp3", "wav", "ogg", "m4a"].includes(ext);
    return true;
  };

  const filtered = items.filter(i => isMatch(i.name));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Paste URL or pick from library" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <FolderOpen className="w-4 h-4 mr-1" /> Pick
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Choose {kind}</DialogTitle></DialogHeader>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="library"><FolderOpen className="w-4 h-4 mr-1" /> Library</TabsTrigger>
                <TabsTrigger value="system"><Upload className="w-4 h-4 mr-1" /> Upload</TabsTrigger>
                <TabsTrigger value="url"><Link2 className="w-4 h-4 mr-1" /> URL</TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="space-y-3 mt-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Bucket:</Label>
                  <Select value={bucket} onValueChange={setBucket}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUCKETS.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No assets in this bucket. Upload one.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
                    {filtered.map(it => {
                      const selected = value === it.publicUrl;
                      return (
                        <button
                          key={it.name}
                          type="button"
                          onClick={() => { onChange(it.publicUrl); setOpen(false); }}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                          title={it.name}
                        >
                          {kind === "image" || isMatch(it.name) ? (
                            kind === "image" ? (
                              <img src={it.publicUrl} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted text-xs p-2 break-all">{it.name.split("/").pop()}</div>
                            )
                          ) : null}
                          {selected && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="system" className="space-y-3 mt-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Save to bucket:</Label>
                  <Select value={bucket} onValueChange={setBucket}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUCKETS.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30">
                  <input type="file" hidden accept={accept(kind)} disabled={uploading}
                    onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Uploading…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-primary" />
                      <p className="font-medium">Click to upload from your device</p>
                      <p className="text-xs text-muted-foreground">{kind === "any" ? "Any file" : kind.toUpperCase() + " files"}</p>
                    </div>
                  )}
                </label>
              </TabsContent>

              <TabsContent value="url" className="space-y-3 mt-3">
                <Label>Paste any public URL</Label>
                <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://…" />
                <DialogFooter>
                  <Button onClick={() => { onChange(urlInput); setOpen(false); }}>Use this URL</Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      {value && kind === "image" && (
        <img src={value} alt="" className="w-full max-h-40 object-cover rounded-lg border border-border"  loading="lazy" decoding="async" />
      )}
      {value && kind === "video" && (
        <video src={value} controls className="w-full max-h-48 rounded-lg border border-border" />
      )}
    </div>
  );
};

export default AssetPicker;
