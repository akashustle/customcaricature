import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Bot, Brain, Search } from "lucide-react";

type TrainingItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES = ["general", "pricing", "ordering", "events", "delivery", "payment", "faq", "policy"];

const AdminChatbotTraining = () => {
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [newCat, setNewCat] = useState("general");
  const [adding, setAdding] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase.from("chatbot_training_data").select("*").order("category").order("created_at", { ascending: false }) as any;
    if (data) setItems(data);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!newQ.trim() || !newA.trim()) { toast({ title: "Fill both Q&A", variant: "destructive" }); return; }
    setAdding(true);
    const { error } = await (supabase.from("chatbot_training_data") as any).insert({ question: newQ.trim(), answer: newA.trim(), category: newCat });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Training data added! 🧠" }); setNewQ(""); setNewA(""); fetchItems(); }
    setAdding(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await (supabase.from("chatbot_training_data") as any).update({ is_active: active }).eq("id", id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await (supabase.from("chatbot_training_data") as any).delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchItems();
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.question.toLowerCase().includes(search.toLowerCase()) || i.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || i.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Train AI Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground font-sans">Add question-answer pairs to train the AI chatbot. The bot will use this data to answer customer queries on the live chat page.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="font-sans text-xs">Category</Label>
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label className="font-sans text-xs">Question</Label>
              <Input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="What is the pricing for a couple caricature?" />
            </div>
          </div>
          <div>
            <Label className="font-sans text-xs">Answer</Label>
            <Textarea value={newA} onChange={e => setNewA(e.target.value)} placeholder="A couple caricature costs ₹9,499 and includes..." rows={3} />
          </div>
          <Button onClick={addItem} disabled={adding} className="rounded-full font-sans">
            <Plus className="w-4 h-4 mr-1" /> Add Training Data
          </Button>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Q&A..." className="font-sans" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground font-sans">{filtered.length} training items</p>
        {filtered.map(item => (
          <Card key={item.id} className={`transition-all ${!item.is_active ? "opacity-50" : ""}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans capitalize">{item.category}</span>
                  </div>
                  <p className="font-sans font-medium text-sm">Q: {item.question}</p>
                  <p className="font-sans text-sm text-muted-foreground mt-1">A: {item.answer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={item.is_active} onCheckedChange={(v) => toggleActive(item.id, v)} />
                  <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="text-destructive h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminChatbotTraining;
