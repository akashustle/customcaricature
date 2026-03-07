import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Minus, Plus, ShoppingCart, Loader2, Store } from "lucide-react";

const ShopCart = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shipping, setShipping] = useState({ name: "", mobile: "", address: "", city: "", state: "", pincode: "" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchCart();
  }, [user, authLoading]);

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase.from("shop_cart_items")
      .select("*, shop_products(name, price, discount_price, images, stock_quantity), shop_product_variations(variation_type, variation_value, price_adjustment)")
      .eq("user_id", user.id).order("created_at");
    if (data) setCartItems(data);
    setLoading(false);

    // Pre-fill shipping from profile
    const { data: profile } = await supabase.from("profiles").select("full_name, mobile, address, city, state, pincode").eq("user_id", user.id).maybeSingle();
    if (profile) {
      setShipping({
        name: profile.full_name || "", mobile: profile.mobile || "",
        address: profile.address || "", city: profile.city || "",
        state: profile.state || "", pincode: profile.pincode || ""
      });
    }
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return removeItem(id);
    await supabase.from("shop_cart_items").update({ quantity: qty }).eq("id", id);
    setCartItems(items => items.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = async (id: string) => {
    await supabase.from("shop_cart_items").delete().eq("id", id);
    setCartItems(items => items.filter(i => i.id !== id));
  };

  const getItemPrice = (item: any) => {
    const base = item.shop_products?.discount_price || item.shop_products?.price || 0;
    const adj = item.shop_product_variations?.price_adjustment || 0;
    return (base + adj) * item.quantity;
  };

  const total = cartItems.reduce((s, i) => s + getItemPrice(i), 0);

  const placeOrder = async () => {
    if (!shipping.name || !shipping.mobile || !shipping.address || !shipping.city || !shipping.state || !shipping.pincode) {
      toast({ title: "Please fill all shipping details", variant: "destructive" });
      return;
    }
    setCheckingOut(true);
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase.from("shop_orders").insert({
        user_id: user!.id, total_amount: total, order_number: "",
        shipping_name: shipping.name, shipping_mobile: shipping.mobile,
        shipping_address: shipping.address, shipping_city: shipping.city,
        shipping_state: shipping.state, shipping_pincode: shipping.pincode,
      }).select().single();

      if (orderErr) throw orderErr;

      // Create order items
      const items = cartItems.map(ci => ({
        order_id: order.id, product_id: ci.product_id, variation_id: ci.variation_id || null,
        product_name: ci.shop_products?.name || "", quantity: ci.quantity,
        unit_price: (ci.shop_products?.discount_price || ci.shop_products?.price || 0) + (ci.shop_product_variations?.price_adjustment || 0),
        caricature_image_url: ci.caricature_image_url || null,
      }));
      await supabase.from("shop_order_items").insert(items);

      // Initialize Razorpay payment
      const { data: rzpData, error: rzpErr } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: total, receipt: order.order_number, notes: { type: "shop", order_id: order.id } },
      });

      if (rzpErr || !rzpData?.order_id) {
        // Mark order as created, payment pending
        toast({ title: "Order created! Payment pending.", description: "Complete payment from your dashboard." });
        await supabase.from("shop_cart_items").delete().eq("user_id", user!.id);
        navigate("/dashboard");
        return;
      }

      // Update order with Razorpay ID
      await supabase.from("shop_orders").update({ razorpay_order_id: rzpData.order_id }).eq("id", order.id);

      // Open Razorpay
      const options = {
        key: rzpData.key_id, amount: total * 100, currency: "INR", name: "CCC Shop",
        description: `Order ${order.order_number}`, order_id: rzpData.order_id,
        prefill: { name: shipping.name, contact: shipping.mobile, email: user!.email },
        handler: async (response: any) => {
          await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.id, type: "shop",
            },
          });
          await supabase.from("shop_orders").update({
            payment_status: "paid", razorpay_payment_id: response.razorpay_payment_id
          }).eq("id", order.id);
          await supabase.from("shop_cart_items").delete().eq("user_id", user!.id);
          toast({ title: "Payment successful! 🎉" });
          navigate("/dashboard");
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Order failed", description: err?.message, variant: "destructive" });
    }
    setCheckingOut(false);
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shop")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-display text-lg font-bold">Cart ({cartItems.length})</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {cartItems.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-4">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <p className="font-sans text-muted-foreground">Your cart is empty</p>
            <Button onClick={() => navigate("/shop")} className="rounded-full">Browse Products</Button>
          </CardContent></Card>
        ) : (
          <>
            {cartItems.map(item => (
              <Card key={item.id}>
                <CardContent className="p-3 flex gap-3">
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {item.shop_products?.images?.[0] ? (
                      <img src={item.shop_products.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : <Store className="w-8 h-8 text-muted-foreground/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium text-sm truncate">{item.shop_products?.name}</p>
                    {item.shop_product_variations && (
                      <p className="text-xs text-muted-foreground capitalize">{item.shop_product_variations.variation_type}: {item.shop_product_variations.variation_value}</p>
                    )}
                    <p className="font-display font-bold text-primary mt-1">{formatPrice(getItemPrice(item))}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => updateQty(item.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => updateQty(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="w-6 h-6 ml-auto" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Checkout Section */}
            {!showCheckout ? (
              <Card><CardContent className="p-4 space-y-3">
                <div className="flex justify-between font-sans">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-display font-bold text-lg">{formatPrice(total)}</span>
                </div>
                <Button className="w-full rounded-full" onClick={() => setShowCheckout(true)}>Proceed to Checkout</Button>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="p-4 space-y-3">
                <h3 className="font-display font-bold">Shipping Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Full Name</Label><Input value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} /></div>
                  <div className="col-span-2"><Label>Mobile</Label><Input value={shipping.mobile} onChange={e => setShipping(s => ({ ...s, mobile: e.target.value }))} /></div>
                  <div className="col-span-2"><Label>Address</Label><Input value={shipping.address} onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} /></div>
                  <div><Label>City</Label><Input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} /></div>
                  <div className="col-span-2"><Label>Pincode</Label><Input value={shipping.pincode} onChange={e => setShipping(s => ({ ...s, pincode: e.target.value }))} /></div>
                </div>
                <div className="flex justify-between font-sans pt-2 border-t border-border">
                  <span className="font-semibold">Total</span>
                  <span className="font-display font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>
                <Button className="w-full rounded-full" onClick={placeOrder} disabled={checkingOut}>
                  {checkingOut ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Pay ${formatPrice(total)}`}
                </Button>
              </CardContent></Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopCart;
