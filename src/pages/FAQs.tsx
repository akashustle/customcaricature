import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
const SiteFooter = lazy(() => import("@/components/SiteFooter"));

type FAQ = { q: string; a: string; category?: string };

const DEFAULT_FAQS: FAQ[] = [
  { q: "What is a caricature?", a: "A caricature is a fun, exaggerated portrait that captures your likeness in a humorous and artistic way.", category: "General" },
  { q: "How long does delivery take?", a: "Custom caricatures are typically delivered within 5-7 working days.", category: "Orders" },
  { q: "How do I book a caricature artist for my event?", a: "Visit our Book Event page, fill in your details including date, location, and event type, and we'll confirm your booking.", category: "Events" },
  { q: "What payment methods do you accept?", a: "We accept UPI, credit/debit cards, net banking, and Razorpay for secure online payments.", category: "Payments" },
  { q: "Can I get a refund?", a: "Please check our Refund Policy page for detailed information about our refund and cancellation policy.", category: "Payments" },
  { q: "Do you ship internationally?", a: "Yes! We deliver caricatures worldwide. Shipping charges vary by location.", category: "Orders" },
  { q: "What styles of caricatures do you offer?", a: "We offer Cute, Romantic, Fun, Royal, Minimal, and Artist's Choice styles.", category: "General" },
  { q: "How do I track my order?", a: "Visit the Track Order page and enter your order ID and registered email/mobile to see real-time status updates.", category: "Orders" },
];

const FAQs = () => {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    supabase.from("admin_site_settings").select("value").eq("id", "faqs_list").single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value) && data.value.length > 0) setFaqs(data.value as FAQ[]);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(faqs.map(f => f.category || "General")))];
  const filtered = filter === "All" ? faqs : faqs.filter(f => (f.category || "General") === filter);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead title="FAQs | Caricature Orders, Events & Pricing Questions" description="Frequently asked questions about Creative Caricature Club™ — custom caricature orders, live event artist bookings, delivery timelines, pricing, refund policy & more. India's trusted caricature studio." canonical="/faqs" />
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">FAQs</h1>
              <p className="text-[10px] text-muted-foreground">Frequently Asked Questions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === cat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-sm text-foreground">{faq.q}</p>
                  <motion.div animate={{ rotate: openIdx === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openIdx === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border/50 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No FAQs in this category</p>
          </div>
        )}
      </div>
      <Suspense fallback={null}><SiteFooter /></Suspense>

    </div>
  );
};


export default FAQs;
