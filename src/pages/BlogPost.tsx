import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Share2, BookOpen, Link2, Printer, ChevronUp, Facebook, Twitter, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import BlogEngagement from "@/components/blog/BlogEngagement";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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

type RelatedPost = {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  author_name: string;
  excerpt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  tutorial: "Tutorial",
  case_study: "Case Study",
  news: "News",
  tips: "Tips & Tricks",
};

const CATEGORY_COLORS: Record<string, string> = {
  tutorial: "bg-blue-500",
  case_study: "bg-emerald-500",
  news: "bg-red-500",
  tips: "bg-amber-500",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const { settings: siteSettings } = useSiteSettings();
  const caricatureOff = siteSettings.custom_caricature_visible?.enabled === false;
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    if (slug) fetchPost();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const el = document.getElementById("article-content");
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.scrollHeight;
        const visible = Math.min(Math.max(-rect.top, 0), total);
        setReadProgress(Math.min((visible / total) * 100, 100));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      // Fetch related
      const { data: related } = await supabase
        .from("blog_posts")
        .select("id, title, slug, cover_image, author_name, excerpt")
        .eq("is_published", true)
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      if (related) setRelatedPosts(related as any);
    }
    setLoading(false);
  };

  const handleShare = useCallback(async (platform?: string) => {
    const url = window.location.href;
    gtagShareClick("blog", post?.slug || "");
    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post?.title || "")}`, "_blank");
    } else if (platform === "copy") {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    } else if (navigator.share) {
      await navigator.share({ title: post?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  }, [post]);

  const handlePrint = useCallback(() => window.print(), []);

  // Extract headings for Table of Contents
  const tableOfContents = useMemo(() => {
    if (!post) return [];
    const headings: { level: number; text: string; id: string }[] = [];
    const lines = post.content.split("\n");
    lines.forEach((line) => {
      const h2 = line.match(/^## (.+)/);
      const h3 = line.match(/^### (.+)/);
      if (h2) headings.push({ level: 2, text: h2[1], id: h2[1].toLowerCase().replace(/[^a-z0-9]+/g, "-") });
      if (h3) headings.push({ level: 3, text: h3[1], id: h3[1].toLowerCase().replace(/[^a-z0-9]+/g, "-") });
    });
    return headings;
  }, [post]);

  // Render content with editorial NYT-style typography (drop-cap on first paragraph)
  const renderContent = useCallback((content: string) => {
    let firstParaRendered = false;
    return content.split("\n\n").map((block, i) => {
      if (block.startsWith("### ")) {
        const text = block.slice(4);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h3 key={i} id={id} className="text-xl md:text-2xl font-bold mt-10 mb-3 text-foreground scroll-mt-20" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{text}</h3>;
      }
      if (block.startsWith("## ")) {
        const text = block.slice(3);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h2 key={i} id={id} className="text-2xl md:text-3xl font-bold mt-12 mb-4 text-foreground scroll-mt-20" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{text}</h2>;
      }
      if (block.startsWith("# ")) {
        const text = block.slice(2);
        return <h2 key={i} className="text-3xl md:text-4xl font-bold mt-12 mb-4 text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{text}</h2>;
      }
      if (block.startsWith("![")) {
        const match = block.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) return (
          <figure key={i} className="my-10">
            <img src={match[2]} alt={match[1]} className="w-full" loading="lazy" />
            {match[1] && <figcaption className="mt-2 text-xs italic text-muted-foreground" style={{ fontFamily: "Georgia, serif" }}>{match[1]}</figcaption>}
          </figure>
        );
      }
      if (block.startsWith("> ")) {
        return (
          <blockquote key={i} className="border-l-2 border-foreground/40 pl-6 py-2 my-10">
            <p className="text-2xl md:text-3xl leading-snug text-foreground italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              "{block.slice(2)}"
            </p>
          </blockquote>
        );
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split("\n").filter(l => l.startsWith("- ") || l.startsWith("* "));
        return <ul key={i} className="list-disc pl-6 space-y-2 my-6 text-foreground/85 leading-relaxed text-[17px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{items.map((item, j) => <li key={j}>{item.slice(2)}</li>)}</ul>;
      }
      // Editorial paragraph — first one gets a drop cap
      const parts = block.split(/(\*\*[^*]+\*\*)/g);
      const isFirst = !firstParaRendered;
      if (isFirst) firstParaRendered = true;
      return (
        <p
          key={i}
          className={`text-foreground/90 leading-[1.75] mb-6 text-[17px] md:text-[19px] ${isFirst ? "first-letter:font-bold first-letter:text-[64px] md:first-letter:text-[78px] first-letter:mr-2 first-letter:float-left first-letter:leading-[0.85] first-letter:mt-1 first-letter:font-serif" : ""}`}
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  }, []);

  const readTime = post ? Math.max(3, Math.ceil(post.content.length / 1000)) + " min read" : "";
  const formattedDate = post
    ? new Date(post.published_at || post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-3xl w-full px-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-[350px] bg-muted rounded-2xl" />
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
        <Button onClick={() => navigate("/blog")} className="rounded-full">← Back to Blog</Button>
      </div>
    );
  }

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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        canonical={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image || undefined}
        keywords={(post.tags && post.tags.length > 0)
          ? post.tags.join(", ")
          : `${post.title}, ${CATEGORY_LABELS[post.category] || post.category}, caricature blog, Creative Caricature Club`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" width={32} height={32}  loading="lazy" decoding="async" />
            <span className="font-display text-base font-bold hidden sm:inline">Creative Caricature Club™</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/blog")} className="rounded-full text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" /> All Articles
          </Button>
        </div>
      </nav>

      {/* ===== NYT-STYLE EDITORIAL HEADER ===== */}
      <header className="border-b border-foreground/10">
        <div className="container mx-auto max-w-3xl px-5 sm:px-6 pt-8 sm:pt-12 pb-6">
          <Badge className={`${CATEGORY_COLORS[post.category] || "bg-primary"} text-white border-0 text-[10px] font-bold tracking-[0.2em] uppercase mb-4 rounded-none px-2 py-0.5`}>
            {CATEGORY_LABELS[post.category] || post.category}
          </Badge>
          <h1
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.08] text-foreground mb-4"
            style={{ fontFamily: "'Playfair Display', 'Times New Roman', Georgia, serif", letterSpacing: "-0.01em" }}
          >
            {post.title}
          </h1>
          {post.excerpt && (
            <p
              className="font-serif text-base sm:text-lg md:text-xl text-foreground/70 leading-relaxed mb-6"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
            >
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-foreground/10 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-sm">
                {post.author_name.charAt(0)}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">By</p>
                <p className="text-sm font-bold text-foreground font-sans">{post.author_name}</p>
              </div>
            </div>
            <div className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
              <p>{formattedDate}</p>
              <p className="mt-0.5">{readTime}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Cover (editorial wide format with caption) */}
      {post.cover_image && (
        <figure className="container mx-auto max-w-4xl px-0 sm:px-6 mt-6 mb-8">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-auto sm:rounded-sm"
            loading="eager"
            fetchPriority="high"
          />
          <figcaption className="px-5 sm:px-0 mt-2 text-[11px] text-muted-foreground italic font-serif" style={{ fontFamily: "Georgia, serif" }}>
            {post.title} — Creative Caricature Club™
          </figcaption>
        </figure>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">

          {/* Share sidebar (desktop) */}
          <aside className="hidden lg:flex flex-col items-center gap-3 sticky top-24 self-start pt-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Share</span>
            <button onClick={() => handleShare("facebook")} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 transition-colors" aria-label="Share on Facebook">
              <Facebook className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => handleShare("twitter")} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 transition-colors" aria-label="Share on X">
              <Twitter className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => handleShare("copy")} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 transition-colors" aria-label="Copy link">
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handlePrint} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 transition-colors" aria-label="Print">
              <Printer className="w-4 h-4 text-muted-foreground" />
            </button>
          </aside>

          {/* Article content */}
          <article className="flex-1 max-w-3xl" id="article-content">
            {/* Drop cap first paragraph effect — handled via CSS */}

            {/* Table of Contents */}
            {tableOfContents.length > 2 && (
              <details className="mb-8 rounded-xl border border-border bg-card p-5" open>
                <summary className="flex items-center gap-2 cursor-pointer font-display text-lg font-bold text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" /> Contents
                </summary>
                <nav className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tableOfContents.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      className={`text-sm hover:text-primary transition-colors flex items-center gap-2 py-1.5 ${
                        h.level === 3 ? "pl-4 text-muted-foreground" : "text-foreground font-medium"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {h.text}
                    </a>
                  ))}
                </nav>
              </details>
            )}

            {/* Content body */}
            <div className="blog-content">
              {renderContent(post.content)}
            </div>

            {/* Mobile share bar */}
            <div className="flex items-center justify-center gap-3 mt-8 lg:hidden border-t border-b border-border py-4">
              <span className="text-xs text-muted-foreground font-semibold">Share:</span>
              <button onClick={() => handleShare("facebook")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </button>
              <button onClick={() => handleShare("twitter")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </button>
              <button onClick={() => handleShare("copy")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center" aria-label="Copy">
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Engagement: like/dislike + Book Caricature CTA + 3D social cards */}
            <BlogEngagement postId={post.id} postTitle={post.title} postSlug={post.slug} />
          </article>

          {/* Right sidebar — Popular Posts (desktop) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 self-start space-y-6">
            {relatedPosts.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" /> Popular Posts
                </h3>
                <div className="space-y-4">
                  {relatedPosts.map(rp => (
                    <Link key={rp.id} to={`/blog/${rp.slug}`} className="flex gap-3 group">
                      {rp.cover_image ? (
                        <img src={rp.cover_image} alt={rp.title} className="w-20 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-20 h-16 rounded-lg bg-muted shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {rp.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{rp.author_name} • {Math.max(3, Math.ceil(rp.excerpt.length / 200))} Min Read</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Related posts (mobile) */}
        {relatedPosts.length > 0 && (
          <div className="lg:hidden mt-10 max-w-3xl mx-auto">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">More Articles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.slice(0, 4).map(rp => (
                <Link key={rp.id} to={`/blog/${rp.slug}`} className="flex gap-3 group rounded-xl border border-border p-3 hover:shadow-md transition-all">
                  {rp.cover_image ? (
                    <img src={rp.cover_image} alt={rp.title} className="w-20 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-20 h-16 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rp.author_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 md:bottom-8 right-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-30"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Creative Caricature Club™.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPost;
