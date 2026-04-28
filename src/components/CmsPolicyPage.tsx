import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

interface Props {
  slug: string;
  fallbackTitle: string;
  fallbackDescription: string;
  canonical: string;
}

/**
 * Single shared renderer for all CMS-managed legal/policy pages.
 * Pulls editable content from `cms_pages` table by slug. Auto-detects headings (lines starting with a number+dot).
 */
const CmsPolicyPage = ({ slug, fallbackTitle, fallbackDescription, canonical }: Props) => {
  const navigate = useNavigate();
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPage = async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("title, content, is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (mounted) {
        if (data?.is_active) setPage({ title: data.title, content: data.content });
        setLoading(false);
      }
    };
    fetchPage();

    const ch = supabase
      .channel(`cms-policy-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_pages" }, (payload: any) => {
        if (payload.new?.slug === slug && payload.new?.is_active) {
          setPage({ title: payload.new.title, content: payload.new.content });
        }
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [slug]);

  const title = page?.title || fallbackTitle;
  const paragraphs = (page?.content || "").split("\n").map((p) => p.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title={`${title} | Creative Caricature Club™`} description={fallbackDescription} canonical={canonical} />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg"  loading="lazy" decoding="async" />
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
      </div>

      {loading ? (
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-3 text-sm text-foreground/80"
        >
          {paragraphs.map((para, i) => {
            const isHeading = /^\d+\./.test(para) || /^[A-Z][A-Za-z\s&]+$/.test(para.split(":")[0] || "") && para.length < 60;
            return isHeading ? (
              <motion.h2
                key={i}
                {...fadeUp(Math.min(i * 0.02, 0.4))}
                className="font-display text-lg font-bold text-foreground pt-2"
              >
                {para}
              </motion.h2>
            ) : (
              <motion.p
                key={i}
                {...fadeUp(Math.min(i * 0.02, 0.4))}
                dangerouslySetInnerHTML={{ __html: para }}
              />
            );
          })}
        </motion.div>
      )}

      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </div>
  );
};

export default CmsPolicyPage;
