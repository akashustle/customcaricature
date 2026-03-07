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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Plus, Edit2, Trash2, Package, ShoppingCart, Tag, Settings, Users, BarChart3, Loader2, Store, Image, Copy, Upload, TrendingUp, AlertTriangle, Eye, Search, DollarSign, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";

const COLORS = ["hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)", "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)"];

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
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

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
    const [p, c, o, s, inv] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_settings").select("*").eq("id", "shop_enabled").maybeSingle(),
      supabase.from("invoices").select("*").eq("invoice_type", "shop_order").order("created_at", { ascending: false }),
    ]);
    if (p.data) setProducts(p.data);
    if (c.data) setCategories(c.data);
    if (o.data) setOrders(o.data);
    if (s.data) setShopEnabled((s.data.value as any)?.enabled || false);
    if (inv.data) setInvoices(inv.data as any);

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
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authorized]);

  const toggleShop = async () => {
    await supabase.from("shop_settings").update({ value: { enabled: !shopEnabled } as any }).eq("id", "shop_enabled");
    setShopEnabled(!shopEnabled);
    toast({ title: !shopEnabled ? "Shop Enabled" : "Shop Disabled" });
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
      // Upload new images and append
      let newUrls: string[] = [];
      if (productImages.length > 0) {
        newUrls = await uploadProductImages(editProduct.id, productImages);
      }
      if (newUrls.length > 0) {
        payload.images = [...(editProduct.images || []), ...newUrls];
      }
      await supabase.from("shop_products").update(payload).eq("id", editProduct.id);
      toast({ title: "Product updated" });
    } else {
      const { data: newProduct } = await supabase.from("shop_products").insert(payload).select("id").single();
      if (newProduct && productImages.length > 0) {
        const urls = await uploadProductImages(newProduct.id, productImages);
        if (urls.length > 0) {
          await supabase.from("shop_products").update({ images: urls }).eq("id", newProduct.id);
        }
      }
      toast({ title: "Product created" });
    }
    setShowProductDialog(false);
    setEditProduct(null);
    setProductImages([]);
    setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true });
    setUploadingImages(false);
    fetchAll();
  };

  const deleteProductImage = async (productId: string, imageUrl: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newImages = (product.images || []).filter((i: string) => i !== imageUrl);
    await supabase.from("shop_products").update({ images: newImages }).eq("id", productId);
    // Delete from storage
    const pathMatch = imageUrl.split("/shop-images/")[1];
    if (pathMatch) await supabase.storage.from("shop-images").remove([pathMatch]);
    toast({ title: "Image deleted" });
    fetchAll();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("shop_products").delete().eq("id", id);
    toast({ title: "Product deleted" });
    fetchAll();
  };

  const duplicateProduct = async (p: any) => {
    const { id, created_at, updated_at, shop_categories, ...rest } = p;
    await supabase.from("shop_products").insert({ ...rest, slug: rest.slug + "-copy-" + Date.now(), name: rest.name + " (Copy)" });
    toast({ title: "Product duplicated" });
    fetchAll();
  };

  const saveCategory = async () => {
    const slug = categoryForm.slug || categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (editCategory) {
      await supabase.from("shop_categories").update({ name: categoryForm.name, slug, description: categoryForm.description, image_url: categoryForm.image_url || null }).eq("id", editCategory.id);
    } else {
      await supabase.from("shop_categories").insert({ name: categoryForm.name, slug, description: categoryForm.description, image_url: categoryForm.image_url || null });
    }
    setShowCategoryDialog(false);
    setEditCategory(null);
    setCategoryForm({ name: "", slug: "", description: "", image_url: "" });
    fetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await supabase.from("shop_categories").delete().eq("id", id);
    fetchAll();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("shop_orders").update({ status }).eq("id", orderId);
    toast({ title: `Order status → ${status}` });
    fetchAll();
  };

  const openEditProduct = (p: any) => {
    setEditProduct(p);
    setProductForm({
      name: p.name, slug: p.slug, description: p.description, price: p.price,
      discount_price: p.discount_price || 0, sku: p.sku || "", stock_quantity: p.stock_quantity,
      category_id: p.category_id || "", is_pod: p.is_pod, seo_title: p.seo_title || "",
      seo_description: p.seo_description || "", tags: (p.tags || []).join(", "), is_active: p.is_active,
    });
    setProductImages([]);
    setShowProductDialog(true);
  };

  if (checking || authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => s + o.total_amount, 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0);
  const outOfStock = products.filter(p => p.stock_quantity === 0);
  const activeProducts = products.filter(p => p.is_active);

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (orderSearch && !o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) && !o.shipping_name?.toLowerCase().includes(orderSearch.toLowerCase())) return false;
    return true;
  });

  // Revenue by month chart data
  const monthlyData: Record<string, number> = {};
  orders.filter(o => o.payment_status === "paid").forEach(o => {
    const m = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    monthlyData[m] = (monthlyData[m] || 0) + o.total_amount;
  });
  const revenueChartData = Object.entries(monthlyData).map(([name, revenue]) => ({ name, revenue }));

  // Category distribution
  const catDist: Record<string, number> = {};
  products.forEach(p => { const cat = p.shop_categories?.name || "Uncategorized"; catDist[cat] = (catDist[cat] || 0) + 1; });
  const categoryDistData = Object.entries(catDist).map(([name, value]) => ({ name, value }));

  // Order status distribution
  const statusDist: Record<string, number> = {};
  orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
  const statusChartData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold">Shop Admin</h1>
          <Badge variant={shopEnabled ? "default" : "secondary"}>{shopEnabled ? "Live" : "Disabled"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-muted-foreground">Shop</span>
            <Switch checked={shopEnabled} onCheckedChange={toggleShop} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchAll()}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/CFCAdmin936"); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Products", value: activeProducts.length, icon: Package, sub: `${outOfStock.length} out of stock` },
            { label: "Orders", value: orders.length, icon: ShoppingCart, sub: `${pendingOrders} pending` },
            { label: "Revenue", value: formatPrice(totalRevenue), icon: DollarSign, sub: "Total paid" },
            { label: "Pending", value: pendingOrders, icon: Tag, sub: "Awaiting" },
            { label: "Low Stock", value: lowStockProducts.length, icon: AlertTriangle, sub: "≤5 items" },
            { label: "Categories", value: categories.length, icon: Store, sub: `${categories.filter(c => c.is_active).length} active` },
          ].map((s, i) => (
            <Card key={i}><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><s.icon className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
                  <p className="text-lg font-bold font-display">{s.value}</p>
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
                    {/* Product image */}
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
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">{p.shop_categories?.name || "Uncategorized"} • SKU: {p.sku || "N/A"} • Stock: {p.stock_quantity} • {p.images?.length || 0} images</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                        {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicateProduct(p)}><Copy className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteProduct(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search orders..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="pl-10" />
                </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">📍 {o.shipping_address}, {o.shipping_city} - {o.shipping_pincode}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                      <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className="text-xs capitalize h-7"
                        onClick={() => updateOrderStatus(o.id, s)}>{s}</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground font-sans py-8">No orders found</p>}
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Shop Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revenueChartData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans">Revenue Trend</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => formatPrice(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="hsl(36, 45%, 52%)" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer></CardContent>
                </Card>
              )}
              {categoryDistData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans">Products by Category</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={categoryDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {categoryDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer></CardContent>
                </Card>
              )}
              {statusChartData.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm font-sans">Order Status Distribution</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer></CardContent>
                </Card>
              )}
              <Card><CardHeader><CardTitle className="text-sm font-sans">Quick Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Avg Order Value</span><span className="font-bold">{formatPrice(orders.length > 0 ? Math.round(totalRevenue / Math.max(orders.filter(o => o.payment_status === "paid").length, 1)) : 0)}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Conversion Rate</span><span className="font-bold">{orders.length > 0 ? Math.round((orders.filter(o => o.payment_status === "paid").length / orders.length) * 100) : 0}%</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Active Products</span><span className="font-bold">{activeProducts.length}</span></div>
                  <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Total Stock</span><span className="font-bold">{products.reduce((s, p) => s + p.stock_quantity, 0)} units</span></div>
                </CardContent>
              </Card>
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
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Add stock" onBlur={async (e) => {
                      const qty = parseInt(e.target.value);
                      if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id); fetchAll(); toast({ title: "Stock updated" }); }
                    }} />
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
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Add" onBlur={async (e) => {
                      const qty = parseInt(e.target.value);
                      if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: p.stock_quantity + qty }).eq("id", p.id); fetchAll(); toast({ title: "Stock updated" }); }
                    }} />
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
                      <Badge className={`text-xs border-none ${p.stock_quantity === 0 ? "bg-red-100 text-red-800" : p.stock_quantity <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                        {p.stock_quantity} units
                      </Badge>
                      <Input type="number" className="w-16 h-7 text-xs" defaultValue={p.stock_quantity} onBlur={async (e) => {
                        const qty = parseInt(e.target.value);
                        if (!isNaN(qty) && qty !== p.stock_quantity) {
                          await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id);
                          fetchAll();
                          toast({ title: "Stock updated" });
                        }
                      }} />
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
              <Button size="sm" onClick={() => { setEditCategory(null); setCategoryForm({ name: "", slug: "", description: "", image_url: "" }); setShowCategoryDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Category
              </Button>
            </div>
            {categories.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">
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
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Shop Invoices ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground font-sans py-8">No invoices generated yet</p>
            ) : invoices.map((inv: any) => (
              <Card key={inv.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_name} • {new Date(inv.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{formatPrice(inv.total_amount)}</p>
                    <Badge className="text-xs">{inv.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ADMINS TAB */}
          <TabsContent value="admins" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Shop Admins ({admins.length})</h2>
            {admins.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-sans font-semibold">{a.full_name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!confirm("Remove shop admin role?")) return;
                    await supabase.from("user_roles").delete().eq("user_id", a.user_id).eq("role", "shop_admin");
                    toast({ title: "Admin removed" });
                    fetchAll();
                  }}>Remove</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-3">
            <Card><CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-semibold">Shop Status</h3>
                  <p className="text-xs text-muted-foreground">Enable or disable the shop globally</p>
                </div>
                <Switch checked={shopEnabled} onCheckedChange={toggleShop} />
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog with Image Upload */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
            <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
            
            {/* Image Upload */}
            <div>
              <Label className="flex items-center gap-1 mb-2"><Image className="w-4 h-4" />Product Images</Label>
              {editProduct?.images?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {editProduct.images.map((img: string, i: number) => (
                    <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => deleteProductImage(editProduct.id, img)} className="absolute inset-0 bg-destructive/70 text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Input type="file" multiple accept="image/*" onChange={e => setProductImages(Array.from(e.target.files || []))} />
              {productImages.length > 0 && <p className="text-xs text-muted-foreground mt-1">{productImages.length} new image(s) selected</p>}
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
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={productForm.is_pod} onCheckedChange={v => setProductForm(f => ({ ...f, is_pod: v }))} />
                <Label>Print-on-Demand</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={productForm.is_active} onCheckedChange={v => setProductForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
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
    </div>
  );
};

export default ShopAdmin;
