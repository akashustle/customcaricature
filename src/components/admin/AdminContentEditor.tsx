import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContentBlocks } from "@/hooks/useContentBlocks";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Eye, EyeOff, Type, Search, FileText, Layout } from "lucide-react";

const PAGES = [
  { id: "global", label: "Global" },
  { id: "homepage", label: "Homepage" },
  { id: "order", label: "Order Page" },
  { id: "login", label: "Login / Signup" },
  { id: "dashboard", label: "User Dashboard" },
  { id: "booking", label: "Event Booking" },
  { id: "enquiry", label: "Enquiry Page" },
  { id: "tracking", label: "Tracking Page" },
  { id: "workshop", label: "Workshop" },
  { id: "shop", label: "Shop" },
];

const AdminContentEditor = () => {
  const { blocks, updateBlock, toggleVisibility, refetch } = useContentBlocks();
  const [selectedPage, setSelectedPage] = useState("global");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newBlock, setNewBlock] = useState({ id: "", page: "global", type: "text", text: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, any>>({});

  const filteredBlocks = blocks.filter(b => {
    if (selectedPage !== "all" && b.page !== selectedPage) return false;
    if (search && !b.id.toLowerCase().includes(search.toLowerCase()) && !JSON.stringify(b.content).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (id: string, content: Record<string, any>) => {
    await updateBlock(id, content, { page: blocks.find(b => b.id === id)?.page });
    toast({ title: "Content saved" });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newBlock.id) return;
    await updateBlock(newBlock.id, { text: newBlock.text }, { page: newBlock.page, block_type: newBlock.type });
    toast({ title: "Content block added" });
    setShowAdd(false);
    setNewBlock({ id: "", page: "global", type: "text", text: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" /> Frontend Text Editor
          </h2>
          <p className="text-xs text-muted-foreground">Edit any text on the website in real-time</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Add Block
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="Block ID (e.g. hero_title)" value={newBlock.id} onChange={e => setNewBlock(p => ({ ...p, id: e.target.value }))} />
              <Select value={newBlock.page} onValueChange={v => setNewBlock(p => ({ ...p, page: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAGES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newBlock.type} onValueChange={v => setNewBlock(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="heading">Heading</SelectItem>
                  <SelectItem value="button">Button Label</SelectItem>
                  <SelectItem value="html">Rich HTML</SelectItem>
                  <SelectItem value="image">Image URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Content text..." value={newBlock.text} onChange={e => setNewBlock(p => ({ ...p, text: e.target.value }))} rows={2} />
            <Button size="sm" onClick={handleAdd}><Save className="w-4 h-4 mr-1" /> Save</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search blocks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={selectedPage} onValueChange={setSelectedPage}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            {PAGES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredBlocks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layout className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No content blocks yet</p>
            <p className="text-xs mt-1">Add blocks to control text across the website</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filteredBlocks.map(block => (
          <Card key={block.id} className={`transition-all ${!block.is_visible ? "opacity-50" : ""}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{block.id}</code>
                    <Badge variant="outline" className="text-[10px]">{block.page}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{block.block_type}</Badge>
                  </div>
                  {editingId === block.id ? (
                    <div className="space-y-2 mt-2">
                      {Object.entries(editContent).map(([key, val]) => (
                        <div key={key}>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase">{key}</label>
                          <Textarea
                            value={String(val)}
                            onChange={e => setEditContent(p => ({ ...p, [key]: e.target.value }))}
                            rows={2}
                            className="text-sm mt-0.5"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(block.id, editContent)}>
                          <Save className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 truncate mt-1 cursor-pointer" onClick={() => {
                      setEditingId(block.id);
                      setEditContent(block.content);
                    }}>
                      {JSON.stringify(block.content).slice(0, 120)}
                    </p>
                  )}
                  {block.updated_by && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last edited by {block.updated_by} · {new Date(block.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch checked={block.is_visible} onCheckedChange={v => toggleVisibility(block.id, v)} />
                  {block.is_visible ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminContentEditor;
