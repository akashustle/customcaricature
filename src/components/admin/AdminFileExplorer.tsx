import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FolderOpen, Upload, Trash2, Copy, Image, FileText, Film, Music, File, Search, Loader2, ExternalLink, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type StorageFile = {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata: any;
};

const BUCKETS = [
  { id: "homepage-assets", label: "Homepage Assets", public: true },
  { id: "blog-images", label: "Blog Images", public: true },
  { id: "shop-images", label: "Shop Images", public: true },
  { id: "gallery-images", label: "Gallery Images", public: true },
  { id: "caricature-uploads", label: "Caricature Uploads", public: true },
  { id: "avatars", label: "Avatars", public: true },
  { id: "order-photos", label: "Order Photos", public: false },
  { id: "artist-portfolios", label: "Artist Portfolios", public: false },
  { id: "event-documents", label: "Event Documents", public: false },
  { id: "workshop-files", label: "Workshop Files", public: false },
  { id: "payment-claims", label: "Payment Claims", public: false },
];

const getFileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return Image;
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return Film;
  if (["mp3", "wav", "ogg"].includes(ext)) return Music;
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return FileText;
  return File;
};

const isImageFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext);
};

const formatSize = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const AdminFileExplorer = () => {
  const [bucket, setBucket] = useState("blog-images");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => { fetchFiles(); }, [bucket, prefix]);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(bucket).list(prefix || undefined, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      toast({ title: "Error loading files", description: error.message, variant: "destructive" });
      setFiles([]); setFolders([]);
    } else if (data) {
      const dirs = data.filter((f: any) => f.id === null).map((f: any) => f.name);
      const actualFiles = data.filter((f: any) => f.id !== null);
      setFolders(dirs);
      setFiles(actualFiles as any);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let count = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const path = prefix ? `${prefix}/${file.name}` : file.name;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) {
        toast({ title: `Failed: ${file.name}`, description: error.message, variant: "destructive" });
      } else { count++; }
    }
    toast({ title: `${count} file(s) uploaded ✅` });
    setUploading(false);
    e.target.value = "";
    fetchFiles();
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;
    const path = prefix ? `${prefix}/${fileName}` : fileName;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted ✅" }); fetchFiles(); }
  };

  const getPublicUrl = (fileName: string) => {
    const path = prefix ? `${prefix}/${fileName}` : fileName;
    const bucketInfo = BUCKETS.find(b => b.id === bucket);
    if (bucketInfo?.public) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || "";
    }
    return "";
  };

  const getSignedUrl = async (fileName: string) => {
    const path = prefix ? `${prefix}/${fileName}` : fileName;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const copyUrl = async (fileName: string) => {
    const bucketInfo = BUCKETS.find(b => b.id === bucket);
    let url = "";
    if (bucketInfo?.public) {
      url = getPublicUrl(fileName);
    } else {
      url = await getSignedUrl(fileName);
    }
    if (url) {
      navigator.clipboard.writeText(url);
      toast({ title: "URL copied! 📋" });
    }
  };

  const openFolder = (folder: string) => {
    setPrefix(prefix ? `${prefix}/${folder}` : folder);
  };

  const goBack = () => {
    const parts = prefix.split("/");
    parts.pop();
    setPrefix(parts.join("/"));
  };

  const filtered = files.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const bucketInfo = BUCKETS.find(b => b.id === bucket);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" /> File Explorer
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFiles} className="font-sans">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleUpload} />
            <Button size="sm" disabled={uploading} asChild>
              <span className="font-sans">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload Files
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Bucket selector + search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={bucket} onValueChange={(v) => { setBucket(v); setPrefix(""); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BUCKETS.map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.label} {b.public && <Badge variant="outline" className="text-[9px] ml-1">Public</Badge>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
        </div>
      </div>

      {/* Breadcrumb */}
      {prefix && (
        <div className="flex items-center gap-1 text-sm font-sans">
          <button onClick={() => setPrefix("")} className="text-primary hover:underline">Root</button>
          {prefix.split("/").map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => setPrefix(arr.slice(0, i + 1).join("/"))}
                className={i === arr.length - 1 ? "font-medium" : "text-primary hover:underline"}
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {/* Back button */}
          {prefix && (
            <button onClick={goBack} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-sans text-primary">
              ← Back
            </button>
          )}

          {/* Folders */}
          {folders.map(folder => (
            <motion.div key={folder} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={() => openFolder(folder)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left">
                <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans font-medium text-sm">{folder}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">Folder</Badge>
              </button>
            </motion.div>
          ))}

          {/* Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filtered.map((file, i) => {
                const FileIcon = getFileIcon(file.name);
                const isImage = isImageFile(file.name);
                const publicUrl = bucketInfo?.public ? getPublicUrl(file.name) : "";
                return (
                  <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      {isImage && publicUrl && (
                        <div className="h-32 bg-muted overflow-hidden">
                          <img src={publicUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="font-sans text-sm font-medium truncate flex-1" title={file.name}>{file.name}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground font-sans">
                            {formatSize(file.metadata?.size)} · {new Date(file.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => copyUrl(file.name)}>
                            <Copy className="w-3 h-3 mr-1" /> Copy URL
                          </Button>
                          {publicUrl && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(publicUrl, "_blank")}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(file.name)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {folders.length === 0 && filtered.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-sans">No files in this location</p>
                <p className="text-xs text-muted-foreground font-sans mt-1">Upload files using the button above</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFileExplorer;
