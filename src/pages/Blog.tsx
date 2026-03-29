import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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

const Blog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchPosts();
    const ch = supabase.channel("blog-realtime")
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

  const filtered = posts.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(posts.map((p) => p.category))];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead
        title="Blog - Tutorials & Case Studies"
        description="Read our latest tutorials, case studies, and tips about custom caricature art. Learn about styles, techniques, and behind-the-scenes stories."
        canonical="/blog"
      />

      <header>
        <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
              <span className="font-display text-lg font-bold hidden sm:inline">Creative Caricature Club™</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="rounded-full font-sans">
              ← Back to Home
            </Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">Our Blog</h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Tutorials, case studies & behind-the-scenes stories from our artists
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-sans" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="rounded-full font-sans text-xs"
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-sans text-lg">No articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link to={`/blog/${post.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all group cursor-pointer h-full">
                    {post.cover_image && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs font-sans">
                          {CATEGORY_LABELS[post.category] || post.category}
                        </Badge>
                        {post.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-sans">{tag}</Badge>
                        ))}
                      </div>
                      <h2 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground font-sans line-clamp-3 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-sans">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author_name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground font-sans">
            © {new Date().getFullYear()} Creative Caricature Club™. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Blog;
