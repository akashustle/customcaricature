import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, FileText, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Artist = {
  id: string;
  name: string;
  experience: string | null;
  portfolio_url: string | null;
  created_at: string;
};

const AdminArtists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newArtist, setNewArtist] = useState({ name: "", experience: "" });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", experience: "" });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    if (data) setArtists(data as any);
    setLoading(false);
  };

  const addArtist = async () => {
    if (!newArtist.name) return;
    setAdding(true);
    try {
      let portfolioUrl: string | null = null;
      if (portfolioFile) {
        const path = `${crypto.randomUUID()}_${portfolioFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, portfolioFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("artist-portfolios").getPublicUrl(path);
        portfolioUrl = urlData.publicUrl;
      }

      await supabase.from("artists").insert({
        name: newArtist.name,
        experience: newArtist.experience || null,
        portfolio_url: portfolioUrl,
      } as any);

      toast({ title: "Artist Added!" });
      setShowAdd(false);
      setNewArtist({ name: "", experience: "" });
      setPortfolioFile(null);
      fetchArtists();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id: string) => {
    await supabase.from("artists").update({
      name: editData.name,
      experience: editData.experience || null,
    } as any).eq("id", id);
    toast({ title: "Artist Updated" });
    setEditingId(null);
    fetchArtists();
  };

  const updatePortfolio = async (id: string, file: File) => {
    const path = `${crypto.randomUUID()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, file);
    if (uploadErr) { toast({ title: "Upload Error", description: uploadErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("artist-portfolios").getPublicUrl(path);
    await supabase.from("artists").update({ portfolio_url: urlData.publicUrl } as any).eq("id", id);
    toast({ title: "Portfolio Updated" });
    fetchArtists();
  };

  const deleteArtist = async (id: string) => {
    await supabase.from("artists").delete().eq("id", id);
    toast({ title: "Artist Deleted" });
    fetchArtists();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Artists ({artists.length})</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Artist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add New Artist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={newArtist.name} onChange={e => setNewArtist({ ...newArtist, name: e.target.value })} placeholder="Artist name" /></div>
              <div><Label>Experience</Label><Textarea value={newArtist.experience} onChange={e => setNewArtist({ ...newArtist, experience: e.target.value })} placeholder="e.g. 5 years of caricature art..." /></div>
              <div>
                <Label className="flex items-center gap-1"><FileText className="w-4 h-4" />Portfolio (PDF)</Label>
                <Input type="file" accept=".pdf" onChange={e => setPortfolioFile(e.target.files?.[0] || null)} />
                {portfolioFile && <p className="text-xs text-muted-foreground mt-1">{portfolioFile.name}</p>}
              </div>
              <Button onClick={addArtist} disabled={!newArtist.name || adding} className="w-full font-sans">
                {adding ? "Adding..." : "Add Artist"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p> : artists.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No artists added yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {artists.map(artist => (
            <Card key={artist.id}>
              <CardContent className="p-4">
                {editingId === artist.id ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Name</Label><Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} /></div>
                    <div><Label className="text-xs">Experience</Label><Textarea value={editData.experience} onChange={e => setEditData({ ...editData, experience: e.target.value })} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(artist.id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-sans font-semibold">{artist.name}</p>
                      {artist.experience && <p className="text-xs text-muted-foreground font-sans">{artist.experience}</p>}
                      {artist.portfolio_url && (
                        <a href={artist.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-sans underline flex items-center gap-1">
                          <FileText className="w-3 h-3" />View Portfolio
                        </a>
                      )}
                      <p className="text-[10px] text-muted-foreground font-sans">Added: {new Date(artist.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) updatePortfolio(artist.id, e.target.files[0]); }} />
                        <Button variant="ghost" size="sm" asChild><span><Upload className="w-4 h-4" /></span></Button>
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(artist.id); setEditData({ name: artist.name, experience: artist.experience || "" }); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Artist?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this artist.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteArtist(artist.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminArtists;
