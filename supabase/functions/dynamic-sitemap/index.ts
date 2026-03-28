import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BASE_URL = "https://portal.creativecaricatureclub.com";

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/order", changefreq: "weekly", priority: "0.9" },
  { path: "/book-event", changefreq: "weekly", priority: "0.9" },
  { path: "/shop", changefreq: "weekly", priority: "0.8" },
  { path: "/enquiry", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/gallery/caricature", changefreq: "monthly", priority: "0.7" },
  { path: "/gallery/event", changefreq: "monthly", priority: "0.7" },
  { path: "/track-order", changefreq: "monthly", priority: "0.6" },
  { path: "/support", changefreq: "monthly", priority: "0.5" },
  { path: "/workshop", changefreq: "monthly", priority: "0.7" },
  { path: "/faqs", changefreq: "monthly", priority: "0.7" },
  { path: "/explore", changefreq: "weekly", priority: "0.6" },
  { path: "/register", changefreq: "monthly", priority: "0.4" },
  { path: "/login", changefreq: "monthly", priority: "0.3" },
  { path: "/ai-caricature", changefreq: "monthly", priority: "0.6" },
  { path: "/caricature-budgeting", changefreq: "monthly", priority: "0.6" },
  { path: "/live-chat", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
  { path: "/shipping", changefreq: "yearly", priority: "0.3" },
  { path: "/cancellation", changefreq: "yearly", priority: "0.3" },
  { path: "/event-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/intellectual-property", changefreq: "yearly", priority: "0.3" },
  { path: "/workshop-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch published blog posts
    const { data: blogs } = await sb
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    // Fetch active CMS pages
    const { data: cmsPages } = await sb
      .from("cms_pages")
      .select("slug, updated_at")
      .eq("is_active", true);

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Blog posts
    if (blogs) {
      for (const blog of blogs) {
        const lastmod = (blog.updated_at || blog.published_at || now).split("T")[0];
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/blog/${blog.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // CMS pages
    if (cmsPages) {
      for (const page of cmsPages) {
        const lastmod = (page.updated_at || now).split("T")[0];
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/page/${page.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Programmatic SEO landing pages
    const { data: seoPages } = await sb
      .from("seo_landing_pages")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (seoPages) {
      for (const page of seoPages) {
        const lastmod = (page.updated_at || now).split("T")[0];
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/${page.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});
