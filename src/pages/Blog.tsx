import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Search, TrendingUp, Sparkles, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import SiteFooter from "@/components/SiteFooter";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string | null;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  tutorial: "Tutorial",
  case_study: "Case Study",
  news: "News",
  tips: "Tips & Tricks",
};

// Soft gradient backgrounds per category for the 3D look
const CATEGORY_GRADIENTS: Record<string, string> = {
  tutorial: "from-sky-500/90 to-indigo-600/90",
  case_study: "from-emerald-500/90 to-teal-600/90",
  news: "from-rose-500/90 to-red-600/90",
  tips: "from-amber-500/90 to-orange-600/90",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const readTime = (excerpt: string) => Math.max(3, Math.ceil(excerpt.length / 200)) + " min read";

const BASE_URL = "https://portal.creativecaricatureclub.com";

const Blog = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchPosts();
    const ch = supabase
      .channel("blog-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image, category, tags, author_name, published_at, created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    if (data) setPosts(data as any);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return posts.filter((p) => {
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [posts, search, categoryFilter]);

  const categories = useMemo(() => ["all", ...new Set(posts.map((p) => p.category))], [posts]);
  const [hero, ...rest] = filtered;

  // ── SEO: ItemList JSON-LD so Google indexes & ranks the listing instantly ──
  const itemListJsonLd = useMemo(() => {
    if (posts.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Creative Caricature Club Blog",
      itemListElement: posts.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/blog/${p.slug}`,
        name: p.title,
      })),
    };
  }, [posts]);

  return (
    <div
      className="min-h-screen pb-20 md:pb-0 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 15% 0%, hsl(252 60% 96%) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, hsl(320 70% 96%) 0%, transparent 55%), linear-gradient(180deg, #fafaff 0%, #f3f1fb 100%)",
      }}
    >
      <SEOHead
        title="Caricature Blog — Tips, Tutorials & Event Stories"
        description="Read the Creative Caricature Club™ blog: caricature tips, hand-drawing tutorials, event case studies and behind-the-scenes stories from India's #1 live caricature studio."
        canonical="/blog"
        keywords="caricature blog, caricature tutorials, live caricature tips, wedding caricature stories, caricature artist India, hand drawn caricature guide, custom caricature blog"
      />

      {/* JSON-LD ItemList for SEO ranking */}
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      {/* Floating ambient orbs (desktop only) */}
      <div aria-hidden className="hidden md:block pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />
        <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, #f0abfc, transparent 70%)" }} />
      </div>

      {/* Sticky Nav with glass effect */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_20px_-8px_rgba(80,60,150,0.15)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Creative Caricature Club" className="w-full h-full object-cover" width={36} height={36} />
            </div>
            <span className="font-display text-base font-bold hidden sm:inline text-slate-800">Creative Caricature Club™</span>
          </button>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="rounded-full text-xs bg-white/80">
            ← Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 md:py-14 relative z-10">
        {/* Header — 3D pill badge + clean H1, no subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur shadow-md border border-white/80 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-700">Creative Caricature Blog</span>
          </div>
          <h1
            className="font-display text-4xl md:text-6xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 50%, #c026d3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Our Blog
          </h1>
        </motion.div>

        {/* Search + Filters — floating glass card */}
        <div className="max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_20px_60px_-25px_rgba(80,60,150,0.35)] p-4 md:p-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-2xl bg-white border-slate-200"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full text-xs h-9 transition-all ${
                    categoryFilter === cat
                      ? "shadow-lg scale-105 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0"
                      : "bg-white/80"
                  }`}
                >
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="animate-pulse rounded-3xl bg-white/60 h-[300px] md:h-[460px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-48 bg-white/60 rounded-2xl" />
                  <div className="h-4 bg-white/60 rounded w-2/3" />
                  <div className="h-3 bg-white/60 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-block p-6 rounded-3xl bg-white/80 backdrop-blur shadow-xl">
              <p className="text-slate-500 text-lg">No articles found</p>
            </div>
          </div>
        ) : (
          <>
            {/* ===== HERO POST — 3D tilted card ===== */}
            {hero && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-12 md:mb-16 max-w-6xl mx-auto"
              >
                <Link to={`/blog/${hero.slug}`} aria-label={hero.title}>
                  <article
                    className="relative rounded-[28px] md:rounded-[36px] overflow-hidden group cursor-pointer transition-all duration-500 hover:-translate-y-1"
                    style={{
                      boxShadow:
                        "0 30px 80px -25px rgba(80,60,150,0.5), 0 12px 30px -12px rgba(80,60,150,0.25), inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    <div className="relative h-[320px] sm:h-[400px] md:h-[500px]">
                      {hero.cover_image ? (
                        <img
                          src={hero.cover_image}
                          alt={hero.title}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000"
                          loading="eager"
                          fetchPriority="high"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${
                            CATEGORY_GRADIENTS[hero.category] || "from-violet-500/90 to-fuchsia-600/90"
                          }`}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      {/* Glass shine */}
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase text-white mb-4 bg-gradient-to-r ${
                          CATEGORY_GRADIENTS[hero.category] || "from-violet-500 to-fuchsia-600"
                        } shadow-lg`}
                      >
                        {CATEGORY_LABELS[hero.category] || hero.category}
                      </div>
                      <h2 className="text-white text-2xl sm:text-3xl md:text-5xl font-black leading-[1.1] mb-4 line-clamp-3 drop-shadow-2xl">
                        {hero.title}
                      </h2>
                      <p className="hidden sm:block text-white/85 text-sm md:text-base max-w-2xl mb-4 line-clamp-2 drop-shadow">
                        {hero.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-xs md:text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/40">
                            {hero.author_name.charAt(0)}
                          </div>
                          <span className="font-medium">{hero.author_name}</span>
                        </span>
                        <span className="opacity-50">•</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(hero.published_at || hero.created_at)}
                        </span>
                        <span className="opacity-50">•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {readTime(hero.excerpt)}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            )}

            {/* ===== GRID — 3D floating cards ===== */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
                {rest.map((post, i) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5 }}
                  >
                    <Link to={`/blog/${post.slug}`} className="block group h-full" aria-label={post.title}>
                      <div
                        className="rounded-2xl md:rounded-3xl overflow-hidden bg-white/85 backdrop-blur-xl border border-white h-full flex flex-col transition-all duration-500 group-hover:-translate-y-2"
                        style={{
                          boxShadow:
                            "0 18px 45px -20px rgba(80,60,150,0.35), 0 6px 18px -8px rgba(80,60,150,0.2), inset 0 1px 0 rgba(255,255,255,0.8)",
                        }}
                      >
                        <div className="relative h-48 md:h-52 overflow-hidden">
                          {post.cover_image ? (
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${
                                CATEGORY_GRADIENTS[post.category] || "from-slate-400 to-slate-600"
                              } flex items-center justify-center`}
                            >
                              <TrendingUp className="w-10 h-10 text-white/60" />
                            </div>
                          )}
                          <div
                            className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-gradient-to-r ${
                              CATEGORY_GRADIENTS[post.category] || "from-violet-500 to-fuchsia-600"
                            } shadow-md`}
                          >
                            {CATEGORY_LABELS[post.category] || post.category}
                          </div>
                        </div>

                        <div className="p-5 md:p-6 flex flex-col flex-1">
                          <h3 className="font-display text-lg md:text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-sm text-slate-500 line-clamp-3 mb-5 flex-1 leading-relaxed">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                            <span className="flex items-center gap-1.5 font-medium">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                {post.author_name.charAt(0)}
                              </div>
                              {post.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {readTime(post.excerpt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Full site footer */}
      <SiteFooter />
    </div>
  );
};

export default Blog;
