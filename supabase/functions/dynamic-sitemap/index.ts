import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BASE_URL = "https://portal.creativecaricatureclub.com";
const LOGO_URL = `${BASE_URL}/logo.png`;

// ──────────────────────────────────────────────
// STATIC PAGES — comprehensive list of every public route
// ──────────────────────────────────────────────
const STATIC_PAGES = [
  // Core high-priority pages
  { path: "/", changefreq: "daily", priority: "1.0", title: "Home" },
  { path: "/order", changefreq: "weekly", priority: "0.9", title: "Order Custom Caricature" },
  { path: "/book-event", changefreq: "weekly", priority: "0.9", title: "Book Event Artist" },
  { path: "/shop", changefreq: "daily", priority: "0.85", title: "Shop" },
  { path: "/enquiry", changefreq: "weekly", priority: "0.8", title: "Enquiry" },

  // Content & discovery pages
  { path: "/blog", changefreq: "daily", priority: "0.85", title: "Blog" },
  { path: "/about", changefreq: "monthly", priority: "0.7", title: "About Us" },
  { path: "/explore", changefreq: "weekly", priority: "0.65", title: "Explore" },
  { path: "/faqs", changefreq: "monthly", priority: "0.7", title: "FAQs" },

  // Gallery pages
  { path: "/gallery/caricature", changefreq: "weekly", priority: "0.75", title: "Caricature Gallery" },
  { path: "/gallery/event", changefreq: "weekly", priority: "0.75", title: "Event Gallery" },

  // Service & tool pages
  { path: "/ai-caricature", changefreq: "monthly", priority: "0.65", title: "AI Caricature Generator" },
  { path: "/caricature-budgeting", changefreq: "monthly", priority: "0.65", title: "Event Budgeting Calculator" },
  { path: "/workshop", changefreq: "weekly", priority: "0.7", title: "Caricature Workshop" },
  { path: "/live-chat", changefreq: "monthly", priority: "0.5", title: "Live Chat Support" },

  // User-facing utility pages
  { path: "/track-order", changefreq: "monthly", priority: "0.6", title: "Track Your Order" },
  { path: "/support", changefreq: "monthly", priority: "0.55", title: "Customer Support" },
  { path: "/notifications", changefreq: "monthly", priority: "0.3", title: "Notifications" },

  // Auth pages (lower priority but still indexable for branded queries)
  { path: "/register", changefreq: "monthly", priority: "0.4", title: "Register" },
  { path: "/login", changefreq: "monthly", priority: "0.3", title: "Login" },

  // Legal / policy pages
  { path: "/terms", changefreq: "yearly", priority: "0.2", title: "Terms & Conditions" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2", title: "Privacy Policy" },
  { path: "/refund", changefreq: "yearly", priority: "0.2", title: "Refund Policy" },
  { path: "/shipping", changefreq: "yearly", priority: "0.2", title: "Shipping Policy" },
  { path: "/cancellation", changefreq: "yearly", priority: "0.2", title: "Cancellation Policy" },
  { path: "/event-policy", changefreq: "yearly", priority: "0.2", title: "Event Policy" },
  { path: "/intellectual-property", changefreq: "yearly", priority: "0.2", title: "Intellectual Property" },
  { path: "/workshop-policy", changefreq: "yearly", priority: "0.2", title: "Workshop Policy" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.2", title: "Disclaimer" },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toW3CDate(dateStr: string | null, fallback: string): string {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "index" | "pages" | "blog" | "cms" | "seo" | "images" | "shop" | null

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString().split("T")[0];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SITEMAP INDEX (default when no ?type= or ?type=index)
    // Returns a sitemap index pointing to sub-sitemaps
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!type || type === "index") {
      const sitemaps = [
        { loc: "pages", lastmod: now },
        { loc: "blog", lastmod: now },
        { loc: "cms", lastmod: now },
        { loc: "seo", lastmod: now },
        { loc: "images", lastmod: now },
        { loc: "shop", lastmod: now },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      for (const s of sitemaps) {
        xml += `  <sitemap>\n`;
        xml += `    <loc>${supabaseUrl}/functions/v1/dynamic-sitemap?type=${s.loc}</loc>\n`;
        xml += `    <lastmod>${s.lastmod}</lastmod>\n`;
        xml += `  </sitemap>\n`;
      }
      xml += `</sitemapindex>`;

      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=7200" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STATIC PAGES SITEMAP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "pages") {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      for (const page of STATIC_PAGES) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        // Add OG image for key pages
        if (parseFloat(page.priority) >= 0.6) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${LOGO_URL}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(page.title)} - Creative Caricature Club</image:title>\n`;
          xml += `      <image:caption>${escapeXml(page.title)} page of Creative Caricature Club India</image:caption>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=7200" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BLOG SITEMAP — with image extensions & news-like freshness
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "blog") {
      const { data: blogs } = await sb
        .from("blog_posts")
        .select("slug, title, excerpt, cover_image, updated_at, published_at, tags, category")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(1000);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
      xml += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

      if (blogs) {
        for (const blog of blogs) {
          const lastmod = toW3CDate(blog.updated_at || blog.published_at, now);
          const pubDate = blog.published_at ? new Date(blog.published_at).toISOString() : now;

          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/blog/${escapeXml(blog.slug)}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;

          // Image extension for cover image
          if (blog.cover_image) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(blog.cover_image)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(blog.title)}</image:title>\n`;
            if (blog.excerpt) {
              xml += `      <image:caption>${escapeXml(blog.excerpt.substring(0, 200))}</image:caption>\n`;
            }
            xml += `    </image:image>\n`;
          }

          // News extension for recently published articles (within 2 days)
          const daysSincePublished = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePublished <= 2) {
            xml += `    <news:news>\n`;
            xml += `      <news:publication>\n`;
            xml += `        <news:name>Creative Caricature Club</news:name>\n`;
            xml += `        <news:language>en</news:language>\n`;
            xml += `      </news:publication>\n`;
            xml += `      <news:publication_date>${pubDate}</news:publication_date>\n`;
            xml += `      <news:title>${escapeXml(blog.title)}</news:title>\n`;
            if (blog.tags && blog.tags.length > 0) {
              xml += `      <news:keywords>${escapeXml(blog.tags.join(", "))}</news:keywords>\n`;
            }
            xml += `    </news:news>\n`;
          }

          xml += `  </url>\n`;
        }
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800, s-maxage=3600" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CMS PAGES SITEMAP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "cms") {
      const { data: cmsPages } = await sb
        .from("cms_pages")
        .select("slug, title, updated_at")
        .eq("is_active", true)
        .limit(500);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      if (cmsPages) {
        for (const page of cmsPages) {
          const lastmod = toW3CDate(page.updated_at, now);
          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/page/${escapeXml(page.slug)}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.5</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=7200" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEO LANDING PAGES SITEMAP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "seo") {
      const { data: seoPages } = await sb
        .from("seo_landing_pages")
        .select("slug, updated_at, meta_title, og_image")
        .eq("is_active", true)
        .limit(1000);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      if (seoPages) {
        for (const page of seoPages) {
          const lastmod = toW3CDate(page.updated_at, now);
          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/${escapeXml(page.slug)}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          if (page.og_image) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(page.og_image)}</image:loc>\n`;
            if (page.meta_title) {
              xml += `      <image:title>${escapeXml(page.meta_title)}</image:title>\n`;
            }
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=7200" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMAGE SITEMAP — gallery images for Google Images
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "images") {
      const { data: galleryImages } = await sb
        .from("caricature_gallery")
        .select("image_url, caption")
        .order("sort_order", { ascending: true })
        .limit(500);

      const { data: beforeAfter } = await sb
        .from("before_after_gallery")
        .select("before_image_url, after_image_url, caption")
        .eq("is_active", true)
        .limit(200);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      // Gallery page with all caricature images
      if (galleryImages && galleryImages.length > 0) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/gallery/caricature</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.75</priority>\n`;
        for (const img of galleryImages) {
          if (img.image_url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(img.image_url)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(img.caption || "Custom Caricature Art by Creative Caricature Club")}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(img.caption || "Hand-crafted caricature artwork, Mumbai India")}</image:caption>\n`;
            xml += `      <image:geo_location>Mumbai, India</image:geo_location>\n`;
            xml += `    </image:image>\n`;
          }
        }
        xml += `  </url>\n`;
      }

      // Before-after comparisons on homepage
      if (beforeAfter && beforeAfter.length > 0) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        for (const ba of beforeAfter) {
          if (ba.before_image_url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(ba.before_image_url)}</image:loc>\n`;
            xml += `      <image:title>Before - ${escapeXml(ba.caption || "Photo to Caricature Transformation")}</image:title>\n`;
            xml += `    </image:image>\n`;
          }
          if (ba.after_image_url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(ba.after_image_url)}</image:loc>\n`;
            xml += `      <image:title>After - ${escapeXml(ba.caption || "Custom Caricature Result")}</image:title>\n`;
            xml += `    </image:image>\n`;
          }
        }
        xml += `  </url>\n`;
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=7200, s-maxage=14400" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SHOP PRODUCTS SITEMAP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (type === "shop") {
      const { data: products } = await sb
        .from("shop_products")
        .select("id, name, updated_at, image_urls, description")
        .eq("is_active", true)
        .limit(500);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      // Shop listing page
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/shop</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      xml += `  </url>\n`;

      if (products) {
        for (const product of products) {
          const lastmod = toW3CDate(product.updated_at, now);
          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/shop/${escapeXml(product.id)}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          // Product images
          if (product.image_urls && Array.isArray(product.image_urls)) {
            for (const imgUrl of product.image_urls.slice(0, 5)) {
              if (imgUrl) {
                xml += `    <image:image>\n`;
                xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
                xml += `      <image:title>${escapeXml(product.name || "Shop Product")}</image:title>\n`;
                xml += `    </image:image>\n`;
              }
            }
          }
          xml += `  </url>\n`;
        }
      }

      xml += `</urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=7200" },
      });
    }

    // Fallback — unknown type
    return new Response("Unknown sitemap type", { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});
