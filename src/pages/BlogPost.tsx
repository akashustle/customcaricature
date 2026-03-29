import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import JsonLd from "@/components/JsonLd";
import { toast } from "@/hooks/use-toast";
import { gtagBlogView, gtagShareClick } from "@/lib/gtag";

type BlogPostType = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string | null;
  created_at: string;
  meta_title: string | null;
  meta_description: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  tutorial: "Tutorial",
  case_study: "Case Study",
  news: "News",
  tips: "Tips & Tricks",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (data) {
      setPost(data as any);
      gtagBlogView(slug || "");
    }
    setLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    gtagShareClick("blog", post?.slug || "");
    if (navigator.share) {
      await navigator.share({ title: post?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  // Render markdown-like content (simple: paragraphs, headings, bold, images)
  const renderContent = (content: string) => {
    return content.split("\n\n").map((block, i) => {
      if (block.startsWith("### ")) return <h3 key={i} className="font-display text-xl font-semibold mt-8 mb-3">{block.slice(4)}</h3>;
      if (block.startsWith("## ")) return <h2 key={i} className="font-display text-2xl font-bold mt-10 mb-4">{block.slice(3)}</h2>;
      if (block.startsWith("# ")) return <h2 key={i} className="font-display text-3xl font-bold mt-10 mb-4">{block.slice(2)}</h2>;
      if (block.startsWith("![")) {
        const match = block.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) return <img key={i} src={match[2]} alt={match[1]} className="rounded-xl my-6 w-full max-w-2xl mx-auto" loading="lazy" />;
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split("\n").filter(l => l.startsWith("- ") || l.startsWith("* "));
        return <ul key={i} className="list-disc pl-6 space-y-1 my-4 font-sans text-foreground/90">{items.map((item, j) => <li key={j}>{item.slice(2)}</li>)}</ul>;
      }
      return <p key={i} className="font-sans text-foreground/85 leading-relaxed mb-4">{block}</p>;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-2xl w-full px-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-2xl font-bold">Article Not Found</h1>
        <Button onClick={() => navigate("/blog")} className="rounded-full font-sans">← Back to Blog</Button>
      </div>
    );
  }

  // JSON-LD for article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image || undefined,
    author: { "@type": "Person", name: post.author_name },
    publisher: { "@type": "Organization", name: "Creative Caricature Club™", logo: { "@type": "ImageObject", url: "https://portal.creativecaricatureclub.com/logo.png" } },
    datePublished: post.published_at || post.created_at,
    dateModified: post.published_at || post.created_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://portal.creativecaricatureclub.com/blog/${post.slug}` },
    keywords: post.tags?.join(", ") || "",
    articleSection: post.category,
    inLanguage: "en-IN",
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        canonical={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image || undefined}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <header>
        <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
              <span className="font-display text-lg font-bold hidden sm:inline">Creative Caricature Club™</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/blog")} className="rounded-full font-sans">
              <ArrowLeft className="w-4 h-4 mr-1" /> All Articles
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <article className="container mx-auto px-4 py-10 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Meta */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="secondary" className="font-sans">{CATEGORY_LABELS[post.category] || post.category}</Badge>
              {post.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="font-sans text-xs">{tag}</Badge>
              ))}
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans mb-8">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> {post.author_name}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.published_at || post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <button onClick={handleShare} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>

            {/* Cover */}
            {post.cover_image && (
              <div className="rounded-2xl overflow-hidden mb-10">
                <img src={post.cover_image} alt={post.title} className="w-full h-auto object-cover" />
              </div>
            )}

            {/* Content */}
            <div className="prose-like">{renderContent(post.content)}</div>

            {/* CTA */}
            <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
              <h3 className="font-display text-xl font-semibold mb-2">Ready to Order Your Caricature?</h3>
              <p className="text-muted-foreground font-sans mb-4">Turn your photos into art — delivered to your doorstep.</p>
              <Button onClick={() => navigate("/order")} className="rounded-full font-sans">Order Now →</Button>
            </div>
          </motion.div>
        </article>
      </main>

      <footer className="border-t border-border bg-card/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground font-sans">© {new Date().getFullYear()} Creative Caricature Club™.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPost;
