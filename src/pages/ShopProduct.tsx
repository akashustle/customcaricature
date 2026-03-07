import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { ShoppingCart, Minus, Plus, ArrowLeft, Sparkles, Store } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const ShopProduct = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (slug) fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    const { data } = await supabase.from("shop_products").select("*, shop_categories(name)").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (data) {
      setProduct(data);
      const { data: vars } = await supabase.from("shop_product_variations").select("*").eq("product_id", data.id).eq("is_active", true);
      if (vars) setVariations(vars);
    }
    setLoading(false);
  };

  const addToCart = async () => {
    if (!user) { navigate("/login"); return; }
    setAdding(true);
    try {
      // Check if already in cart
      const { data: existing } = await supabase.from("shop_cart_items")
        .select("id, quantity").eq("user_id", user.id).eq("product_id", product.id)
        .eq("variation_id", selectedVariation || "").maybeSingle();

      if (existing) {
        await supabase.from("shop_cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
      } else {
        await supabase.from("shop_cart_items").insert({
          user_id: user.id, product_id: product.id, variation_id: selectedVariation || null, quantity
        });
      }
      toast({ title: "Added to cart! 🛒" });
    } catch { toast({ title: "Failed to add", variant: "destructive" }); }
    setAdding(false);
  };

  const buyNow = async () => {
    await addToCart();
    navigate("/shop/cart");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Product not found</p></div>;

  const currentPrice = (product.discount_price || product.price) + (selectedVariation ? (variations.find(v => v.id === selectedVariation)?.price_adjustment || 0) : 0);
  const sizeVariations = variations.filter(v => v.variation_type === "size");
  const colorVariations = variations.filter(v => v.variation_type === "color");

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title={product.seo_title || `${product.name} | CCC Shop`} description={product.seo_description || product.description?.slice(0, 160)} />

      <div className="bg-card border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shop")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-display text-lg font-bold truncate">{product.name}</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Images */}
        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {product.images?.[selectedImage] ? (
            <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <Store className="w-20 h-20 text-muted-foreground/20" />
          )}
        </div>
        {product.images?.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {product.images.map((img: string, i: number) => (
              <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === selectedImage ? "border-primary" : "border-transparent"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <Badge variant="secondary" className="text-xs mb-2">{product.shop_categories?.name}</Badge>
            <h1 className="font-display text-2xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-display text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
              {product.discount_price && <span className="text-lg line-through text-muted-foreground">{formatPrice(product.price)}</span>}
              {product.discount_price && <Badge className="bg-green-100 text-green-800 border-none">{Math.round((1 - product.discount_price / product.price) * 100)}% OFF</Badge>}
            </div>
          </div>

          {product.is_pod && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-sans font-semibold text-sm">Print-on-Demand</p>
                  <p className="text-xs text-muted-foreground">Upload your photo to get a custom caricature printed on this product!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variations */}
          {sizeVariations.length > 0 && (
            <div>
              <p className="font-sans font-semibold text-sm mb-2">Size</p>
              <div className="flex gap-2 flex-wrap">
                {sizeVariations.map(v => (
                  <Button key={v.id} size="sm" variant={selectedVariation === v.id ? "default" : "outline"} className="rounded-full"
                    onClick={() => setSelectedVariation(v.id)}>{v.variation_value}</Button>
                ))}
              </div>
            </div>
          )}
          {colorVariations.length > 0 && (
            <div>
              <p className="font-sans font-semibold text-sm mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {colorVariations.map(v => (
                  <Button key={v.id} size="sm" variant={selectedVariation === v.id ? "default" : "outline"} className="rounded-full"
                    onClick={() => setSelectedVariation(v.id)}>{v.variation_value}</Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="font-sans font-semibold text-sm mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="w-4 h-4" /></Button>
              <span className="font-display text-lg font-bold w-8 text-center">{quantity}</span>
              <Button size="icon" variant="outline" onClick={() => setQuantity(quantity + 1)}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-sans whitespace-pre-wrap">{product.description}</p>

          {product.stock_quantity < 1 && <Badge variant="destructive">Out of Stock</Badge>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={addToCart} disabled={adding || product.stock_quantity < 1}>
              <ShoppingCart className="w-4 h-4 mr-2" />{adding ? "Adding..." : "Add to Cart"}
            </Button>
            <Button className="flex-1 rounded-full" onClick={buyNow} disabled={adding || product.stock_quantity < 1}>Buy Now</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopProduct;
