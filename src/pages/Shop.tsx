import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/pricing";
import { Search, ShoppingCart, Sparkles, Store, ArrowRight, Heart, Grid3X3, List, SlidersHorizontal, Star, X, Eye, Share2, TrendingUp, Flame, Clock, ChevronDown, Filter, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { toast } from "@/hooks/use-toast";

type SortOption = "newest" | "price-low" | "price-high" | "name-az" | "name-za" | "popular" | "rating";

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
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [showFilters, setShowFilters] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyPOD, setOnlyPOD] = useState(false);

  useEffect(() => { fetchShop(); }, [user]);

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
        const [cartRes, wishRes] = await Promise.all([
          supabase.from("shop_cart_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("shop_wishlist").select("product_id").eq("user_id", user.id),
        ]);
        setCartCount(cartRes.count || 0);
        if (wishRes.data) setWishlist(wishRes.data.map((w: any) => w.product_id));
      }
    }
    setLoading(false);
    // Load recently viewed from localStorage
    const rv = JSON.parse(localStorage.getItem("ccc_recently_viewed") || "[]");
    setRecentlyViewed(rv);
  };

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    if (wishlist.includes(productId)) {
      await supabase.from("shop_wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
      setWishlist(w => w.filter(id => id !== productId));
      toast({ title: "Removed from wishlist" });
    } else {
      await supabase.from("shop_wishlist").insert({ user_id: user.id, product_id: productId });
      setWishlist(w => [...w, productId]);
      toast({ title: "Added to wishlist ❤️" });
    }
  };

  const quickAddToCart = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    const { data: existing } = await supabase.from("shop_cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
    if (existing) {
      await supabase.from("shop_cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("shop_cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
    }
    setCartCount(c => c + 1);
    toast({ title: "Added to cart! 🛒" });
  };

  const shareProduct = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/shop/product/${product.slug}`;
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.description?.slice(0, 100), url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied! 📋" });
    }
  };

  const viewProduct = (product: any) => {
    // Save to recently viewed
    const rv = JSON.parse(localStorage.getItem("ccc_recently_viewed") || "[]");
    const updated = [product, ...rv.filter((p: any) => p.id !== product.id)].slice(0, 10);
    localStorage.setItem("ccc_recently_viewed", JSON.stringify(updated));
    navigate(`/shop/product/${product.slug}`);
  };

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()) || (p.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !selectedCategory || p.category_id === selectedCategory;
      const price = p.discount_price || p.price;
      const matchPrice = price >= priceRange[0] && price <= priceRange[1];
      const matchStock = !onlyInStock || p.stock_quantity > 0;
      const matchDiscount = !onlyDiscount || p.discount_price;
      const matchFeatured = !onlyFeatured || p.is_featured;
      const matchPOD = !onlyPOD || p.is_pod;
      return matchSearch && matchCat && matchPrice && matchStock && matchDiscount && matchFeatured && matchPOD;
    });
    // Sort
    switch (sortBy) {
      case "price-low": result.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price)); break;
      case "price-high": result.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price)); break;
      case "name-az": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-za": result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "popular": result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case "rating": result.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)); break;
      default: break; // newest = default order
    }
    return result;
  }, [products, search, selectedCategory, sortBy, priceRange, onlyInStock, onlyDiscount, onlyFeatured, onlyPOD]);

  const maxPrice = useMemo(() => Math.max(...products.map(p => p.price), 10000), [products]);
  const featuredProducts = products.filter(p => p.is_featured);
  const bestsellerProducts = products.filter(p => p.is_bestseller);
  const discountProducts = products.filter(p => p.discount_price && p.discount_price < p.price);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!shopEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEOHead title="Shop Coming Soon | Creative Caricature Club" description="Our merchandise shop is coming soon!" />
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <Store className="w-16 h-16 text-primary mx-auto" />
            <h1 className="font-display text-3xl font-bold">Shop Coming Soon</h1>
            <p className="text-muted-foreground font-sans">We're preparing an amazing collection for you!</p>
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Store className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold">CCC Shop</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/shop/ai-caricature")} className="text-xs hidden sm:flex">
              <Sparkles className="w-4 h-4 mr-1" />AI Preview
            </Button>
            {user && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="relative">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{wishlist.length}</span>}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => navigate("/shop/cart")} className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Search + Sort + View Toggle */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products, tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-full" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="shrink-0"><SlidersHorizontal className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")} className="shrink-0 hidden sm:flex">
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Sort + Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-sans">{filtered.length} products</p>
          <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low → High</SelectItem>
              <SelectItem value="price-high">Price: High → Low</SelectItem>
              <SelectItem value="name-az">Name: A → Z</SelectItem>
              <SelectItem value="name-za">Name: Z → A</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-semibold text-sm">Filters</p>
                  <Button variant="ghost" size="sm" onClick={() => { setPriceRange([0, 100000]); setOnlyInStock(false); setOnlyDiscount(false); setOnlyFeatured(false); setOnlyPOD(false); setSelectedCategory(null); }} className="text-xs">Clear All</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Min Price (₹)</p>
                    <Input type="number" value={priceRange[0]} onChange={e => setPriceRange([+e.target.value, priceRange[1]])} className="h-8 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Max Price (₹)</p>
                    <Input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={onlyInStock ? "default" : "outline"} className="text-xs h-7 rounded-full" onClick={() => setOnlyInStock(!onlyInStock)}>In Stock Only</Button>
                  <Button size="sm" variant={onlyDiscount ? "default" : "outline"} className="text-xs h-7 rounded-full" onClick={() => setOnlyDiscount(!onlyDiscount)}>On Sale</Button>
                  <Button size="sm" variant={onlyFeatured ? "default" : "outline"} className="text-xs h-7 rounded-full" onClick={() => setOnlyFeatured(!onlyFeatured)}>Featured</Button>
                  <Button size="sm" variant={onlyPOD ? "default" : "outline"} className="text-xs h-7 rounded-full" onClick={() => setOnlyPOD(!onlyPOD)}>Custom Print</Button>
                </div>
              </CardContent></Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button size="sm" variant={!selectedCategory ? "default" : "outline"} className="rounded-full text-xs whitespace-nowrap" onClick={() => setSelectedCategory(null)}>All ({products.length})</Button>
          {categories.map(c => (
            <Button key={c.id} size="sm" variant={selectedCategory === c.id ? "default" : "outline"} className="rounded-full text-xs whitespace-nowrap" onClick={() => setSelectedCategory(c.id)}>
              {c.name} ({products.filter(p => p.category_id === c.id).length})
            </Button>
          ))}
        </div>

        {/* Featured Banner */}
        {featuredProducts.length > 0 && !search && !selectedCategory && (
          <div className="space-y-2">
            <p className="font-display font-bold text-sm flex items-center gap-1"><Flame className="w-4 h-4 text-primary" />Featured</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {featuredProducts.slice(0, 6).map(p => (
                <Card key={p.id} className="min-w-[160px] overflow-hidden cursor-pointer hover:shadow-lg transition-shadow shrink-0" onClick={() => viewProduct(p)}>
                  <div className="aspect-square bg-muted w-40"><img src={p.images?.[0] || ""} alt={p.name} className="w-full h-full object-cover" loading="lazy" /></div>
                  <CardContent className="p-2">
                    <p className="font-sans text-xs font-medium truncate">{p.name}</p>
                    <span className="font-display font-bold text-primary text-sm">{formatPrice(p.discount_price || p.price)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Deals Section */}
        {discountProducts.length > 0 && !search && !selectedCategory && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-r from-destructive/5 to-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="font-display font-bold text-sm mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-primary" />Today's Deals ({discountProducts.length})</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {discountProducts.slice(0, 8).map(p => (
                    <div key={p.id} className="min-w-[120px] text-center cursor-pointer shrink-0" onClick={() => viewProduct(p)}>
                      <div className="w-20 h-20 rounded-lg bg-muted mx-auto overflow-hidden"><img src={p.images?.[0] || ""} alt="" className="w-full h-full object-cover" /></div>
                      <Badge className="mt-1 text-[10px] bg-green-100 text-green-800 border-none">{Math.round((1 - p.discount_price / p.price) * 100)}% OFF</Badge>
                      <p className="text-xs font-sans font-medium truncate mt-0.5">{p.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Caricature Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer" onClick={() => navigate("/shop/ai-caricature")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6 text-primary" /></div>
              <div className="flex-1">
                <h3 className="font-display font-bold">AI Caricature Generator</h3>
                <p className="text-xs text-muted-foreground font-sans">Upload your photo → Get caricature → Print on merchandise!</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Grid/List */}
        <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" : "space-y-3"}>
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              {viewMode === "grid" ? (
                <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onClick={() => viewProduct(p)}>
                  <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <Store className="w-10 h-10 text-muted-foreground/30" />
                    )}
                    {/* Overlay buttons */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => toggleWishlist(p.id, e)} className={`w-8 h-8 rounded-full flex items-center justify-center ${wishlist.includes(p.id) ? "bg-destructive text-destructive-foreground" : "bg-card/80 text-foreground"}`}>
                        <Heart className={`w-4 h-4 ${wishlist.includes(p.id) ? "fill-current" : ""}`} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setQuickViewProduct(p); }} className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"><Eye className="w-4 h-4" /></button>
                      <button onClick={(e) => shareProduct(p, e)} className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"><Share2 className="w-4 h-4" /></button>
                    </div>
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.discount_price && <Badge className="text-[10px] bg-green-600 text-white border-none">{Math.round((1 - p.discount_price / p.price) * 100)}% OFF</Badge>}
                      {p.is_bestseller && <Badge className="text-[10px] bg-amber-500 text-white border-none">Bestseller</Badge>}
                      {p.is_featured && <Badge className="text-[10px] bg-primary text-primary-foreground border-none">Featured</Badge>}
                      {p.stock_quantity === 0 && <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>}
                      {p.stock_quantity > 0 && p.stock_quantity <= 5 && <Badge className="text-[10px] bg-amber-100 text-amber-800 border-none">Only {p.stock_quantity} left</Badge>}
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1">
                    {p.brand && <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">{p.brand}</p>}
                    <p className="font-sans font-medium text-sm line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.shop_categories?.name}</p>
                    {(p.avg_rating || 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.round(p.avg_rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                        <span className="text-[10px] text-muted-foreground">({p.review_count})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                      {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                    </div>
                    {p.is_pod && <Badge variant="secondary" className="text-[10px]">Custom Print</Badge>}
                    {p.stock_quantity > 0 && (
                      <Button size="sm" className="w-full rounded-full text-xs mt-2 h-7" onClick={(e) => quickAddToCart(p, e)}>
                        <ShoppingCart className="w-3 h-3 mr-1" />Add to Cart
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* List View */
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => viewProduct(p)}>
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-24 h-24 rounded-lg bg-muted shrink-0 overflow-hidden relative">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Store className="w-8 h-8 text-muted-foreground/30 m-auto" />}
                      {p.discount_price && <Badge className="absolute top-1 left-1 text-[9px] bg-green-600 text-white border-none">{Math.round((1 - p.discount_price / p.price) * 100)}%</Badge>}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      {p.brand && <p className="text-[10px] text-muted-foreground uppercase">{p.brand}</p>}
                      <p className="font-sans font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                        {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                        {p.is_pod && <Badge variant="secondary" className="text-[10px]">POD</Badge>}
                        {p.is_bestseller && <Badge className="text-[10px] bg-amber-100 text-amber-800 border-none">Bestseller</Badge>}
                      </div>
                      {(p.avg_rating || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.round(p.avg_rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}
                          <span className="text-[10px] text-muted-foreground">({p.review_count})</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" className="rounded-full text-xs h-7" onClick={(e) => quickAddToCart(p, e)} disabled={p.stock_quantity < 1}>
                          <ShoppingCart className="w-3 h-3 mr-1" />{p.stock_quantity < 1 ? "Sold Out" : "Add"}
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={(e) => toggleWishlist(p.id, e)}>
                          <Heart className={`w-3 h-3 ${wishlist.includes(p.id) ? "fill-current text-destructive" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-sans">No products found</p>
            <Button variant="outline" className="rounded-full" onClick={() => { setSearch(""); setSelectedCategory(null); setPriceRange([0, 100000]); setOnlyInStock(false); setOnlyDiscount(false); }}>Clear Filters</Button>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="space-y-2 pt-4">
            <p className="font-display font-bold text-sm flex items-center gap-1"><Clock className="w-4 h-4 text-muted-foreground" />Recently Viewed</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed.map(p => (
                <Card key={p.id} className="min-w-[140px] overflow-hidden cursor-pointer hover:shadow-md transition-shadow shrink-0" onClick={() => viewProduct(p)}>
                  <div className="aspect-square bg-muted w-[140px]">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                  <CardContent className="p-2">
                    <p className="font-sans text-xs truncate">{p.name}</p>
                    <span className="font-display font-bold text-primary text-xs">{formatPrice(p.discount_price || p.price)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick View Dialog */}
      <Dialog open={!!quickViewProduct} onOpenChange={() => setQuickViewProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{quickViewProduct?.name}</DialogTitle></DialogHeader>
          {quickViewProduct && (
            <div className="space-y-3">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {quickViewProduct.images?.[0] && <img src={quickViewProduct.images[0]} alt="" className="w-full h-full object-contain" />}
              </div>
              {quickViewProduct.brand && <p className="text-xs text-muted-foreground uppercase">{quickViewProduct.brand}</p>}
              <p className="text-sm text-muted-foreground font-sans line-clamp-4">{quickViewProduct.description}</p>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold text-primary">{formatPrice(quickViewProduct.discount_price || quickViewProduct.price)}</span>
                {quickViewProduct.discount_price && <span className="line-through text-muted-foreground">{formatPrice(quickViewProduct.price)}</span>}
              </div>
              {(quickViewProduct.avg_rating || 0) > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(quickViewProduct.avg_rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}
                  <span className="text-xs text-muted-foreground">({quickViewProduct.review_count} reviews)</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 rounded-full" onClick={() => { setQuickViewProduct(null); viewProduct(quickViewProduct); }}>View Details</Button>
                <Button variant="outline" className="rounded-full" onClick={(e) => { quickAddToCart(quickViewProduct, e); setQuickViewProduct(null); }} disabled={quickViewProduct.stock_quantity < 1}>
                  <ShoppingCart className="w-4 h-4 mr-1" />Add
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={(e) => toggleWishlist(quickViewProduct.id, e)}>
                  <Heart className={`w-4 h-4 ${wishlist.includes(quickViewProduct.id) ? "fill-current text-destructive" : ""}`} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
