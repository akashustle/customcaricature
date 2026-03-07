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
import { LogOut, Plus, Edit2, Trash2, Package, ShoppingCart, Tag, Settings, Users, BarChart3, Loader2, Store, Image, Copy } from "lucide-react";

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
  const [productForm, setProductForm] = useState({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "" });
  const [admins, setAdmins] = useState<any[]>([]);

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
    const [p, c, o, s] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_settings").select("*").eq("id", "shop_enabled").maybeSingle(),
    ]);
    if (p.data) setProducts(p.data);
    if (c.data) setCategories(c.data);
    if (o.data) setOrders(o.data);
    if (s.data) setShopEnabled((s.data.value as any)?.enabled || false);

    // Fetch shop admins
    const { data: shopAdminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "shop_admin") as any;
    if (shopAdminRoles?.length) {
      const ids = shopAdminRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
      if (profiles) setAdmins(profiles);
    }
  };

  // Realtime
  useEffect(() => {
    if (!authorized) return;
    const ch = supabase.channel("shop-admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_products" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_settings" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authorized]);

  const toggleShop = async () => {
    await supabase.from("shop_settings").update({ value: { enabled: !shopEnabled } as any }).eq("id", "shop_enabled");
    setShopEnabled(!shopEnabled);
    toast({ title: !shopEnabled ? "Shop Enabled" : "Shop Disabled" });
  };

  const saveProduct = async () => {
    const slug = productForm.slug || productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload = {
      name: productForm.name, slug, description: productForm.description, price: productForm.price,
      discount_price: productForm.discount_price || null, sku: productForm.sku || null,
      stock_quantity: productForm.stock_quantity, category_id: productForm.category_id || null,
      is_pod: productForm.is_pod, seo_title: productForm.seo_title || null,
      seo_description: productForm.seo_description || null, tags: productForm.tags ? productForm.tags.split(",").map(t => t.trim()) : [],
    };
    if (editProduct) {
      await supabase.from("shop_products").update(payload).eq("id", editProduct.id);
      toast({ title: "Product updated" });
    } else {
      await supabase.from("shop_products").insert(payload);
      toast({ title: "Product created" });
    }
    setShowProductDialog(false);
    setEditProduct(null);
    setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "" });
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
      await supabase.from("shop_categories").update({ name: categoryForm.name, slug, description: categoryForm.description }).eq("id", editCategory.id);
    } else {
      await supabase.from("shop_categories").insert({ name: categoryForm.name, slug, description: categoryForm.description });
    }
    setShowCategoryDialog(false);
    setEditCategory(null);
    setCategoryForm({ name: "", slug: "", description: "" });
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
      seo_description: p.seo_description || "", tags: (p.tags || []).join(", "),
    });
    setShowProductDialog(true);
  };

  if (checking || authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total_amount, 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

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
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/CFCAdmin936"); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Products", value: products.length, icon: Package },
            { label: "Orders", value: orders.length, icon: ShoppingCart },
            { label: "Revenue", value: formatPrice(totalRevenue), icon: BarChart3 },
            { label: "Pending", value: pendingOrders, icon: Tag },
          ].map((s, i) => (
            <Card key={i}><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><s.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground font-sans">{s.label}</p><p className="text-lg font-bold font-display">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="products">
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="admins" className="flex-1">Admins</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Products ({products.length})</h2>
              <Button size="sm" onClick={() => { setEditProduct(null); setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "" }); setShowProductDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Product
              </Button>
            </div>
            {products.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans font-semibold">{p.name}</h3>
                        {p.is_pod && <Badge variant="secondary" className="text-xs">POD</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-sans mt-1">{p.shop_categories?.name || "Uncategorized"} • SKU: {p.sku || "N/A"} • Stock: {p.stock_quantity}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-display font-bold text-primary">{formatPrice(p.discount_price || p.price)}</span>
                        {p.discount_price && <span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
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
            <h2 className="font-display text-lg font-bold">Orders ({orders.length})</h2>
            {orders.map(o => (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-sans font-semibold text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.shipping_name} • {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{formatPrice(o.total_amount)}</p>
                      <Badge variant={o.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{o.payment_status}</Badge>
                    </div>
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
            {orders.length === 0 && <p className="text-center text-muted-foreground font-sans py-8">No orders yet</p>}
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Categories ({categories.length})</h2>
              <Button size="sm" onClick={() => { setEditCategory(null); setCategoryForm({ name: "", slug: "", description: "" }); setShowCategoryDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Category
              </Button>
            </div>
            {categories.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditCategory(c); setCategoryForm({ name: c.name, slug: c.slug, description: c.description || "" }); setShowCategoryDialog(true); }}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
            <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹)</Label><Input type="number" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: +e.target.value }))} /></div>
              <div><Label>Discount Price</Label><Input type="number" value={productForm.discount_price} onChange={e => setProductForm(f => ({ ...f, discount_price: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Stock</Label><Input type="number" value={productForm.stock_quantity} onChange={e => setProductForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
            </div>
            <div><Label>Category</Label>
              <Select value={productForm.category_id} onValueChange={v => setProductForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={productForm.is_pod} onCheckedChange={v => setProductForm(f => ({ ...f, is_pod: v }))} />
              <Label>Print-on-Demand Product</Label>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={productForm.tags} onChange={e => setProductForm(f => ({ ...f, tags: e.target.value }))} /></div>
            <div><Label>SEO Title</Label><Input value={productForm.seo_title} onChange={e => setProductForm(f => ({ ...f, seo_title: e.target.value }))} /></div>
            <div><Label>SEO Description</Label><Textarea value={productForm.seo_description} onChange={e => setProductForm(f => ({ ...f, seo_description: e.target.value }))} /></div>
            <Button onClick={saveProduct} className="w-full">{editProduct ? "Update Product" : "Create Product"}</Button>
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
            <Button onClick={saveCategory} className="w-full">{editCategory ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopAdmin;
