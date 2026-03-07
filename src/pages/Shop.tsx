import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { Search, ShoppingCart, Filter, Sparkles, Store, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchShop();
  }, [user]);

  const fetchShop = async () => {
    const { data: settings } = await supabase.from("shop_settings").select("*").eq("id", "shop_enabled").maybeSingle();
    const enabled = (settings?.value as any)?.enabled || false;
    setShopEnabled(enabled);

    if (enabled) {
      const [p, c] = await Promise.all([
        supabase.from("shop_products").select("*, shop_categories(name, slug)").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("shop_categories").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (p.data) setProducts(p.data);
      if (c.data) setCategories(c.data);

      if (user) {
        const { count } = await supabase.from("shop_cart_items").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        setCartCount(count || 0);
      }
    }
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!shopEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEOHead title="Shop Coming Soon | Creative Caricature Club" description="Our merchandise shop is coming soon!" />
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <Store className="w-16 h-16 text-primary mx-auto" />
            <h1 className="font-display text-3xl font-bold">Shop Coming Soon</h1>
            <p className="text-muted-foreground font-sans">We're preparing an amazing collection of caricature merchandise for you. Stay tuned!</p>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-full">← Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Shop | Creative Caricature Club" description="Browse caricature merchandise - T-shirts, mugs, hoodies, posters & custom print-on-demand products." />

      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => navigate("/")} role="button">
            <Store className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold">CCC Shop</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/shop/ai-caricature")} className="text-xs">
              <Sparkles className="w-4 h-4 mr-1" />AI Preview
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/shop/cart")} className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-full" />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button size="sm" variant={!selectedCategory ? "default" : "outline"} className="rounded-full text-xs whitespace-nowrap" onClick={() => setSelectedCategory(null)}>All</Button>
          {categories.map(c => (
            <Button key={c.id} size="sm" variant={selectedCategory === c.id ? "default" : "outline"} className="rounded-full text-xs whitespace-nowrap" onClick={() => setSelectedCategory(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>

        {/* AI Caricature Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer" onClick={() => navigate("/shop/ai-caricature")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold">AI Caricature Generator</h3>
                <p className="text-xs text-muted-foreground font-sans">Upload your photo → Get caricature → Print on merchandise!</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/shop/product/${p.slug}`)}>
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Store className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="font-sans font-medium text-sm line-clamp-2">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.shop_categories?.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                    {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                  </div>
                  {p.is_pod && <Badge variant="secondary" className="text-[10px]">Custom Print</Badge>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && <p className="text-center text-muted-foreground font-sans py-12">No products found</p>}
      </div>
    </div>
  );
};

export default Shop;
