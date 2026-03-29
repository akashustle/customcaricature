import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

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

const CATEGORY_COLORS: Record<string, string> = {
  tutorial: "bg-blue-500",
  case_study: "bg-emerald-500",
  news: "bg-red-500",
  tips: "bg-amber-500",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const readTime = (excerpt: string) => Math.max(3, Math.ceil(excerpt.length / 200)) + " Min Read";

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead
        title="Caricature Blog | Tips, Tutorials & Event Stories"
        description="Read the Creative Caricature Club™ blog for caricature tips, tutorials, event case studies & behind-the-scenes stories."
        canonical="/blog"
      />

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" width={32} height={32} />
            <span className="font-display text-base font-bold hidden sm:inline">Creative Caricature Club™</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="rounded-full text-xs">
            ← Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-2">Our Blog</h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto">
            Tutorials, case studies & stories from our artists
          </p>
        </motion.div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl" />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="rounded-full text-xs h-9"
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="animate-pulse rounded-2xl bg-muted h-[300px] md:h-[420px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-44 bg-muted rounded-xl" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No articles found</p>
          </div>
        ) : (
          <>
            {/* ===== HERO POST (Full-width like reference) ===== */}
            {hero && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <Link to={`/blog/${hero.slug}`}>
                  <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
                    {/* Cover image */}
                    <div className="relative h-[280px] sm:h-[360px] md:h-[460px]">
                      {hero.cover_image ? (
                        <img
                          src={hero.cover_image}
                          alt={hero.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="eager"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    </div>

                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                      <Badge className={`${CATEGORY_COLORS[hero.category] || "bg-primary"} text-white border-0 text-xs font-bold mb-3`}>
                        {CATEGORY_LABELS[hero.category] || hero.category}
                      </Badge>
                      <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-black leading-tight mb-3 line-clamp-3 drop-shadow-lg">
                        {hero.title}
                      </h2>
                      <div className="flex items-center gap-4 text-white/80 text-xs md:text-sm">
                        <span className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                            {hero.author_name.charAt(0)}
                          </div>
                          {hero.author_name}
                        </span>
                        <span>•</span>
                        <span>{formatDate(hero.published_at || hero.created_at)}</span>
                        <span>•</span>
                        <span>{readTime(hero.excerpt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* ===== GRID POSTS ===== */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {rest.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link to={`/blog/${post.slug}`} className="block group">
                      <div className="rounded-xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                        {/* Image */}
                        <div className="relative h-44 md:h-48 overflow-hidden">
                          {post.cover_image ? (
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                              <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                          <Badge
                            className={`absolute top-3 left-3 ${CATEGORY_COLORS[post.category] || "bg-primary"} text-white border-0 text-[10px] font-bold`}
                          >
                            {CATEGORY_LABELS[post.category] || post.category}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-5 flex flex-col flex-1">
                          <h3 className="font-display text-base md:text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                            <span className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                                {post.author_name.charAt(0)}
                              </div>
                              {post.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(post.published_at || post.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Creative Caricature Club™. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Blog;
