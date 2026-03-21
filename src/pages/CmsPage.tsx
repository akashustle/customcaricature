import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const CmsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      setPage(data);
      setLoading(false);
    };
    if (slug) fetchPage();

    const ch = supabase.channel(`cms-page-${slug}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cms_pages" }, (payload) => {
        if ((payload.new as any).slug === slug) setPage(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Page not found</p></div>;

  // Split content into paragraphs for rendering
  const paragraphs = page.content.split("\n").filter((p: string) => p.trim());

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title={page.title} description={page.content.substring(0, 155)} canonical={`/page/${page.slug}`} />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">{page.title}</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl space-y-3">
        {paragraphs.map((para: string, i: number) => {
          const isHeading = /^\d+\./.test(para.trim());
          return isHeading ? (
            <motion.h2 key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="font-display text-lg font-bold text-foreground pt-2">{para}</motion.h2>
          ) : (
            <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="text-sm text-foreground/80 font-sans">{para}</motion.p>
          );
        })}
      </motion.div>
    </div>
  );
};

export default CmsPage;
