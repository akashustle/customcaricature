import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { ShoppingCart, Minus, Plus, ArrowLeft, Sparkles, Store, Heart, Share2, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, ZoomIn, Package, Clock, MapPin, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const ShopProduct = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [pincode, setPincode] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "reviews">("description");

  useEffect(() => { if (slug) fetchProduct(); }, [slug]);

  const fetchProduct = async () => {
    const { data } = await supabase.from("shop_products").select("*, shop_categories(name, slug)").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (data) {
      setProduct(data);
      const [varsRes, reviewsRes, relatedRes] = await Promise.all([
        supabase.from("shop_product_variations").select("*").eq("product_id", data.id).eq("is_active", true),
        supabase.from("shop_product_reviews").select("*").eq("product_id", data.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("shop_products").select("*").eq("category_id", data.category_id).neq("id", data.id).eq("is_active", true).limit(8),
      ]);
      if (varsRes.data) setVariations(varsRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (relatedRes.data) setRelatedProducts(relatedRes.data);
      if (user) {
        const { data: wish } = await supabase.from("shop_wishlist").select("id").eq("user_id", user.id).eq("product_id", data.id).maybeSingle();
        setIsWishlisted(!!wish);
      }
      // Save to recently viewed
      const rv = JSON.parse(localStorage.getItem("ccc_recently_viewed") || "[]");
      const updated = [data, ...rv.filter((p: any) => p.id !== data.id)].slice(0, 10);
      localStorage.setItem("ccc_recently_viewed", JSON.stringify(updated));
    }
    setLoading(false);
  };

  const getSelectedVariationId = () => {
    const types = Object.keys(selectedVariations);
    if (types.length === 0) return null;
    const match = variations.find(v => types.every(t => v.variation_type === t && v.variation_value === selectedVariations[t]));
    return match?.id || null;
  };

  const addToCart = async () => {
    if (!user) { navigate("/login"); return; }
    setAdding(true);
    try {
      const variationId = getSelectedVariationId();
      const { data: existing } = await supabase.from("shop_cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
      if (existing) {
        await supabase.from("shop_cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
      } else {
        await supabase.from("shop_cart_items").insert({ user_id: user.id, product_id: product.id, variation_id: variationId, quantity });
      }
      toast({ title: "Added to cart! 🛒" });
    } catch { toast({ title: "Failed to add", variant: "destructive" }); }
    setAdding(false);
  };

  const buyNow = async () => { await addToCart(); navigate("/shop/cart"); };

  const toggleWishlist = async () => {
    if (!user) { navigate("/login"); return; }
    if (isWishlisted) {
      await supabase.from("shop_wishlist").delete().eq("user_id", user.id).eq("product_id", product.id);
      setIsWishlisted(false);
      toast({ title: "Removed from wishlist" });
    } else {
      await supabase.from("shop_wishlist").insert({ user_id: user.id, product_id: product.id });
      setIsWishlisted(true);
      toast({ title: "Added to wishlist ❤️" });
    }
  };

  const shareProduct = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.description?.slice(0, 100), url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied! 📋" });
    }
  };

  const checkDelivery = () => {
    if (!pincode || pincode.length !== 6) { toast({ title: "Enter valid 6-digit pincode", variant: "destructive" }); return; }
    const days = parseInt(pincode[0]) <= 4 ? 3 : 7;
    const date = new Date(); date.setDate(date.getDate() + days);
    setDeliveryEstimate(`Delivery by ${date.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}`);
  };

  const submitReview = async () => {
    if (!user) { navigate("/login"); return; }
    setSubmittingReview(true);
    await supabase.from("shop_product_reviews").insert({
      product_id: product.id, user_id: user.id, rating: reviewForm.rating,
      title: reviewForm.title || null, comment: reviewForm.comment || null,
    });
    toast({ title: "Review submitted! ⭐" });
    setShowReviewForm(false);
    setReviewForm({ rating: 5, title: "", comment: "" });
    setSubmittingReview(false);
    fetchProduct();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Product not found</p></div>;

  const priceAdj = Object.keys(selectedVariations).reduce((adj, type) => {
    const v = variations.find(v => v.variation_type === type && v.variation_value === selectedVariations[type]);
    return adj + (v?.price_adjustment || 0);
  }, 0);
  const currentPrice = (product.discount_price || product.price) + priceAdj;
  const variationTypes = [...new Set(variations.map(v => v.variation_type))];
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({ star: r, count: reviews.filter(rv => rv.rating === r).length }));

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title={product.seo_title || `${product.name} | CCC Shop`} description={product.seo_description || product.description?.slice(0, 160)} canonical={`/shop/product/${product.slug}`} />

      <div className="bg-card border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shop")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-display text-lg font-bold truncate flex-1">{product.name}</h1>
        <Button variant="ghost" size="icon" onClick={shareProduct}><Share2 className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" onClick={toggleWishlist}><Heart className={`w-5 h-5 ${isWishlisted ? "fill-destructive text-destructive" : ""}`} /></Button>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="md:flex">
          {/* Image Gallery */}
          <div className="md:w-1/2">
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative cursor-zoom-in" onClick={() => setZoomedImage(true)}>
              {product.images?.[selectedImage] ? (
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-contain"  loading="lazy" decoding="async" />
              ) : (
                <Store className="w-20 h-20 text-muted-foreground/20" />
              )}
              {product.images?.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => Math.max(0, i - 1)); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => Math.min((product.images?.length || 1) - 1, i + 1)); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                </>
              )}
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"><ZoomIn className="w-4 h-4" /></div>
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.discount_price && <Badge className="text-[10px] bg-green-600 text-white border-none">{Math.round((1 - product.discount_price / product.price) * 100)}% OFF</Badge>}
                {product.is_bestseller && <Badge className="text-[10px] bg-amber-500 text-white border-none">Bestseller</Badge>}
              </div>
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {product.images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === selectedImage ? "border-primary" : "border-transparent"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="p-4 space-y-4 md:w-1/2">
            {product.brand && <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.brand}</p>}
            <Badge variant="secondary" className="text-xs">{product.shop_categories?.name}</Badge>
            <h1 className="font-display text-2xl font-bold">{product.name}</h1>
            
            {/* Rating */}
            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded text-sm font-bold">
                  {avgRating} <Star className="w-3 h-3 fill-current" />
                </div>
                <span className="text-sm text-muted-foreground">{reviews.length} ratings</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-bold text-primary">{formatPrice(currentPrice)}</span>
              {product.discount_price && <span className="text-lg line-through text-muted-foreground">{formatPrice(product.price + priceAdj)}</span>}
              {product.discount_price && <Badge className="bg-green-100 text-green-800 border-none text-sm">Save {formatPrice(product.price - product.discount_price)}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>

            {product.is_pod && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-sans font-semibold text-sm">Print-on-Demand</p>
                    <p className="text-xs text-muted-foreground">Upload your photo to get a custom caricature printed!</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variations */}
            {variationTypes.map(type => {
              const typeVars = variations.filter(v => v.variation_type === type);
              return (
                <div key={type}>
                  <p className="font-sans font-semibold text-sm mb-2 capitalize">{type}</p>
                  <div className="flex gap-2 flex-wrap">
                    {typeVars.map(v => (
                      <Button key={v.id} size="sm" variant={selectedVariations[type] === v.variation_value ? "default" : "outline"} className="rounded-full"
                        onClick={() => setSelectedVariations(s => ({ ...s, [type]: v.variation_value }))}>
                        {v.variation_value}
                        {v.price_adjustment > 0 && <span className="ml-1 text-[10px]">+{formatPrice(v.price_adjustment)}</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Quantity */}
            <div>
              <p className="font-sans font-semibold text-sm mb-2">Quantity</p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="font-display text-lg font-bold w-8 text-center">{quantity}</span>
                <Button size="icon" variant="outline" onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}><Plus className="w-4 h-4" /></Button>
                <span className="text-xs text-muted-foreground">{product.stock_quantity > 0 ? `${product.stock_quantity} available` : ""}</span>
              </div>
            </div>

            {product.stock_quantity < 1 && <Badge variant="destructive" className="text-sm">Out of Stock</Badge>}
            {product.stock_quantity > 0 && product.stock_quantity <= 5 && <p className="text-sm text-amber-600 font-sans font-medium">⚡ Only {product.stock_quantity} left - order soon!</p>}

            {/* Buy buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={addToCart} disabled={adding || product.stock_quantity < 1}>
                <ShoppingCart className="w-4 h-4 mr-2" />{adding ? "Adding..." : "Add to Cart"}
              </Button>
              <Button className="flex-1 rounded-full" onClick={buyNow} disabled={adding || product.stock_quantity < 1}>Buy Now</Button>
            </div>

            {/* Delivery Check */}
            <Card><CardContent className="p-3 space-y-2">
              <p className="font-sans font-semibold text-sm flex items-center gap-1"><Truck className="w-4 h-4" />Delivery</p>
              <div className="flex gap-2">
                <Input placeholder="Enter pincode" value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="flex-1 h-8 text-sm" />
                <Button size="sm" onClick={checkDelivery} className="h-8">Check</Button>
              </div>
              {deliveryEstimate && <p className="text-sm text-green-600 font-sans flex items-center gap-1"><CheckCircle className="w-4 h-4" />{deliveryEstimate}</p>}
            </CardContent></Card>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Truck className="w-5 h-5 text-primary mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-1">Free Shipping</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-primary mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-1">Secure Payment</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <RefreshCw className="w-5 h-5 text-primary mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-1">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Description / Specs / Reviews */}
        <div className="p-4 space-y-4">
          <div className="flex gap-2 border-b border-border">
            {(["description", "specs", "reviews"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-sans capitalize border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground"}`}>
                {tab === "reviews" ? `Reviews (${reviews.length})` : tab}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground font-sans whitespace-pre-wrap">{product.description}</p>
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {product.tags.map((tag: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>)}
                </div>
              )}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-2">
              {product.specifications && Array.isArray(product.specifications) && product.specifications.length > 0 ? (
                (product.specifications as any[]).map((spec: any, i: number) => (
                  <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm font-sans">
                    <span className="text-muted-foreground">{spec.key}</span>
                    <span className="font-medium">{spec.value}</span>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  {product.sku && <div className="flex justify-between py-2 border-b border-border text-sm font-sans"><span className="text-muted-foreground">SKU</span><span>{product.sku}</span></div>}
                  {product.brand && <div className="flex justify-between py-2 border-b border-border text-sm font-sans"><span className="text-muted-foreground">Brand</span><span>{product.brand}</span></div>}
                  {product.weight > 0 && <div className="flex justify-between py-2 border-b border-border text-sm font-sans"><span className="text-muted-foreground">Weight</span><span>{product.weight}g</span></div>}
                  {product.dimensions && <div className="flex justify-between py-2 border-b border-border text-sm font-sans"><span className="text-muted-foreground">Dimensions</span><span>{product.dimensions}</span></div>}
                  <div className="flex justify-between py-2 border-b border-border text-sm font-sans"><span className="text-muted-foreground">Category</span><span>{product.shop_categories?.name}</span></div>
                  <div className="flex justify-between py-2 text-sm font-sans"><span className="text-muted-foreground">Type</span><span>{product.is_pod ? "Print on Demand" : "Ready-made"}</span></div>
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-4">
              {/* Rating Summary */}
              {reviews.length > 0 && (
                <Card><CardContent className="p-4 flex gap-6 items-center">
                  <div className="text-center">
                    <p className="font-display text-4xl font-bold text-primary">{avgRating}</p>
                    <div className="flex justify-center">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(avgRating)) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {ratingDist.map(r => (
                      <div key={r.star} className="flex items-center gap-2 text-xs font-sans">
                        <span className="w-3">{r.star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${reviews.length > 0 ? (r.count / reviews.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-muted-foreground w-6 text-right">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}

              <Button variant="outline" className="rounded-full" onClick={() => setShowReviewForm(!showReviewForm)}>
                <Star className="w-4 h-4 mr-1" />Write a Review
              </Button>

              {showReviewForm && (
                <Card><CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-sm">Rating</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setReviewForm(f => ({ ...f, rating: s }))}>
                          <Star className={`w-6 h-6 ${s <= reviewForm.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><Label className="text-sm">Title</Label><Input value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} placeholder="Summarize your review" /></div>
                  <div><Label className="text-sm">Review</Label><Textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Share your experience..." rows={3} /></div>
                  <Button onClick={submitReview} disabled={submittingReview} className="rounded-full">{submittingReview ? "Submitting..." : "Submit Review"}</Button>
                </CardContent></Card>
              )}

              {/* Reviews list */}
              {reviews.map(r => (
                <Card key={r.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                    {r.is_verified_purchase && <Badge variant="secondary" className="text-[10px]">Verified</Badge>}
                  </div>
                  {r.title && <p className="font-sans font-semibold text-sm">{r.title}</p>}
                  {r.comment && <p className="text-sm text-muted-foreground font-sans">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                </CardContent></Card>
              ))}
              {reviews.length === 0 && !showReviewForm && <p className="text-center text-muted-foreground text-sm py-4">No reviews yet. Be the first!</p>}
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="p-4 space-y-3">
            <h2 className="font-display font-bold">Similar Products</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {relatedProducts.map(p => (
                <Card key={p.id} className="min-w-[160px] overflow-hidden cursor-pointer hover:shadow-lg transition-shadow shrink-0" onClick={() => navigate(`/shop/product/${p.slug}`)}>
                  <div className="aspect-square bg-muted w-40">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Store className="w-8 h-8 text-muted-foreground/30 m-auto" />}
                  </div>
                  <CardContent className="p-2 space-y-0.5">
                    <p className="font-sans text-xs font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-primary text-sm">{formatPrice(p.discount_price || p.price)}</span>
                      {p.discount_price && <span className="text-[10px] line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom Dialog */}
      <AnimatePresence>
        {zoomedImage && product.images?.[selectedImage] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4" onClick={() => setZoomedImage(false)}>
            <img src={product.images[selectedImage]} alt="" className="max-w-full max-h-full object-contain"  loading="lazy" decoding="async" />
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card flex items-center justify-center" onClick={() => setZoomedImage(false)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopProduct;
