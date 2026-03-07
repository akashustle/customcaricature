import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Plus, Edit2, Trash2, Package, ShoppingCart, Tag, Settings, Users, BarChart3, Loader2, Store, Image, Copy, Upload, TrendingUp, AlertTriangle, Eye, Search, DollarSign, RefreshCw, FileText, Download, Calendar, Star, Percent, Clock, ArrowUpDown, ShoppingBag, Truck, MapPin, Layers, Zap, Target, Award, Activity, PieChart as PieIcon, TrendingDown, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, Legend } from "recharts";

const COLORS = ["hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)", "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(270, 50%, 55%)", "hsl(190, 60%, 50%)", "hsl(15, 65%, 55%)"];

const ShopAdmin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [productForm, setProductForm] = useState({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true });
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "", image_url: "" });
  const [admins, setAdmins] = useState<any[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [invoiceForm, setInvoiceForm] = useState({ notes: "", status: "generated" });
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [variationProductId, setVariationProductId] = useState<string | null>(null);
  const [variationForm, setVariationForm] = useState({ variation_type: "size", variation_value: "", price_adjustment: 0, stock_quantity: 0 });
  const [shopNavVisible, setShopNavVisible] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/CFCAdmin936"); return; }
    checkAuth();
  }, [user, authLoading]);

  const checkAuth = async () => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user!.id) as any;
    const ok = roles?.some((r: any) => r.role === "shop_admin" || r.role === "admin");
    if (!ok) { navigate("/CFCAdmin936"); return; }
    setAuthorized(true);
    setChecking(false);
    fetchAll();
  };

  const fetchAll = async () => {
    const [p, c, o, s, inv, navSetting] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_settings").select("*").eq("id", "shop_enabled").maybeSingle(),
      supabase.from("invoices").select("*").eq("invoice_type", "shop_order").order("created_at", { ascending: false }),
      supabase.from("admin_site_settings").select("*").eq("id", "shop_nav_visible").maybeSingle(),
    ]);
    if (p.data) setProducts(p.data);
    if (c.data) setCategories(c.data);
    if (o.data) setOrders(o.data);
    if (s.data) setShopEnabled((s.data.value as any)?.enabled || false);
    if (inv.data) setInvoices(inv.data as any);
    if (navSetting.data) setShopNavVisible((navSetting.data.value as any)?.enabled || false);

    // Fetch variations
    const { data: vars } = await supabase.from("shop_product_variations").select("*").order("created_at");
    if (vars) setVariations(vars);

    const { data: shopAdminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "shop_admin") as any;
    if (shopAdminRoles?.length) {
      const ids = shopAdminRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
      if (profiles) setAdmins(profiles);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    const ch = supabase.channel("shop-admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_products" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_settings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_product_variations" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authorized]);

  const toggleShop = async () => {
    await supabase.from("shop_settings").update({ value: { enabled: !shopEnabled } as any }).eq("id", "shop_enabled");
    setShopEnabled(!shopEnabled);
    toast({ title: !shopEnabled ? "Shop Enabled" : "Shop Disabled" });
  };

  const toggleShopNav = async () => {
    const newVal = !shopNavVisible;
    await supabase.from("admin_site_settings").upsert({ id: "shop_nav_visible", value: { enabled: newVal } as any });
    setShopNavVisible(newVal);
    toast({ title: newVal ? "Shop tab visible in nav" : "Shop tab hidden from nav" });
  };

  const uploadProductImages = async (productId: string, files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `products/${productId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("shop-images").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(path);
        if (urlData?.publicUrl) urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const saveProduct = async () => {
    setUploadingImages(true);
    const slug = productForm.slug || productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload: any = {
      name: productForm.name, slug, description: productForm.description, price: productForm.price,
      discount_price: productForm.discount_price || null, sku: productForm.sku || null,
      stock_quantity: productForm.stock_quantity, category_id: productForm.category_id || null,
      is_pod: productForm.is_pod, is_active: productForm.is_active, seo_title: productForm.seo_title || null,
      seo_description: productForm.seo_description || null, tags: productForm.tags ? productForm.tags.split(",").map(t => t.trim()) : [],
    };
    if (editProduct) {
      let newUrls: string[] = [];
      if (productImages.length > 0) newUrls = await uploadProductImages(editProduct.id, productImages);
      if (newUrls.length > 0) payload.images = [...(editProduct.images || []), ...newUrls];
      await supabase.from("shop_products").update(payload).eq("id", editProduct.id);
      toast({ title: "Product updated" });
    } else {
      const { data: newProduct } = await supabase.from("shop_products").insert(payload).select("id").single();
      if (newProduct && productImages.length > 0) {
        const urls = await uploadProductImages(newProduct.id, productImages);
        if (urls.length > 0) await supabase.from("shop_products").update({ images: urls }).eq("id", newProduct.id);
      }
      toast({ title: "Product created" });
    }
    setShowProductDialog(false); setEditProduct(null); setProductImages([]);
    setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true });
    setUploadingImages(false); fetchAll();
  };

  const deleteProductImage = async (productId: string, imageUrl: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newImages = (product.images || []).filter((i: string) => i !== imageUrl);
    await supabase.from("shop_products").update({ images: newImages }).eq("id", productId);
    const pathMatch = imageUrl.split("/shop-images/")[1];
    if (pathMatch) await supabase.storage.from("shop-images").remove([pathMatch]);
    toast({ title: "Image deleted" }); fetchAll();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("shop_products").delete().eq("id", id);
    toast({ title: "Product deleted" }); fetchAll();
  };

  const duplicateProduct = async (p: any) => {
    const { id, created_at, updated_at, shop_categories, ...rest } = p;
    await supabase.from("shop_products").insert({ ...rest, slug: rest.slug + "-copy-" + Date.now(), name: rest.name + " (Copy)" });
    toast({ title: "Product duplicated" }); fetchAll();
  };

  const saveCategory = async () => {
    const slug = categoryForm.slug || categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (editCategory) {
      await supabase.from("shop_categories").update({ name: categoryForm.name, slug, description: categoryForm.description, image_url: categoryForm.image_url || null }).eq("id", editCategory.id);
    } else {
      await supabase.from("shop_categories").insert({ name: categoryForm.name, slug, description: categoryForm.description, image_url: categoryForm.image_url || null });
    }
    setShowCategoryDialog(false); setEditCategory(null);
    setCategoryForm({ name: "", slug: "", description: "", image_url: "" }); fetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("shop_categories").delete().eq("id", id); fetchAll();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("shop_orders").update({ status }).eq("id", orderId);
    toast({ title: `Order → ${status}` }); fetchAll();
  };

  const openEditProduct = (p: any) => {
    setEditProduct(p);
    setProductForm({ name: p.name, slug: p.slug, description: p.description, price: p.price, discount_price: p.discount_price || 0, sku: p.sku || "", stock_quantity: p.stock_quantity, category_id: p.category_id || "", is_pod: p.is_pod, seo_title: p.seo_title || "", seo_description: p.seo_description || "", tags: (p.tags || []).join(", "), is_active: p.is_active });
    setProductImages([]); setShowProductDialog(true);
  };

  // Invoice management
  const openEditInvoice = (inv: any) => {
    setEditInvoice(inv);
    setInvoiceForm({ notes: inv.notes || "", status: inv.status });
    setShowInvoiceDialog(true);
  };

  const saveInvoice = async () => {
    if (!editInvoice) return;
    await supabase.from("invoices").update({ notes: invoiceForm.notes || null, status: invoiceForm.status }).eq("id", editInvoice.id);
    toast({ title: "Invoice updated" });
    setShowInvoiceDialog(false); setEditInvoice(null); fetchAll();
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    toast({ title: "Invoice deleted" }); fetchAll();
  };

  // Variations management
  const openVariations = (productId: string) => {
    setVariationProductId(productId);
    setVariationForm({ variation_type: "size", variation_value: "", price_adjustment: 0, stock_quantity: 0 });
    setShowVariationDialog(true);
  };

  const saveVariation = async () => {
    if (!variationProductId || !variationForm.variation_value) return;
    await supabase.from("shop_product_variations").insert({
      product_id: variationProductId, variation_type: variationForm.variation_type,
      variation_value: variationForm.variation_value, price_adjustment: variationForm.price_adjustment,
      stock_quantity: variationForm.stock_quantity,
    });
    toast({ title: "Variation added" });
    setVariationForm({ variation_type: "size", variation_value: "", price_adjustment: 0, stock_quantity: 0 }); fetchAll();
  };

  const deleteVariation = async (id: string) => {
    await supabase.from("shop_product_variations").delete().eq("id", id);
    toast({ title: "Variation deleted" }); fetchAll();
  };

  if (checking || authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => s + o.total_amount, 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0);
  const outOfStock = products.filter(p => p.stock_quantity === 0);
  const activeProducts = products.filter(p => p.is_active);
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const totalStock = products.reduce((s, p) => s + p.stock_quantity, 0);

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (orderSearch && !o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) && !o.shipping_name?.toLowerCase().includes(orderSearch.toLowerCase())) return false;
    return true;
  });

  // ====== ANALYTICS DATA ======
  // Revenue by month
  const monthlyData: Record<string, number> = {};
  paidOrders.forEach(o => { const m = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); monthlyData[m] = (monthlyData[m] || 0) + o.total_amount; });
  const revenueChartData = Object.entries(monthlyData).map(([name, revenue]) => ({ name, revenue }));

  // Category distribution
  const catDist: Record<string, number> = {};
  products.forEach(p => { const cat = p.shop_categories?.name || "Uncategorized"; catDist[cat] = (catDist[cat] || 0) + 1; });
  const categoryDistData = Object.entries(catDist).map(([name, value]) => ({ name, value }));

  // Order status distribution
  const statusDist: Record<string, number> = {};
  orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
  const statusChartData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

  // Daily orders (last 30 days)
  const dailyOrders: Record<string, number> = {};
  const last30 = new Date(); last30.setDate(last30.getDate() - 30);
  orders.filter(o => new Date(o.created_at) >= last30).forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    dailyOrders[d] = (dailyOrders[d] || 0) + 1;
  });
  const dailyOrdersData = Object.entries(dailyOrders).map(([name, orders]) => ({ name, orders }));

  // Revenue by category
  const catRevenue: Record<string, number> = {};
  paidOrders.forEach(o => { catRevenue[o.shipping_state || "Unknown"] = (catRevenue[o.shipping_state || "Unknown"] || 0) + o.total_amount; });
  const catRevenueData = Object.entries(catRevenue).slice(0, 8).map(([name, revenue]) => ({ name, revenue }));

  // Hourly orders
  const hourlyOrders: Record<number, number> = {};
  orders.forEach(o => { const h = new Date(o.created_at).getHours(); hourlyOrders[h] = (hourlyOrders[h] || 0) + 1; });
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: hourlyOrders[i] || 0 }));

  // Payment status breakdown
  const paymentDist: Record<string, number> = {};
  orders.forEach(o => { paymentDist[o.payment_status || "unknown"] = (paymentDist[o.payment_status || "unknown"] || 0) + 1; });
  const paymentChartData = Object.entries(paymentDist).map(([name, value]) => ({ name, value }));

  // Top products by order frequency
  const productOrderCount: Record<string, number> = {};
  // We don't have items in orders data, so use products by stock sold
  const topProductsData = products.slice(0, 5).map(p => ({ name: p.name.slice(0, 20), stock: p.stock_quantity, price: p.price }));

  // Weekly revenue
  const weeklyRevenue: Record<string, number> = {};
  paidOrders.forEach(o => {
    const d = new Date(o.created_at);
    const week = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-IN", { month: "short" })}`;
    weeklyRevenue[week] = (weeklyRevenue[week] || 0) + o.total_amount;
  });
  const weeklyRevenueData = Object.entries(weeklyRevenue).map(([name, revenue]) => ({ name, revenue }));

  // City distribution
  const cityDist: Record<string, number> = {};
  orders.forEach(o => { if (o.shipping_city) cityDist[o.shipping_city] = (cityDist[o.shipping_city] || 0) + 1; });
  const cityData = Object.entries(cityDist).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Avg order value over time
  const avgByMonth: Record<string, { total: number; count: number }> = {};
  paidOrders.forEach(o => {
    const m = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (!avgByMonth[m]) avgByMonth[m] = { total: 0, count: 0 };
    avgByMonth[m].total += o.total_amount; avgByMonth[m].count++;
  });
  const avgOrderData = Object.entries(avgByMonth).map(([name, v]) => ({ name, avg: Math.round(v.total / v.count) }));

  // Stock vs price scatter (as bar)
  const stockPriceData = products.slice(0, 10).map(p => ({ name: p.name.slice(0, 15), stock: p.stock_quantity, price: p.price / 100 }));

  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const conversionRate = orders.length > 0 ? Math.round((paidOrders.length / orders.length) * 100) : 0;
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const todayRevenue = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString() && o.payment_status === "paid").reduce((s: number, o: any) => s + o.total_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold">Shop Admin</h1>
          <Badge variant={shopEnabled ? "default" : "secondary"}>{shopEnabled ? "Live" : "Disabled"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2"><span className="text-xs font-sans text-muted-foreground">Shop</span><Switch checked={shopEnabled} onCheckedChange={toggleShop} /></div>
          <Button variant="ghost" size="sm" onClick={() => fetchAll()}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/CFCAdmin936"); }}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Products", value: activeProducts.length, icon: Package, sub: `${outOfStock.length} OOS` },
            { label: "Orders", value: orders.length, icon: ShoppingCart, sub: `${pendingOrders} pending` },
            { label: "Revenue", value: formatPrice(totalRevenue), icon: DollarSign, sub: "Total" },
            { label: "Today", value: todayOrders, icon: Calendar, sub: formatPrice(todayRevenue) },
            { label: "Avg Order", value: formatPrice(avgOrderValue), icon: Target, sub: "Per order" },
            { label: "Conversion", value: `${conversionRate}%`, icon: Percent, sub: "Paid/Total" },
            { label: "Low Stock", value: lowStockProducts.length, icon: AlertTriangle, sub: "≤5 items" },
            { label: "Stock", value: totalStock, icon: Layers, sub: "Total units" },
          ].map((s, i) => (
            <Card key={i}><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><s.icon className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
                  <p className="text-sm font-bold font-display">{s.value}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="products">
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1">Invoices</TabsTrigger>
            <TabsTrigger value="admins" className="flex-1">Admins</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Products ({products.length})</h2>
              <Button size="sm" onClick={() => { setEditProduct(null); setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true }); setProductImages([]); setShowProductDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Product
              </Button>
            </div>
            {products.map(p => (
              <Card key={p.id} className={!p.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-sans font-semibold truncate">{p.name}</h3>
                        {p.is_pod && <Badge variant="secondary" className="text-xs">POD</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        {p.stock_quantity === 0 && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                        {p.stock_quantity > 0 && p.stock_quantity <= 5 && <Badge className="bg-amber-100 text-amber-800 border-none text-xs">Low Stock</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">{p.shop_categories?.name || "Uncategorized"} • SKU: {p.sku || "N/A"} • Stock: {p.stock_quantity} • {p.images?.length || 0} imgs • {variations.filter(v => v.product_id === p.id).length} variants</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                        {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap">
                      <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)} title="Edit"><Edit2 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openVariations(p.id)} title="Variations"><Layers className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicateProduct(p)} title="Duplicate"><Copy className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteProduct(p.id)} title="Delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <h2 className="font-display text-lg font-bold">Orders ({orders.length})</h2>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search orders..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                <Button key={s} size="sm" variant={orderStatusFilter === s ? "default" : "outline"} className="text-xs h-7 rounded-full capitalize" onClick={() => setOrderStatusFilter(s)}>
                  {s} ({s === "all" ? orders.length : orders.filter(o => o.status === s).length})
                </Button>
              ))}
            </div>
            {filteredOrders.map(o => (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-sans font-semibold text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.shipping_name} • {o.shipping_city}, {o.shipping_state}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{formatPrice(o.total_amount)}</p>
                      <Badge variant={o.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{o.payment_status}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">📍 {o.shipping_address}, {o.shipping_city} - {o.shipping_pincode}</p>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                      <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className="text-xs capitalize h-7" onClick={() => updateOrderStatus(o.id, s)}>{s}</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground font-sans py-8">No orders found</p>}
          </TabsContent>

          {/* ANALYTICS TAB - 20+ Charts */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Shop Analytics Dashboard</h2>
            
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-primary">{formatPrice(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground font-sans">Total Revenue</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-primary">{formatPrice(avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground font-sans">Avg Order Value</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-primary">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground font-sans">Conversion Rate</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-primary">{todayOrders}</p>
                <p className="text-xs text-muted-foreground font-sans">Today's Orders</p>
              </CardContent></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Revenue Trend */}
              {revenueChartData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><TrendingUp className="w-4 h-4" />Revenue Trend</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="hsl(36, 45%, 52%)" fillOpacity={0.2} /></AreaChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 2. Category Distribution */}
              {categoryDistData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><PieIcon className="w-4 h-4" />Products by Category</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={categoryDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>{categoryDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 3. Order Status Distribution */}
              {statusChartData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><BarChart2 className="w-4 h-4" />Order Status</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={statusChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} /></BarChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 4. Daily Orders */}
              {dailyOrdersData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Calendar className="w-4 h-4" />Daily Orders (30d)</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyOrdersData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="orders" stroke="hsl(152, 50%, 48%)" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 5. Hourly Orders */}
              <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Clock className="w-4 h-4" />Peak Order Hours</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="orders" fill="hsl(340, 55%, 58%)" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer></CardContent></Card>
              {/* 6. Payment Status */}
              {paymentChartData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><DollarSign className="w-4 h-4" />Payment Status</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={paymentChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{paymentChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 7. Revenue by State */}
              {catRevenueData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><MapPin className="w-4 h-4" />Revenue by State</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={catRevenueData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Bar dataKey="revenue" fill="hsl(38, 92%, 55%)" radius={[0, 4, 4, 0]} /></BarChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 8. Weekly Revenue */}
              {weeklyRevenueData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><TrendingUp className="w-4 h-4" />Weekly Revenue</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weeklyRevenueData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Area type="monotone" dataKey="revenue" stroke="hsl(270, 50%, 55%)" fill="hsl(270, 50%, 55%)" fillOpacity={0.2} /></AreaChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 9. Top Cities */}
              {cityData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><MapPin className="w-4 h-4" />Top Cities</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="hsl(190, 60%, 50%)" radius={[4, 4, 0, 0]} /></BarChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 10. Avg Order Value Trend */}
              {avgOrderData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Target className="w-4 h-4" />Avg Order Value Trend</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <LineChart data={avgOrderData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Line type="monotone" dataKey="avg" stroke="hsl(15, 65%, 55%)" strokeWidth={2} /></LineChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 11. Stock vs Price */}
              {stockPriceData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Layers className="w-4 h-4" />Stock Overview</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stockPriceData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="stock" fill="hsl(152, 50%, 48%)" radius={[4, 4, 0, 0]} /></BarChart>
                  </ResponsiveContainer></CardContent></Card>
              )}
              {/* 12. Quick Metrics */}
              <Card><CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Activity className="w-4 h-4" />Quick Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Total Products</span><span className="font-bold">{products.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Active Products</span><span className="font-bold">{activeProducts.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Total Orders</span><span className="font-bold">{orders.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Paid Orders</span><span className="font-bold">{paidOrders.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Today's Revenue</span><span className="font-bold">{formatPrice(todayRevenue)}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Total Stock</span><span className="font-bold">{totalStock} units</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Variations</span><span className="font-bold">{variations.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Invoices</span><span className="font-bold">{invoices.length}</span></div>
                </CardContent></Card>
            </div>
          </TabsContent>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Inventory Management</h2>
            {outOfStock.length > 0 && (
              <Card className="border-destructive/30"><CardContent className="p-4">
                <p className="font-sans font-semibold text-destructive text-sm mb-2">⚠️ Out of Stock ({outOfStock.length})</p>
                {outOfStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1 text-sm font-sans">
                    <span>{p.name}</span>
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Add" onBlur={async (e) => { const qty = parseInt(e.target.value); if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id); fetchAll(); toast({ title: "Stock updated" }); } }} />
                  </div>
                ))}
              </CardContent></Card>
            )}
            {lowStockProducts.length > 0 && (
              <Card className="border-amber-300/30"><CardContent className="p-4">
                <p className="font-sans font-semibold text-amber-700 text-sm mb-2">⚡ Low Stock ({lowStockProducts.length})</p>
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1 text-sm font-sans">
                    <span>{p.name} <Badge className="text-[10px] bg-amber-100 text-amber-800 border-none ml-1">{p.stock_quantity} left</Badge></span>
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Add" onBlur={async (e) => { const qty = parseInt(e.target.value); if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: p.stock_quantity + qty }).eq("id", p.id); fetchAll(); toast({ title: "Stock updated" }); } }} />
                  </div>
                ))}
              </CardContent></Card>
            )}
            <Card><CardContent className="p-4">
              <p className="font-sans font-semibold text-sm mb-3">All Products Stock</p>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border-none ${p.stock_quantity === 0 ? "bg-red-100 text-red-800" : p.stock_quantity <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{p.stock_quantity} units</Badge>
                      <Input type="number" className="w-16 h-7 text-xs" defaultValue={p.stock_quantity} onBlur={async (e) => { const qty = parseInt(e.target.value); if (!isNaN(qty) && qty !== p.stock_quantity) { await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id); fetchAll(); toast({ title: "Stock updated" }); } }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Categories ({categories.length})</h2>
              <Button size="sm" onClick={() => { setEditCategory(null); setCategoryForm({ name: "", slug: "", description: "", image_url: "" }); setShowCategoryDialog(true); }}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            {categories.map(c => (
              <Card key={c.id}><CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {c.image_url && <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div>
                    <h3 className="font-sans font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">/{c.slug} • {products.filter(p => p.category_id === c.id).length} products</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditCategory(c); setCategoryForm({ name: c.name, slug: c.slug, description: c.description || "", image_url: c.image_url || "" }); setShowCategoryDialog(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* INVOICES TAB - Edit/Delete */}
          <TabsContent value="invoices" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Shop Invoices ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground font-sans py-8">No invoices generated yet</p>
            ) : invoices.map((inv: any) => (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer_name} • {inv.customer_email}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer_mobile} • {new Date(inv.created_at).toLocaleDateString("en-IN")}</p>
                      {inv.payment_id && <p className="text-xs text-muted-foreground">Pay ID: {inv.payment_id}</p>}
                      {inv.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{inv.notes}"</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-display font-bold text-primary">{formatPrice(inv.total_amount)}</p>
                      <Badge className="text-xs">{inv.status}</Badge>
                      <div className="flex gap-1 mt-1">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEditInvoice(inv)}><Edit2 className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => deleteInvoice(inv.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                  {/* Invoice items */}
                  {inv.items && Array.isArray(inv.items) && inv.items.length > 0 && (
                    <div className="mt-2 border-t border-border pt-2 space-y-1">
                      {(inv.items as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs font-sans">
                          <span>{item.name} × {item.qty}</span>
                          <span>{formatPrice(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ADMINS TAB */}
          <TabsContent value="admins" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Shop Admins ({admins.length})</h2>
            {admins.map(a => (
              <Card key={a.id}><CardContent className="p-4 flex justify-between items-center">
                <div><p className="font-sans font-semibold">{a.full_name}</p><p className="text-xs text-muted-foreground">{a.email}</p></div>
                <Button size="sm" variant="destructive" onClick={async () => { if (!confirm("Remove?")) return; await supabase.from("user_roles").delete().eq("user_id", a.user_id).eq("role", "shop_admin"); toast({ title: "Removed" }); fetchAll(); }}>Remove</Button>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-3">
            <Card><CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div><h3 className="font-sans font-semibold">Shop Status</h3><p className="text-xs text-muted-foreground">Enable or disable the shop globally</p></div>
                <Switch checked={shopEnabled} onCheckedChange={toggleShop} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div><h3 className="font-sans font-semibold">Show Shop in Nav Bar</h3><p className="text-xs text-muted-foreground">Display Shop tab in website navigation</p></div>
                <Switch checked={shopNavVisible} onCheckedChange={toggleShopNav} />
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
            <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
            <div>
              <Label className="flex items-center gap-1 mb-2"><Image className="w-4 h-4" />Product Images</Label>
              {editProduct?.images?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {editProduct.images.map((img: string, i: number) => (
                    <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => deleteProductImage(editProduct.id, img)} className="absolute inset-0 bg-destructive/70 text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <Input type="file" multiple accept="image/*" onChange={e => setProductImages(Array.from(e.target.files || []))} />
              {productImages.length > 0 && <p className="text-xs text-muted-foreground mt-1">{productImages.length} new image(s)</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹) *</Label><Input type="number" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: +e.target.value }))} /></div>
              <div><Label>Discount Price</Label><Input type="number" value={productForm.discount_price} onChange={e => setProductForm(f => ({ ...f, discount_price: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Stock *</Label><Input type="number" value={productForm.stock_quantity} onChange={e => setProductForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
            </div>
            <div><Label>Category</Label>
              <Select value={productForm.category_id} onValueChange={v => setProductForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={productForm.is_pod} onCheckedChange={v => setProductForm(f => ({ ...f, is_pod: v }))} /><Label>POD</Label></div>
              <div className="flex items-center gap-2"><Switch checked={productForm.is_active} onCheckedChange={v => setProductForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={productForm.tags} onChange={e => setProductForm(f => ({ ...f, tags: e.target.value }))} /></div>
            <div><Label>SEO Title</Label><Input value={productForm.seo_title} onChange={e => setProductForm(f => ({ ...f, seo_title: e.target.value }))} /></div>
            <div><Label>SEO Description</Label><Textarea value={productForm.seo_description} onChange={e => setProductForm(f => ({ ...f, seo_description: e.target.value }))} /></div>
            <Button onClick={saveProduct} className="w-full" disabled={uploadingImages || !productForm.name}>
              {uploadingImages ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : editProduct ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editCategory ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={categoryForm.slug} onChange={e => setCategoryForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
            <div><Label>Description</Label><Textarea value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Image URL</Label><Input value={categoryForm.image_url} onChange={e => setCategoryForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
            <Button onClick={saveCategory} className="w-full">{editCategory ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Edit Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editInvoice && <p className="font-mono text-sm">{editInvoice.invoice_number}</p>}
            <div><Label>Status</Label>
              <Select value={invoiceForm.status} onValueChange={v => setInvoiceForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={saveInvoice} className="w-full">Update Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variations Dialog */}
      <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Product Variations</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Existing variations */}
            {variations.filter(v => v.product_id === variationProductId).length > 0 ? (
              <div className="space-y-2">
                {variations.filter(v => v.product_id === variationProductId).map(v => (
                  <div key={v.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-sans text-sm font-medium capitalize">{v.variation_type}: {v.variation_value}</p>
                      <p className="text-xs text-muted-foreground">+{formatPrice(v.price_adjustment)} • Stock: {v.stock_quantity}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteVariation(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground font-sans">No variations yet</p>}
            <div className="border-t border-border pt-3">
              <p className="font-sans font-semibold text-sm mb-2">Add Variation</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={variationForm.variation_type} onValueChange={v => setVariationForm(f => ({ ...f, variation_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="style">Style</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Value</Label><Input value={variationForm.variation_value} onChange={e => setVariationForm(f => ({ ...f, variation_value: e.target.value }))} placeholder="e.g. Large, Red" /></div>
                <div><Label>Price +/-</Label><Input type="number" value={variationForm.price_adjustment} onChange={e => setVariationForm(f => ({ ...f, price_adjustment: +e.target.value }))} /></div>
                <div><Label>Stock</Label><Input type="number" value={variationForm.stock_quantity} onChange={e => setVariationForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
              </div>
              <Button onClick={saveVariation} className="w-full mt-2" disabled={!variationForm.variation_value}>Add Variation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopAdmin;
