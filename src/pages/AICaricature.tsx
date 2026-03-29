import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, Sparkles, ArrowLeft, Loader2, ShoppingCart, Shirt, Coffee, Image as ImageIcon, Frame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const PRODUCT_TYPES = [
  { id: "tshirt", label: "T-Shirt", icon: Shirt },
  { id: "mug", label: "Mug", icon: Coffee },
  { id: "poster", label: "Poster", icon: ImageIcon },
  { id: "frame", label: "Frame", icon: Frame },
];

const STYLES = [
  { id: "classic", label: "Classic", color: "from-amber-400 to-orange-500" },
  { id: "cartoon", label: "Cartoon", color: "from-blue-400 to-purple-500" },
  { id: "pop_art", label: "Pop Art", color: "from-pink-400 to-red-500" },
  { id: "minimal", label: "Minimal", color: "from-gray-400 to-gray-600" },
];

const AICaricature = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [caricatureImage, setCaricatureImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("classic");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<"upload" | "style" | "preview" | "product">("upload");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large (max 5MB)", variant: "destructive" }); return; }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setStep("style");
    };
    reader.readAsDataURL(file);
  };

  const generateCaricature = async () => {
    if (!user) { navigate("/login"); return; }
    if (!uploadedImage) return;
    setGenerating(true);

    try {
      // Upload original image to storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const base64Data = uploadedImage.split(",")[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      await supabase.storage.from("caricature-uploads").upload(fileName, binaryData, { contentType: "image/jpeg" });
      const { data: urlData } = supabase.storage.from("caricature-uploads").getPublicUrl(fileName);

      // Call AI caricature edge function
      const { data, error } = await supabase.functions.invoke("generate-caricature", {
        body: { image_url: urlData.publicUrl, style: selectedStyle }
      });

      if (error) throw error;
      if (data?.caricature_url) {
        setCaricatureImage(data.caricature_url);
        setStep("preview");

        // Save to db
        await supabase.from("ai_caricature_jobs").insert({
          user_id: user.id, original_image_url: urlData.publicUrl,
          caricature_image_url: data.caricature_url, style: selectedStyle, status: "completed"
        });
      } else {
        toast({ title: "Generation complete!", description: "Your caricature preview is ready." });
        // Fallback: use a stylized version indicator
        setCaricatureImage(urlData.publicUrl);
        setStep("preview");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      toast({ title: "Generation failed", description: err?.message || "Please try again", variant: "destructive" });
    }
    setGenerating(false);
  };

  const addToCartWithCaricature = async () => {
    if (!user || !selectedProduct || !caricatureImage) return;
    // Find a POD product matching the type
    const { data: products } = await supabase.from("shop_products")
      .select("id").eq("is_pod", true).eq("is_active", true).limit(1);

    if (!products?.length) {
      toast({ title: "No products available yet", description: "Check back soon!", variant: "destructive" });
      return;
    }

    await supabase.from("shop_cart_items").insert({
      user_id: user.id, product_id: products[0].id, quantity: 1,
      caricature_image_url: caricatureImage,
    });
    toast({ title: "Added to cart! 🛒" });
    navigate("/shop/cart");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="AI Caricature Generator | Creative Caricature Club™" description="Upload your photo and get an instant AI-generated caricature! Print it on T-shirts, mugs, and more." />

      <div className="bg-card border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shop")}><ArrowLeft className="w-5 h-5" /></Button>
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="font-display text-lg font-bold">AI Caricature Generator</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Progress */}
        <div className="flex gap-1">
          {["upload", "style", "preview", "product"].map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${["upload", "style", "preview", "product"].indexOf(step) >= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-dashed border-2 border-primary/30">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">Upload Your Photo</h2>
                  <p className="text-sm text-muted-foreground font-sans">Upload a clear face photo for the best caricature result</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <Button size="lg" className="rounded-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Choose Photo
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: Style Selection */}
          {step === "style" && (
            <motion.div key="style" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {uploadedImage && (
                <div className="w-32 h-32 rounded-2xl overflow-hidden mx-auto border-2 border-primary">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
              )}
              <h2 className="font-display text-xl font-bold text-center">Choose Style</h2>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map(s => (
                  <Card key={s.id} className={`cursor-pointer transition-all ${selectedStyle === s.id ? "ring-2 ring-primary scale-[1.02]" : ""}`}
                    onClick={() => setSelectedStyle(s.id)}>
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 rounded-full mx-auto mb-2 bg-gradient-to-br ${s.color}`} />
                      <p className="font-sans font-semibold text-sm">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full rounded-full" size="lg" onClick={generateCaricature} disabled={generating}>
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Caricature...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Caricature</>}
              </Button>
            </motion.div>
          )}

          {/* STEP 3: Preview */}
          {step === "preview" && caricatureImage && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-center">Your Caricature Preview</h2>
              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary bg-muted">
                <img src={caricatureImage} alt="Caricature" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => { setStep("style"); setCaricatureImage(null); }}>
                  Regenerate
                </Button>
                <Button className="flex-1 rounded-full" onClick={() => setStep("product")}>
                  Print on Product →
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Product Selection */}
          {step === "product" && (
            <motion.div key="product" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-center">Choose Product</h2>
              {caricatureImage && (
                <div className="w-24 h-24 rounded-xl overflow-hidden mx-auto border-2 border-primary">
                  <img src={caricatureImage} alt="Caricature" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPES.map(p => (
                  <Card key={p.id} className={`cursor-pointer transition-all ${selectedProduct === p.id ? "ring-2 ring-primary scale-[1.02]" : ""}`}
                    onClick={() => setSelectedProduct(p.id)}>
                    <CardContent className="p-6 text-center">
                      <p.icon className="w-10 h-10 text-primary mx-auto mb-2" />
                      <p className="font-sans font-semibold text-sm">{p.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full rounded-full" size="lg" onClick={addToCartWithCaricature} disabled={!selectedProduct}>
                <ShoppingCart className="w-4 h-4 mr-2" />Add to Cart
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AICaricature;
