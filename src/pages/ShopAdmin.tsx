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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Plus, Edit2, Trash2, Package, ShoppingCart, Tag, Settings, Users, BarChart3, Loader2, Store, Image, Copy, Upload, TrendingUp, AlertTriangle, Eye, Search, DollarSign, RefreshCw, FileText, Download, Calendar, Star, Percent, Clock, ShoppingBag, Truck, MapPin, Layers, Zap, Target, Award, Activity, PieChart as PieIcon, BarChart2, Gift, MessageSquare, ArrowUpDown, CheckCircle, XCircle, Hash } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";
import AdminSmartSearch from "@/components/admin/AdminSmartSearch";
import { exportToExcel } from "@/lib/export-excel";

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
  const [productForm, setProductForm] = useState({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true, brand: "", weight: 0, dimensions: "", is_featured: false, is_bestseller: false });
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, is_active: true });
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [showOrderDetail, setShowOrderDetail] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");

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
    const [p, c, o, s, inv, navSetting, vars, coup, revs] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_settings").select("*").eq("id", "shop_enabled").maybeSingle(),
      supabase.from("invoices").select("*").eq("invoice_type", "shop_order").order("created_at", { ascending: false }),
      supabase.from("admin_site_settings").select("*").eq("id", "shop_nav_visible").maybeSingle(),
      supabase.from("shop_product_variations").select("*").order("created_at"),
      supabase.from("shop_coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_product_reviews").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (p.data) setProducts(p.data);
    if (c.data) setCategories(c.data);
    if (o.data) setOrders(o.data);
    if (s.data) setShopEnabled((s.data.value as any)?.enabled || false);
    if (inv.data) setInvoices(inv.data as any);
    if (navSetting.data) setShopNavVisible((navSetting.data.value as any)?.enabled || false);
    if (vars.data) setVariations(vars.data);
    if (coup.data) setCoupons(coup.data);
    if (revs.data) setProductReviews(revs.data);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_orders" }, (payload) => {
        setOrders(prev => [payload.new as any, ...prev]);
        toast({ title: "🛒 New Order!", description: `Order received` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_orders" }, (payload) => {
        setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...(payload.new as any) } : o));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_products" }, () => fetchAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_products" }, (payload) => {
        setProducts(prev => prev.map(p => p.id === (payload.new as any).id ? { ...p, ...(payload.new as any) } : p));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_settings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_product_variations" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_coupons" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_product_reviews" }, (payload) => {
        setProductReviews(prev => [payload.new as any, ...prev]);
        toast({ title: "⭐ New Review!" });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_product_reviews" }, (payload) => {
        setProductReviews(prev => prev.map(r => r.id === (payload.new as any).id ? { ...r, ...(payload.new as any) } : r));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authorized]);

  const toggleShop = async () => {
    await supabase.from("shop_settings").update({ value: { enabled: !shopEnabled } as any }).eq("id", "shop_enabled");
    setShopEnabled(!shopEnabled); toast({ title: !shopEnabled ? "Shop Enabled" : "Shop Disabled" });
  };

  const toggleShopNav = async () => {
    const newVal = !shopNavVisible;
    await supabase.from("admin_site_settings").upsert({ id: "shop_nav_visible", value: { enabled: newVal } as any });
    setShopNavVisible(newVal); toast({ title: newVal ? "Shop tab visible in nav" : "Shop tab hidden from nav" });
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
      brand: productForm.brand || null, weight: productForm.weight || 0, dimensions: productForm.dimensions || null,
      is_featured: productForm.is_featured, is_bestseller: productForm.is_bestseller,
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
    resetProductForm(); setUploadingImages(false); fetchAll();
  };

  const resetProductForm = () => setProductForm({ name: "", slug: "", description: "", price: 0, discount_price: 0, sku: "", stock_quantity: 0, category_id: "", is_pod: false, seo_title: "", seo_description: "", tags: "", is_active: true, brand: "", weight: 0, dimensions: "", is_featured: false, is_bestseller: false });

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

  // Bulk actions
  const bulkAction = async (action: string) => {
    if (selectedProducts.length === 0) { toast({ title: "Select products first", variant: "destructive" }); return; }
    if (action === "delete" && !confirm(`Delete ${selectedProducts.length} products?`)) return;
    for (const id of selectedProducts) {
      if (action === "delete") await supabase.from("shop_products").delete().eq("id", id);
      else if (action === "activate") await supabase.from("shop_products").update({ is_active: true }).eq("id", id);
      else if (action === "deactivate") await supabase.from("shop_products").update({ is_active: false }).eq("id", id);
      else if (action === "feature") await supabase.from("shop_products").update({ is_featured: true }).eq("id", id);
      else if (action === "unfeature") await supabase.from("shop_products").update({ is_featured: false }).eq("id", id);
      else if (action === "bestseller") await supabase.from("shop_products").update({ is_bestseller: true }).eq("id", id);
    }
    setSelectedProducts([]); toast({ title: `${action} applied to ${selectedProducts.length} products` }); fetchAll();
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

  const deleteCategory = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("shop_categories").delete().eq("id", id); fetchAll(); };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const updates: any = { status };
    if (status === "shipped") updates.shipped_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("shop_orders").update(updates).eq("id", orderId);
    toast({ title: `Order → ${status}` }); fetchAll();
  };

  const saveOrderDetails = async () => {
    if (!showOrderDetail) return;
    await supabase.from("shop_orders").update({ tracking_number: trackingNumber || null, admin_notes: adminNotes || null }).eq("id", showOrderDetail.id);
    toast({ title: "Order details saved" }); fetchAll();
  };

  const openOrderDetail = async (order: any) => {
    setShowOrderDetail(order);
    setTrackingNumber(order.tracking_number || "");
    setAdminNotes(order.admin_notes || "");
    const { data } = await supabase.from("shop_order_items").select("*").eq("order_id", order.id);
    setOrderItems(data || []);
  };

  const processRefund = async (orderId: string, amount: number) => {
    if (!confirm(`Process refund of ${formatPrice(amount)}?`)) return;
    await supabase.from("shop_orders").update({ refund_status: "refunded", refund_amount: amount }).eq("id", orderId);
    toast({ title: "Refund processed" }); fetchAll();
  };

  const openEditProduct = (p: any) => {
    setEditProduct(p);
    setProductForm({ name: p.name, slug: p.slug, description: p.description, price: p.price, discount_price: p.discount_price || 0, sku: p.sku || "", stock_quantity: p.stock_quantity, category_id: p.category_id || "", is_pod: p.is_pod, seo_title: p.seo_title || "", seo_description: p.seo_description || "", tags: (p.tags || []).join(", "), is_active: p.is_active, brand: p.brand || "", weight: p.weight || 0, dimensions: p.dimensions || "", is_featured: p.is_featured || false, is_bestseller: p.is_bestseller || false });
    setProductImages([]); setShowProductDialog(true);
  };

  // Invoice management
  const openEditInvoice = (inv: any) => { setEditInvoice(inv); setInvoiceForm({ notes: inv.notes || "", status: inv.status }); setShowInvoiceDialog(true); };
  const saveInvoice = async () => { if (!editInvoice) return; await supabase.from("invoices").update({ notes: invoiceForm.notes || null, status: invoiceForm.status }).eq("id", editInvoice.id); toast({ title: "Invoice updated" }); setShowInvoiceDialog(false); fetchAll(); };
  const deleteInvoice = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("invoices").delete().eq("id", id); fetchAll(); };

  // Variations
  const openVariations = (productId: string) => { setVariationProductId(productId); setVariationForm({ variation_type: "size", variation_value: "", price_adjustment: 0, stock_quantity: 0 }); setShowVariationDialog(true); };
  const saveVariation = async () => {
    if (!variationProductId || !variationForm.variation_value) return;
    await supabase.from("shop_product_variations").insert({ product_id: variationProductId, variation_type: variationForm.variation_type, variation_value: variationForm.variation_value, price_adjustment: variationForm.price_adjustment, stock_quantity: variationForm.stock_quantity });
    toast({ title: "Variation added" }); setVariationForm({ variation_type: "size", variation_value: "", price_adjustment: 0, stock_quantity: 0 }); fetchAll();
  };
  const deleteVariation = async (id: string) => { await supabase.from("shop_product_variations").delete().eq("id", id); fetchAll(); };

  // Coupons
  const saveCoupon = async () => {
    if (!couponForm.code) return;
    const payload: any = { code: couponForm.code.toUpperCase(), discount_type: couponForm.discount_type, discount_value: couponForm.discount_value, min_order_amount: couponForm.min_order_amount, max_discount_amount: couponForm.max_discount_amount || null, usage_limit: couponForm.usage_limit || null, is_active: couponForm.is_active };
    if (editCoupon) {
      await supabase.from("shop_coupons").update(payload).eq("id", editCoupon.id);
    } else {
      await supabase.from("shop_coupons").insert(payload);
    }
    setShowCouponDialog(false); setEditCoupon(null); setCouponForm({ code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, is_active: true }); fetchAll();
  };
  const deleteCoupon = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("shop_coupons").delete().eq("id", id); fetchAll(); };

  // Review moderation
  const toggleReviewApproval = async (id: string, approved: boolean) => {
    await supabase.from("shop_product_reviews").update({ is_approved: approved }).eq("id", id);
    toast({ title: approved ? "Review approved" : "Review hidden" }); fetchAll();
  };
  const deleteReview = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("shop_product_reviews").delete().eq("id", id); fetchAll(); };

  // Export
  const exportProducts = () => {
    exportToExcel(products.map(p => ({ Name: p.name, SKU: p.sku, Price: p.price, DiscountPrice: p.discount_price, Stock: p.stock_quantity, Category: p.shop_categories?.name, Active: p.is_active, Featured: p.is_featured, POD: p.is_pod, Brand: p.brand })), "Products", "shop-products");
  };
  const exportOrders = () => {
    exportToExcel(orders.map(o => ({ OrderNumber: o.order_number, CustomerName: o.shipping_name, Mobile: o.shipping_mobile, Amount: o.total_amount, Status: o.status, Payment: o.payment_status, City: o.shipping_city, State: o.shipping_state, TrackingNumber: o.tracking_number, Date: new Date(o.created_at).toLocaleDateString() })), "Orders", "shop-orders");
  };

  if (checking || authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Computed analytics
  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const processingOrders = orders.filter(o => o.status === "processing").length;
  const shippedOrders = orders.filter(o => o.status === "shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0);
  const outOfStock = products.filter(p => p.stock_quantity === 0);
  const activeProducts = products.filter(p => p.is_active);
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const totalStock = products.reduce((s, p) => s + p.stock_quantity, 0);
  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const conversionRate = orders.length > 0 ? Math.round((paidOrders.length / orders.length) * 100) : 0;
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const todayRevenue = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString() && o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const refundedOrders = orders.filter(o => o.refund_status === "refunded");
  const totalRefunds = refundedOrders.reduce((s: number, o: any) => s + (o.refund_amount || 0), 0);
  const featuredCount = products.filter(p => p.is_featured).length;
  const bestsellerCount = products.filter(p => p.is_bestseller).length;

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (orderSearch && !o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) && !o.shipping_name?.toLowerCase().includes(orderSearch.toLowerCase())) return false;
    return true;
  });

  const filteredProducts = products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()));

  // Chart data
  const monthlyData: Record<string, number> = {};
  paidOrders.forEach(o => { const m = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); monthlyData[m] = (monthlyData[m] || 0) + o.total_amount; });
  const revenueChartData = Object.entries(monthlyData).map(([name, revenue]) => ({ name, revenue }));

  const catDist: Record<string, number> = {};
  products.forEach(p => { const cat = p.shop_categories?.name || "Uncategorized"; catDist[cat] = (catDist[cat] || 0) + 1; });
  const categoryDistData = Object.entries(catDist).map(([name, value]) => ({ name, value }));

  const statusDist: Record<string, number> = {};
  orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
  const statusChartData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

  const last30 = new Date(); last30.setDate(last30.getDate() - 30);
  const dailyOrders: Record<string, number> = {};
  orders.filter(o => new Date(o.created_at) >= last30).forEach(o => { const d = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); dailyOrders[d] = (dailyOrders[d] || 0) + 1; });
  const dailyOrdersData = Object.entries(dailyOrders).map(([name, orders]) => ({ name, orders }));

  const hourlyOrders: Record<number, number> = {};
  orders.forEach(o => { const h = new Date(o.created_at).getHours(); hourlyOrders[h] = (hourlyOrders[h] || 0) + 1; });
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: hourlyOrders[i] || 0 }));

  const paymentDist: Record<string, number> = {};
  orders.forEach(o => { paymentDist[o.payment_status || "unknown"] = (paymentDist[o.payment_status || "unknown"] || 0) + 1; });
  const paymentChartData = Object.entries(paymentDist).map(([name, value]) => ({ name, value }));

  const catRevenue: Record<string, number> = {};
  paidOrders.forEach(o => { catRevenue[o.shipping_state || "Unknown"] = (catRevenue[o.shipping_state || "Unknown"] || 0) + o.total_amount; });
  const catRevenueData = Object.entries(catRevenue).slice(0, 8).map(([name, revenue]) => ({ name, revenue }));

  const weeklyRevenue: Record<string, number> = {};
  paidOrders.forEach(o => { const d = new Date(o.created_at); const week = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-IN", { month: "short" })}`; weeklyRevenue[week] = (weeklyRevenue[week] || 0) + o.total_amount; });
  const weeklyRevenueData = Object.entries(weeklyRevenue).map(([name, revenue]) => ({ name, revenue }));

  const cityDist: Record<string, number> = {};
  orders.forEach(o => { if (o.shipping_city) cityDist[o.shipping_city] = (cityDist[o.shipping_city] || 0) + 1; });
  const cityData = Object.entries(cityDist).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  const avgByMonth: Record<string, { total: number; count: number }> = {};
  paidOrders.forEach(o => { const m = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); if (!avgByMonth[m]) avgByMonth[m] = { total: 0, count: 0 }; avgByMonth[m].total += o.total_amount; avgByMonth[m].count++; });
  const avgOrderData = Object.entries(avgByMonth).map(([name, v]) => ({ name, avg: Math.round(v.total / v.count) }));

  const stockPriceData = products.slice(0, 10).map(p => ({ name: p.name.slice(0, 15), stock: p.stock_quantity, price: p.price / 100 }));

  // Coupon usage chart
  const couponUsage = coupons.map(c => ({ name: c.code.slice(0, 10), used: c.used_count, limit: c.usage_limit || 0 }));

  // Revenue by shipping method
  const shipMethodDist: Record<string, number> = {};
  paidOrders.forEach(o => { shipMethodDist[o.shipping_method || "standard"] = (shipMethodDist[o.shipping_method || "standard"] || 0) + 1; });
  const shipMethodData = Object.entries(shipMethodDist).map(([name, value]) => ({ name, value }));

  // Daily revenue
  const dailyRevenue: Record<string, number> = {};
  paidOrders.filter(o => new Date(o.created_at) >= last30).forEach(o => { const d = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); dailyRevenue[d] = (dailyRevenue[d] || 0) + o.total_amount; });
  const dailyRevenueData = Object.entries(dailyRevenue).map(([name, revenue]) => ({ name, revenue }));

  return (
    <div className="min-h-screen bg-background admin-panel-font">
      <SEOHead title="Shop Admin" noindex />
      <div className="admin-header-premium px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(22,78%,52%)] to-[hsl(28,14%,16%)] flex items-center justify-center shadow-sm">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Shop Console</h1>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${shopEnabled ? "bg-[hsl(152,55%,40%)]" : "bg-muted-foreground/30"}`} />
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>{shopEnabled ? "Live" : "Disabled"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Shop</span><Switch checked={shopEnabled} onCheckedChange={toggleShop} /></div>
          <Button variant="ghost" size="sm" onClick={fetchAll} className="h-8 w-8 p-0"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/CFCAdmin936"); }} className="h-8 gap-1.5 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        <div className="max-w-lg mb-2">
          <AdminSmartSearch
            panelType="shop"
            tabs={[
              { id: "products", label: "Products" }, { id: "orders", label: "Orders" },
              { id: "categories", label: "Categories" }, { id: "coupons", label: "Coupons" },
              { id: "reviews", label: "Reviews" }, { id: "invoices", label: "Invoices" },
            ]}
            onNavigate={(tab, highlightId) => {
              const tabsEl = document.querySelector(`[data-radix-collection-item][data-value="${tab}"]`) as HTMLElement;
              if (tabsEl) tabsEl.click();
              if (highlightId) {
                setTimeout(() => {
                  const el = document.querySelector(`[data-search-id="${highlightId}"]`);
                  if (el) { el.classList.add("search-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.classList.remove("search-highlight"), 4000); }
                }, 300);
              }
            }}
          />
        </div>
        {/* Stats Grid - 3D Animated Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Products", value: String(activeProducts.length), icon: Package, color: "hsl(36,45%,52%)", sub: `${outOfStock.length} OOS` },
            { label: "Orders", value: String(orders.length), icon: ShoppingCart, color: "hsl(210,65%,55%)", sub: `${pendingOrders} pending` },
            { label: "Revenue", value: formatPrice(totalRevenue), icon: DollarSign, color: "hsl(152,50%,48%)", sub: "Total" },
            { label: "Today", value: String(todayOrders), icon: Calendar, color: "hsl(340,55%,58%)", sub: formatPrice(todayRevenue) },
            { label: "Avg Order", value: formatPrice(avgOrderValue), icon: Target, color: "hsl(280,50%,55%)", sub: "Per order" },
            { label: "Conversion", value: `${conversionRate}%`, icon: Percent, color: "hsl(38,92%,55%)", sub: "Paid/Total" },
            { label: "Low Stock", value: String(lowStockProducts.length), icon: AlertTriangle, color: "hsl(15,65%,55%)", sub: "≤5 items" },
            { label: "Reviews", value: String(productReviews.length), icon: Star, color: "hsl(180,50%,45%)", sub: `${coupons.length} coupons` },
          ].map((s, i) => (
            <div key={i} className="stat-widget-3d">
              <div className="absolute top-0 right-0 w-14 h-14 rounded-full opacity-10 -translate-y-3 translate-x-3" style={{ background: s.color }} />
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: s.color }}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
                  <p className="text-sm font-bold font-display truncate">{s.value}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 relative z-10">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Real-time status bar */}
        <div className="flex items-center gap-4 text-xs font-sans text-muted-foreground bg-muted/30 rounded-xl px-4 py-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 pulse-live" />Live Sync</span>
          <span>📦 {processingOrders} processing</span>
          <span>🚚 {shippedOrders} shipped</span>
          {lowStockProducts.length > 0 && <span className="text-amber-600 font-medium">⚠️ {lowStockProducts.length} low stock</span>}
          {outOfStock.length > 0 && <span className="text-destructive font-medium">🚫 {outOfStock.length} out of stock</span>}
          {refundedOrders.length > 0 && <span>💰 {refundedOrders.length} refunded ({formatPrice(totalRefunds)})</span>}
        </div>

        <Tabs defaultValue="products">
          <TabsList className="w-full overflow-x-auto flex flex-wrap">
            <TabsTrigger value="products" className="flex-1 text-xs">Products</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 text-xs">Orders</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 text-xs">Analytics</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 text-xs">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 text-xs">Categories</TabsTrigger>
            <TabsTrigger value="coupons" className="flex-1 text-xs">Coupons</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 text-xs">Reviews</TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1 text-xs">Invoices</TabsTrigger>
            <TabsTrigger value="admins" className="flex-1 text-xs">Admins</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <h2 className="font-display text-lg font-bold">Products ({products.length})</h2>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Search..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-7 h-8 w-40 text-xs" />
                </div>
                <Button size="sm" variant="outline" onClick={exportProducts} className="h-8 text-xs"><Download className="w-3 h-3 mr-1" />Export</Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => { setEditProduct(null); resetProductForm(); setProductImages([]); setShowProductDialog(true); }}><Plus className="w-3 h-3 mr-1" />Add</Button>
              </div>
            </div>
            {/* Bulk Actions */}
            {selectedProducts.length > 0 && (
              <div className="flex gap-2 items-center bg-primary/5 rounded-lg p-2">
                <span className="text-xs font-sans font-medium">{selectedProducts.length} selected</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkAction("activate")}>Activate</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkAction("deactivate")}>Deactivate</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkAction("feature")}>Feature</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => bulkAction("bestseller")}>Bestseller</Button>
                <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => bulkAction("delete")}>Delete</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelectedProducts([])}>Clear</Button>
              </div>
            )}
            {filteredProducts.map(p => (
              <Card key={p.id} className={!p.is_active ? "opacity-60" : ""}>
                <CardContent className="p-3">
                  <div className="flex gap-3 items-start">
                    <Checkbox checked={selectedProducts.includes(p.id)} onCheckedChange={c => setSelectedProducts(s => c ? [...s, p.id] : s.filter(x => x !== p.id))} className="mt-1" />
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h3 className="font-sans font-semibold text-sm truncate">{p.name}</h3>
                        {p.is_pod && <Badge variant="secondary" className="text-[9px]">POD</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                        {p.is_featured && <Badge className="text-[9px] bg-primary/20 text-primary border-none">Featured</Badge>}
                        {p.is_bestseller && <Badge className="text-[9px] bg-amber-100 text-amber-800 border-none">Bestseller</Badge>}
                        {p.stock_quantity === 0 && <Badge variant="destructive" className="text-[9px]">OOS</Badge>}
                        {p.stock_quantity > 0 && p.stock_quantity <= 5 && <Badge className="text-[9px] bg-amber-100 text-amber-800 border-none">{p.stock_quantity} left</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans">{p.shop_categories?.name || "–"} • SKU: {p.sku || "–"} • {p.images?.length || 0} imgs • {variations.filter(v => v.product_id === p.id).length} vars • {p.brand || "No brand"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-display font-bold text-primary text-sm">{formatPrice(p.discount_price || p.price)}</span>
                        {p.discount_price && <span className="text-[10px] line-through text-muted-foreground">{formatPrice(p.price)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEditProduct(p)}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openVariations(p.id)}><Layers className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => duplicateProduct(p)}><Copy className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
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
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="pl-10 h-8 text-xs" />
                </div>
                <Button size="sm" variant="outline" onClick={exportOrders} className="h-8 text-xs"><Download className="w-3 h-3 mr-1" />Export</Button>
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
              <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openOrderDetail(o)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-semibold text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.shipping_name} • {o.shipping_city}, {o.shipping_state}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
                      {o.tracking_number && <p className="text-xs text-primary font-sans">🚚 {o.tracking_number}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-display font-bold text-primary">{formatPrice(o.total_amount)}</p>
                      <Badge variant={o.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{o.payment_status}</Badge>
                      <Badge variant="outline" className="text-xs capitalize ml-1">{o.status}</Badge>
                      {o.refund_status === "refunded" && <Badge variant="destructive" className="text-xs ml-1">Refunded {formatPrice(o.refund_amount)}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                      <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className="text-xs capitalize h-6 text-[10px]" onClick={() => updateOrderStatus(o.id, s)}>{s}</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Shop Analytics Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total Revenue", value: formatPrice(totalRevenue) },
                { label: "Avg Order", value: formatPrice(avgOrderValue) },
                { label: "Conversion", value: `${conversionRate}%` },
                { label: "Total Refunds", value: formatPrice(totalRefunds) },
                { label: "Featured", value: `${featuredCount} / ${bestsellerCount}` },
              ].map((m, i) => (
                <Card key={i}><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold font-display text-primary">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">{m.label}</p>
                </CardContent></Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revenueChartData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans flex items-center gap-2"><TrendingUp className="w-4 h-4" />Revenue Trend</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><AreaChart data={revenueChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="hsl(36, 45%, 52%)" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></CardContent></Card>
              )}
              {categoryDistData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans flex items-center gap-2"><PieIcon className="w-4 h-4" />Products by Category</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={categoryDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>{categoryDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
              )}
              {statusChartData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><BarChart2 className="w-4 h-4 inline mr-1" />Order Status</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={statusChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              )}
              {dailyOrdersData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Calendar className="w-4 h-4 inline mr-1" />Daily Orders (30d)</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><LineChart data={dailyOrdersData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="orders" stroke="hsl(152, 50%, 48%)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></CardContent></Card>
              )}
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Clock className="w-4 h-4 inline mr-1" />Peak Hours</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="orders" fill="hsl(340, 55%, 58%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              {paymentChartData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><DollarSign className="w-4 h-4 inline mr-1" />Payment Status</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={paymentChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{paymentChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
              )}
              {catRevenueData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><MapPin className="w-4 h-4 inline mr-1" />Revenue by State</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={catRevenueData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Bar dataKey="revenue" fill="hsl(38, 92%, 55%)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              )}
              {weeklyRevenueData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><TrendingUp className="w-4 h-4 inline mr-1" />Weekly Revenue</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><AreaChart data={weeklyRevenueData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Area type="monotone" dataKey="revenue" stroke="hsl(270, 50%, 55%)" fill="hsl(270, 50%, 55%)" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></CardContent></Card>
              )}
              {cityData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><MapPin className="w-4 h-4 inline mr-1" />Top Cities</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={cityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="hsl(190, 60%, 50%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              )}
              {avgOrderData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Target className="w-4 h-4 inline mr-1" />Avg Order Trend</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><LineChart data={avgOrderData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Line type="monotone" dataKey="avg" stroke="hsl(15, 65%, 55%)" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
              )}
              {stockPriceData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Layers className="w-4 h-4 inline mr-1" />Stock Overview</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={stockPriceData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="stock" fill="hsl(152, 50%, 48%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              )}
              {dailyRevenueData.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><DollarSign className="w-4 h-4 inline mr-1" />Daily Revenue (30d)</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><AreaChart data={dailyRevenueData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => formatPrice(v)} /><Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="hsl(36, 45%, 52%)" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></CardContent></Card>
              )}
              {couponUsage.length > 0 && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Gift className="w-4 h-4 inline mr-1" />Coupon Usage</CardTitle></CardHeader>
                  <CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={couponUsage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="used" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              )}
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-sans"><Activity className="w-4 h-4 inline mr-1" />Quick Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {[
                    ["Products", products.length], ["Active", activeProducts.length], ["Orders", orders.length], ["Paid", paidOrders.length],
                    ["Pending", pendingOrders], ["Processing", processingOrders], ["Shipped", shippedOrders], ["Delivered", deliveredOrders],
                    ["Cancelled", cancelledOrders], ["Refunded", refundedOrders.length], ["Today Revenue", formatPrice(todayRevenue)],
                    ["Stock Units", totalStock], ["Variations", variations.length], ["Invoices", invoices.length], ["Coupons", coupons.length],
                    ["Reviews", productReviews.length], ["Featured", featuredCount], ["Bestsellers", bestsellerCount],
                    ["OOS Products", outOfStock.length], ["Low Stock", lowStockProducts.length],
                  ].map(([l, v], i) => (
                    <div key={i} className="flex justify-between text-xs font-sans"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
                  ))}
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
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Qty" onBlur={async (e) => { const qty = parseInt(e.target.value); if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id); fetchAll(); } }} />
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
                    <Input type="number" className="w-20 h-7 text-xs" placeholder="Add" onBlur={async (e) => { const qty = parseInt(e.target.value); if (qty > 0) { await supabase.from("shop_products").update({ stock_quantity: p.stock_quantity + qty }).eq("id", p.id); fetchAll(); } }} />
                  </div>
                ))}
              </CardContent></Card>
            )}
            <Card><CardContent className="p-4">
              <p className="font-sans font-semibold text-sm mb-3">All Products Stock</p>
              {products.map(p => (
                <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0"><p className="font-sans text-sm truncate">{p.name}</p><p className="text-xs text-muted-foreground">SKU: {p.sku || "–"}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs border-none ${p.stock_quantity === 0 ? "bg-red-100 text-red-800" : p.stock_quantity <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{p.stock_quantity}</Badge>
                    <Input type="number" className="w-16 h-7 text-xs" defaultValue={p.stock_quantity} onBlur={async (e) => { const qty = parseInt(e.target.value); if (!isNaN(qty) && qty !== p.stock_quantity) { await supabase.from("shop_products").update({ stock_quantity: qty }).eq("id", p.id); fetchAll(); } }} />
                  </div>
                </div>
              ))}
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
                  <div><h3 className="font-sans font-semibold">{c.name}</h3><p className="text-xs text-muted-foreground">/{c.slug} • {products.filter(p => p.category_id === c.id).length} products</p></div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditCategory(c); setCategoryForm({ name: c.name, slug: c.slug, description: c.description || "", image_url: c.image_url || "" }); setShowCategoryDialog(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* COUPONS TAB */}
          <TabsContent value="coupons" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Coupons ({coupons.length})</h2>
              <Button size="sm" onClick={() => { setEditCoupon(null); setCouponForm({ code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, is_active: true }); setShowCouponDialog(true); }}><Plus className="w-4 h-4 mr-1" />Add Coupon</Button>
            </div>
            {coupons.map(c => (
              <Card key={c.id}><CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-primary">{c.code}</p>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">{c.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`} • Min: {formatPrice(c.min_order_amount)} • Used: {c.used_count}/{c.usage_limit || "∞"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditCoupon(c); setCouponForm({ code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, min_order_amount: c.min_order_amount, max_discount_amount: c.max_discount_amount || 0, usage_limit: c.usage_limit || 0, is_active: c.is_active }); setShowCouponDialog(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteCoupon(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent></Card>
            ))}
            {coupons.length === 0 && <p className="text-center text-muted-foreground py-8">No coupons yet</p>}
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Product Reviews ({productReviews.length})</h2>
            {productReviews.map(r => {
              const prod = products.find(p => p.id === r.product_id);
              return (
                <Card key={r.id}><CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-sans font-semibold text-sm">{prod?.name || "Unknown Product"}</p>
                      <div className="flex items-center gap-1 mt-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                      {r.title && <p className="font-sans font-medium text-sm mt-1">{r.title}</p>}
                      {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={r.is_approved ? "outline" : "default"} className="h-7 text-xs" onClick={() => toggleReviewApproval(r.id, !r.is_approved)}>
                        {r.is_approved ? <XCircle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}{r.is_approved ? "Hide" : "Approve"}
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => deleteReview(r.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent></Card>
              );
            })}
            {productReviews.length === 0 && <p className="text-center text-muted-foreground py-8">No reviews yet</p>}
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Invoices ({invoices.length})</h2>
            {invoices.map((inv: any) => (
              <Card key={inv.id}><CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_name} • {inv.customer_email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("en-IN")}</p>
                    {inv.notes && <p className="text-xs text-muted-foreground italic mt-1">"{inv.notes}"</p>}
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
              </CardContent></Card>
            ))}
            {invoices.length === 0 && <p className="text-center text-muted-foreground py-8">No invoices</p>}
          </TabsContent>

          {/* ADMINS TAB */}
          <TabsContent value="admins" className="space-y-3">
            <h2 className="font-display text-lg font-bold">Shop Admins ({admins.length})</h2>
            {admins.map(a => (
              <Card key={a.id}><CardContent className="p-4 flex justify-between items-center">
                <div><p className="font-sans font-semibold">{a.full_name}</p><p className="text-xs text-muted-foreground">{a.email}</p></div>
                <Button size="sm" variant="destructive" onClick={async () => { if (!confirm("Remove?")) return; await supabase.from("user_roles").delete().eq("user_id", a.user_id).eq("role", "shop_admin"); fetchAll(); }}>Remove</Button>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-3">
            <Card><CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between"><div><h3 className="font-sans font-semibold">Shop Status</h3><p className="text-xs text-muted-foreground">Enable/disable shop globally</p></div><Switch checked={shopEnabled} onCheckedChange={toggleShop} /></div>
              <div className="flex items-center justify-between border-t border-border pt-4"><div><h3 className="font-sans font-semibold">Show Shop in Nav Bar</h3><p className="text-xs text-muted-foreground">Display Shop tab in website navigation</p></div><Switch checked={shopNavVisible} onCheckedChange={toggleShopNav} /></div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Product Name *</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Slug</Label><Input value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
              <div><Label>Brand</Label><Input value={productForm.brand} onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))} /></div>
            </div>
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
            <div className="grid grid-cols-3 gap-3">
              <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Stock *</Label><Input type="number" value={productForm.stock_quantity} onChange={e => setProductForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
              <div><Label>Weight (g)</Label><Input type="number" value={productForm.weight} onChange={e => setProductForm(f => ({ ...f, weight: +e.target.value }))} /></div>
            </div>
            <div><Label>Dimensions</Label><Input value={productForm.dimensions} onChange={e => setProductForm(f => ({ ...f, dimensions: e.target.value }))} placeholder="e.g. 30x20x5 cm" /></div>
            <div><Label>Category</Label>
              <Select value={productForm.category_id} onValueChange={v => setProductForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={productForm.is_pod} onCheckedChange={v => setProductForm(f => ({ ...f, is_pod: v }))} /><Label>POD</Label></div>
              <div className="flex items-center gap-2"><Switch checked={productForm.is_active} onCheckedChange={v => setProductForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={productForm.is_featured} onCheckedChange={v => setProductForm(f => ({ ...f, is_featured: v }))} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={productForm.is_bestseller} onCheckedChange={v => setProductForm(f => ({ ...f, is_bestseller: v }))} /><Label>Bestseller</Label></div>
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
            <div><Label>Image URL</Label><Input value={categoryForm.image_url} onChange={e => setCategoryForm(f => ({ ...f, image_url: e.target.value }))} /></div>
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
                  {["generated", "sent", "paid", "cancelled", "refunded"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
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
            {variations.filter(v => v.product_id === variationProductId).map(v => (
              <div key={v.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <div><p className="font-sans text-sm font-medium capitalize">{v.variation_type}: {v.variation_value}</p><p className="text-xs text-muted-foreground">+{formatPrice(v.price_adjustment)} • Stock: {v.stock_quantity}</p></div>
                <Button size="icon" variant="ghost" onClick={() => deleteVariation(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <p className="font-sans font-semibold text-sm mb-2">Add Variation</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={variationForm.variation_type} onValueChange={v => setVariationForm(f => ({ ...f, variation_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["size", "color", "material", "style"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Value</Label><Input value={variationForm.variation_value} onChange={e => setVariationForm(f => ({ ...f, variation_value: e.target.value }))} /></div>
                <div><Label>Price +/-</Label><Input type="number" value={variationForm.price_adjustment} onChange={e => setVariationForm(f => ({ ...f, price_adjustment: +e.target.value }))} /></div>
                <div><Label>Stock</Label><Input type="number" value={variationForm.stock_quantity} onChange={e => setVariationForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
              </div>
              <Button onClick={saveVariation} className="w-full mt-2" disabled={!variationForm.variation_value}>Add Variation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code *</Label><Input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={couponForm.discount_type} onValueChange={v => setCouponForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (₹)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={couponForm.discount_value} onChange={e => setCouponForm(f => ({ ...f, discount_value: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Order (₹)</Label><Input type="number" value={couponForm.min_order_amount} onChange={e => setCouponForm(f => ({ ...f, min_order_amount: +e.target.value }))} /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" value={couponForm.max_discount_amount} onChange={e => setCouponForm(f => ({ ...f, max_discount_amount: +e.target.value }))} /></div>
            </div>
            <div><Label>Usage Limit (0 = unlimited)</Label><Input type="number" value={couponForm.usage_limit} onChange={e => setCouponForm(f => ({ ...f, usage_limit: +e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={couponForm.is_active} onCheckedChange={v => setCouponForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
            <Button onClick={saveCoupon} className="w-full" disabled={!couponForm.code}>{editCoupon ? "Update" : "Create"} Coupon</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!showOrderDetail} onOpenChange={() => setShowOrderDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Order Details</DialogTitle></DialogHeader>
          {showOrderDetail && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order</span><span className="font-mono font-bold">{showOrderDetail.order_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">{formatPrice(showOrderDetail.total_amount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge className="capitalize text-xs">{showOrderDetail.status}</Badge></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment</span><Badge variant={showOrderDetail.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{showOrderDetail.payment_status}</Badge></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="text-xs">{new Date(showOrderDetail.created_at).toLocaleString("en-IN")}</span></div>
                {showOrderDetail.coupon_code && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Coupon</span><span className="font-mono">{showOrderDetail.coupon_code} (-{formatPrice(showOrderDetail.discount_amount)})</span></div>}
              </div>
              <div>
                <p className="font-sans font-semibold text-sm mb-1">Shipping</p>
                <p className="text-sm text-muted-foreground">{showOrderDetail.shipping_name} • {showOrderDetail.shipping_mobile}</p>
                <p className="text-xs text-muted-foreground">{showOrderDetail.shipping_address}, {showOrderDetail.shipping_city}, {showOrderDetail.shipping_state} - {showOrderDetail.shipping_pincode}</p>
              </div>
              <div>
                <p className="font-sans font-semibold text-sm mb-1">Items</p>
                {orderItems.map(item => (
                  <div key={item.id} className="flex justify-between py-1 border-b border-border text-sm">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div><Label>Tracking Number</Label><Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" /></div>
              <div><Label>Admin Notes</Label><Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes..." /></div>
              <Button onClick={saveOrderDetails} className="w-full">Save Details</Button>
              {showOrderDetail.payment_status === "paid" && showOrderDetail.refund_status !== "refunded" && (
                <Button variant="destructive" className="w-full" onClick={() => processRefund(showOrderDetail.id, showOrderDetail.total_amount)}>
                  Process Full Refund ({formatPrice(showOrderDetail.total_amount)})
                </Button>
              )}
              {showOrderDetail.refund_status === "refunded" && <Badge variant="destructive" className="w-full justify-center py-2">Refunded: {formatPrice(showOrderDetail.refund_amount)}</Badge>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopAdmin;
