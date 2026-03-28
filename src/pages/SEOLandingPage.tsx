import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, Calendar, Phone, Star, Users, CheckCircle, ArrowRight, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

type LandingPage = {
  id: string;
  slug: string;
  city: string | null;
  service: string;
  page_title: string;
  meta_description: string;
  h1_title: string;
  intro_text: string;
  body_content: string;
  keywords: string[];
};

const BASE_URL = "https://portal.creativecaricatureclub.com";

// Slugs that are static files or known non-SEO routes — skip DB lookup
const SKIP_SLUGS = new Set([
  "sitemap.xml", "robots.txt", "manifest.json", "sw-push.js",
  "pushpilot-sw.js", "OneSignalSDKWorker.js", "favicon.ico", "logo.png",
  "placeholder.svg",
]);

const SEOLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPages, setRelatedPages] = useState<LandingPage[]>([]);

  useEffect(() => {
    // If slug looks like a file (has extension) or is a known static asset, skip
    if (!slug || SKIP_SLUGS.has(slug) || /\.\w{2,5}$/.test(slug)) {
      setLoading(false);
      return;
    }

    const fetchPage = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("seo_landing_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (data) {
        setPage(data as any);
        const { data: related } = await supabase
          .from("seo_landing_pages" as any)
          .select("slug, h1_title, city, service")
          .eq("is_active", true)
          .neq("slug", slug)
          .limit(6);
        if (related) setRelatedPages(related as any[]);
      }
      setLoading(false);
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    // For file-like slugs, try to load the actual static file
    if (slug && /\.\w{2,5}$/.test(slug)) {
      window.location.replace(`/${slug}`);
      return null;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const serviceSchemaLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1_title,
    provider: { "@type": "Organization", name: "Creative Caricature Club", url: BASE_URL },
    description: page.meta_description,
    areaServed: page.city ? { "@type": "City", name: page.city } : { "@type": "Country", name: "India" },
    serviceType: "Caricature Art Entertainment",
    offers: { "@type": "Offer", priceCurrency: "INR", availability: "https://schema.org/InStock" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: page.h1_title, item: `${BASE_URL}/${page.slug}` },
    ],
  };

  const bodyParagraphs = page.body_content.split("\n").filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead
        title={page.page_title.split("|")[0]?.trim()}
        description={page.meta_description}
        canonical={`/${page.slug}`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchemaLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src="/logo.png" alt="Creative Caricature Club" className="w-8 h-8 rounded-lg" loading="lazy" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-sm font-bold truncate">{page.city || "India"}</h2>
            <p className="text-xs text-muted-foreground">Caricature Services</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 via-accent/5 to-background py-12 px-4"
      >
        <div className="container mx-auto max-w-4xl">
          <nav className="text-xs text-muted-foreground mb-4" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span className="mx-1">/</span>
            <span className="text-foreground">{page.h1_title}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4 leading-tight">
            {page.h1_title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6 font-body">
            {page.intro_text}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/book-event")} className="font-body">
              <Calendar className="w-4 h-4 mr-2" />
              Book for Event
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/order")} className="font-body">
              Order Custom Caricature
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/enquiry")} className="font-body">
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Enquiry
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Trust Signals */}
      <section className="py-8 px-4 border-b border-border">
        <div className="container mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "5000+ Happy Clients", color: "text-primary" },
            { icon: Star, label: "4.9★ Average Rating", color: "text-yellow-500" },
            { icon: MapPin, label: page.city ? `Serving ${page.city}` : "Pan India", color: "text-green-600" },
            { icon: CheckCircle, label: "Professional Artists", color: "text-blue-600" },
          ].map((item, i) => (
            <Card key={i} className="text-center border-none shadow-none bg-transparent">
              <CardContent className="p-3">
                <item.icon className={`w-6 h-6 mx-auto mb-1 ${item.color}`} />
                <p className="text-xs font-body font-medium">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Body Content */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-3xl prose prose-sm md:prose-base dark:prose-invert">
          {bodyParagraphs.map((para, i) => {
            if (para.startsWith("•")) {
              return <li key={i} className="text-muted-foreground font-body ml-4">{para.replace("• ", "")}</li>;
            }
            return <p key={i} className="text-muted-foreground font-body mb-4">{para}</p>;
          })}
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-10 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-display font-bold mb-6 text-center">Our Services{page.city ? ` in ${page.city}` : ""}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Live Event Caricatures", desc: "Professional artists at your venue for weddings, corporate events & parties", link: "/book-event" },
              { title: "Custom Caricatures", desc: "Hand-crafted caricatures from your photos in cute, romantic, fun & royal styles", link: "/order" },
              { title: "Workshop & Training", desc: "Learn caricature art from professional artists in interactive workshops", link: "/workshop" },
            ].map((svc, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(svc.link)}>
                <CardContent className="p-5">
                  <h3 className="font-display font-semibold mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-3">{svc.desc}</p>
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    Learn More <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-display font-bold mb-6">Frequently Asked Questions</h2>
          {[
            { q: `How to book a caricature artist${page.city ? ` in ${page.city}` : ""}?`, a: `Simply visit our booking page, select your event date and location${page.city ? ` in ${page.city}` : ""}, choose the number of artists, and complete the advance payment. We'll confirm your booking within 24 hours.` },
            { q: "What is the price for live caricature at events?", a: "Pricing depends on the event duration, location, and number of artists needed. Visit our booking page for instant pricing or send us an enquiry for a custom quote." },
            { q: "How many caricatures can an artist draw per hour?", a: "A professional caricature artist can typically draw 8-15 caricatures per hour, depending on the style and complexity." },
            { q: `Do you provide caricature artists for destination weddings${page.city ? ` near ${page.city}` : ""}?`, a: "Yes! We provide artists for destination weddings across India and internationally. Travel and accommodation can be arranged as part of the booking." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-border py-4">
              <h3 className="font-body font-semibold text-sm mb-1">{faq.q}</h3>
              <p className="text-sm text-muted-foreground font-body">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 bg-primary/5">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-display font-bold mb-3">Ready to Book{page.city ? ` in ${page.city}` : ""}?</h2>
          <p className="text-muted-foreground font-body mb-6">Get in touch today and make your event unforgettable with live caricature entertainment!</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/book-event")}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Now
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://wa.me/918369594271" target="_blank" rel="noopener noreferrer">
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp Us
              </a>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/enquiry")}>
              Send Enquiry
            </Button>
          </div>
        </div>
      </section>

      {/* Related Pages (Internal Linking) */}
      {relatedPages.length > 0 && (
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-xl font-display font-bold mb-4">Explore More Locations</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {relatedPages.map((rp) => (
                <Link
                  key={rp.slug}
                  to={`/${rp.slug}`}
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <p className="text-sm font-body font-medium">{rp.h1_title}</p>
                  <p className="text-xs text-muted-foreground">{rp.city || "India"}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Internal Links Footer */}
      <section className="py-8 px-4 border-t border-border bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-sm font-display font-bold mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { label: "Order Caricature", to: "/order" },
              { label: "Book Event Artist", to: "/book-event" },
              { label: "Gallery", to: "/gallery/caricature" },
              { label: "Blog", to: "/blog" },
              { label: "About Us", to: "/about" },
              { label: "FAQs", to: "/faqs" },
              { label: "Support", to: "/support" },
              { label: "Track Order", to: "/track-order" },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="text-primary hover:underline font-body">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SEOLandingPage;
