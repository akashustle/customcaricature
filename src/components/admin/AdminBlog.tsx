import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, Image, FileText, Search, Bold, Italic, Heading, List, LinkIcon, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type BlogPost = {
  id: string; title: string; slug: string; excerpt: string; content: string;
  cover_image: string | null; category: string; tags: string[];
  author_name: string; is_published: boolean; published_at: string | null;
  meta_title: string | null; meta_description: string | null; created_at: string;
};

const EMPTY_POST = {
  title: "", slug: "", excerpt: "", content: "", cover_image: "",
  category: "tutorial", tags: [] as string[], author_name: "Creative Caricature Club",
  is_published: false, meta_title: "", meta_description: "",
};

const CATEGORIES = [
  { value: "tutorial", label: "Tutorial" },
  { value: "case_study", label: "Case Study" },
  { value: "news", label: "News" },
  { value: "tips", label: "Tips & Tricks" },
  { value: "behind_scenes", label: "Behind the Scenes" },
  { value: "events", label: "Events" },
  { value: "artist_spotlight", label: "Artist Spotlight" },
];

const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [showEditor, setShowEditor] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [insertingImage, setInsertingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchPosts();
    const ch = supabase.channel("admin-blog-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data as any);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null); setForm(EMPTY_POST); setTagsInput(""); setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content,
      cover_image: post.cover_image || "", category: post.category,
      tags: post.tags || [], author_name: post.author_name,
      is_published: post.is_published, meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
    });
    setTagsInput((post.tags || []).join(", "));
    setShowEditor(true);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const uploadImage = async (file: File, isCover = false): Promise<string | null> => {
    try {
      const path = `blog/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) {
        // Fallback to shop-images if blog-images bucket doesn't exist
        const fallbackPath = `blog/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { error: err2 } = await supabase.storage.from("shop-images").upload(fallbackPath, file);
        if (err2) throw err2;
        const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(fallbackPath);
        return urlData?.publicUrl || null;
      }
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Max 5MB", variant: "destructive" }); return; }
    setUploading(true);
    const url = await uploadImage(file, true);
    if (url) setForm({ ...form, cover_image: url });
    setUploading(false);
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInsertingImage(true);
    const url = await uploadImage(file);
    if (url && contentRef.current) {
      const ta = contentRef.current;
      const pos = ta.selectionStart || form.content.length;
      const before = form.content.slice(0, pos);
      const after = form.content.slice(pos);
      setForm({ ...form, content: `${before}\n\n![${file.name}](${url})\n\n${after}` });
    }
    setInsertingImage(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    if (!contentRef.current) return;
    const ta = contentRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.content.slice(start, end);
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    setForm({ ...form, content: `${before}${prefix}${selected}${suffix}${after}` });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length); }, 0);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast({ title: "Title and slug are required", variant: "destructive" }); return;
    }
    if (!form.excerpt) {
      toast({ title: "Excerpt is required for SEO", variant: "destructive" }); return;
    }
    if (!form.content) {
      toast({ title: "Content cannot be empty", variant: "destructive" }); return;
    }

    setSaving(true);
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const payload: any = {
      title: form.title, slug: form.slug, excerpt: form.excerpt, content: form.content,
      cover_image: form.cover_image || null, category: form.category, tags,
      author_name: form.author_name, is_published: form.is_published,
      meta_title: form.meta_title || form.title,
      meta_description: form.meta_description || form.excerpt.slice(0, 160),
      published_at: form.is_published ? (editing?.published_at || new Date().toISOString()) : null,
    };

    if (editing) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Post Updated! ✅" });
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Post Created! 🎉" });
    }
    setSaving(false); setShowEditor(false); fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newState = !post.is_published;
    await supabase.from("blog_posts").update({
      is_published: newState,
      published_at: newState ? (post.published_at || new Date().toISOString()) : null,
    } as any).eq("id", post.id);
    toast({ title: newState ? "Published! 🚀" : "Unpublished" }); fetchPosts();
  };

  const deletePost = async (id: string) => {
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Post Deleted" }); fetchPosts();
  };

  const filtered = posts.filter(p => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const seoScore = (post: typeof form) => {
    let score = 0;
    if (post.title) score += 20;
    if (post.meta_title || post.title) score += 15;
    if (post.meta_description || post.excerpt) score += 15;
    if (post.excerpt) score += 15;
    if (post.cover_image) score += 15;
    if (tagsInput.split(",").filter(Boolean).length > 0) score += 10;
    if (post.content.length > 300) score += 10;
    return score;
  };

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading blog posts...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Blog Posts ({posts.length})
        </h2>
        <Button onClick={openNew} className="rounded-full font-sans">
          <Plus className="w-4 h-4 mr-1" /> New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editing ? "Edit Post" : "Create New Blog Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="font-sans text-sm font-medium">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) })} placeholder="Your blog post title" />
              </div>
              <div>
                <Label className="font-sans text-sm font-medium">URL Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="your-blog-post-title" className="font-mono text-sm" />
              </div>
            </div>

            {/* Category, Author */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="font-sans text-sm font-medium">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-sans text-sm font-medium">Author</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <Label className="font-sans text-sm font-medium">Cover Image</Label>
              <div className="flex gap-2 items-center">
                <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="Paste URL or upload →" className="flex-1 font-sans text-sm" />
                <label className="cursor-pointer flex-shrink-0">
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <span className="font-sans">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-1" />Upload</>}</span>
                  </Button>
                </label>
              </div>
              {form.cover_image && (
                <div className="mt-2 relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={form.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-7 text-xs" onClick={() => setForm({ ...form, cover_image: "" })}>Remove</Button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className="font-sans text-sm font-medium">Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="caricature, art, tutorial, tips" className="font-sans" />
              {tagsInput && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tagsInput.split(",").map((t, i) => t.trim() && <Badge key={i} variant="secondary" className="text-xs">{t.trim()}</Badge>)}
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <Label className="font-sans text-sm font-medium">Excerpt * (shown in listings & search results)</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} placeholder="A brief summary of the post (2-3 sentences)" className="font-sans" />
              <p className="text-xs text-muted-foreground mt-1">{form.excerpt.length}/300 characters</p>
            </div>

            {/* Content with toolbar */}
            <div>
              <Label className="font-sans text-sm font-medium">Content * (Markdown supported)</Label>
              <div className="flex items-center gap-1 bg-muted/50 rounded-t-lg border border-b-0 border-border p-1.5">
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => insertMarkdown("## ", "\n")} title="Heading"><Heading className="w-3.5 h-3.5" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => insertMarkdown("**", "**")} title="Bold"><Bold className="w-3.5 h-3.5" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => insertMarkdown("*", "*")} title="Italic"><Italic className="w-3.5 h-3.5" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => insertMarkdown("\n- ", "\n")} title="List"><List className="w-3.5 h-3.5" /></Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => insertMarkdown("[", "](url)")} title="Link"><LinkIcon className="w-3.5 h-3.5" /></Button>
                <div className="border-l border-border h-5 mx-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={insertingImage} asChild>
                    <span>{insertingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ImagePlus className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Image</span></>}</span>
                  </Button>
                </label>
              </div>
              <Textarea ref={contentRef} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={14} className="font-mono text-sm rounded-t-none" placeholder="Write your blog post content here using Markdown..." />
            </div>

            {/* SEO Section */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-sans font-semibold text-sm flex items-center gap-2">
                  🔍 SEO Settings
                </h4>
                <Badge variant={seoScore(form) >= 80 ? "default" : seoScore(form) >= 50 ? "secondary" : "destructive"} className="text-xs">
                  SEO Score: {seoScore(form)}%
                </Badge>
              </div>
              <div>
                <Label className="font-sans text-sm">Meta Title (defaults to post title if empty)</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder={form.title || "Page title for search engines"} className="font-sans" />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_title || form.title).length}/60 characters</p>
              </div>
              <div>
                <Label className="font-sans text-sm">Meta Description (defaults to excerpt if empty)</Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} placeholder={form.excerpt || "Description shown in search results"} className="font-sans" />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_description || form.excerpt).length}/160 characters</p>
              </div>
              {/* SEO Preview */}
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Search Preview:</p>
                <p className="text-sm font-medium text-blue-700 truncate">{form.meta_title || form.title || "Blog Post Title"}</p>
                <p className="text-xs text-green-700 truncate">creativecaricatureclub.com/blog/{form.slug || "post-slug"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{form.meta_description || form.excerpt || "Post description will appear here..."}</p>
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label className="font-sans">{form.is_published ? "🟢 Published (visible on website)" : "📝 Draft (not visible)"}</Label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowEditor(false)} className="font-sans">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="font-sans">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : editing ? "Update Post" : "Create Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts List - Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {filtered.map((post, i) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card>
              <CardContent className="p-4 space-y-2">
                {post.cover_image && (
                  <div className="w-full h-28 rounded-lg overflow-hidden mb-2">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-semibold text-sm truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground font-sans line-clamp-2">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant={post.is_published ? "default" : "secondary"} className="text-[10px]">
                        {post.is_published ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{post.category}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(post.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(post)}>
                      {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePost(post.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Posts Table - Desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-sans w-10">Cover</TableHead>
                  <TableHead className="font-sans">Title</TableHead>
                  <TableHead className="font-sans">Category</TableHead>
                  <TableHead className="font-sans">Status</TableHead>
                  <TableHead className="font-sans">SEO</TableHead>
                  <TableHead className="font-sans">Date</TableHead>
                  <TableHead className="font-sans text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.cover_image ? (
                        <div className="w-12 h-8 rounded overflow-hidden"><img src={post.cover_image} alt="" className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-12 h-8 rounded bg-muted flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-sans font-medium max-w-[200px] truncate">{post.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{post.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={post.is_published ? "default" : "secondary"} className="text-xs">
                        {post.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.meta_title && post.meta_description ? "default" : "secondary"} className="text-[10px]">
                        {post.meta_title && post.meta_description ? "✅" : "⚠️"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-sans text-xs">{new Date(post.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.is_published ? "Unpublish" : "Publish"}>
                          {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Edit2 className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePost(post.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-sans">
                      {posts.length === 0 ? 'No blog posts yet. Click "New Post" to create one.' : "No posts match your filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBlog;
