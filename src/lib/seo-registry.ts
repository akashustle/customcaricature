// Centralized SEO metadata registry for every public route.
// Used by <RoutedSEO /> to auto-apply per-page title/description/keywords.
// Routes not listed fall back to the SEOHead defaults.
// Routes flagged `noindex: true` will be excluded from Google indexing.

export interface RouteSEO {
  title: string;
  description: string;
  keywords?: string;
  noindex?: boolean;
  type?: string;
  image?: string;
}

// Match patterns: exact path or prefix with trailing /*
export const SEO_REGISTRY: Record<string, RouteSEO> = {
  "/": {
    title: "India's #1 Caricature Artists for Weddings, Corporate Events & Custom Portraits",
    description:
      "Book live caricature artists for weddings, corporate events, birthdays & parties across India & internationally. Order custom hand-drawn caricatures from photos online. 10+ years, 5000+ happy clients. Mumbai, Delhi, Bangalore, Pune, Goa & more.",
    keywords:
      "caricature artist India, live caricature wedding, corporate event caricature, custom caricature from photo, caricature artist Mumbai, hire caricaturist, caricature gift, wedding entertainment, sangeet caricature, party caricature artist",
  },
  "/order": {
    title: "Order a Custom Hand-Drawn Caricature Online",
    description:
      "Upload your photo and order a custom hand-drawn caricature delivered worldwide. Choose digital, print, framed or merch. Quick turnaround, secure payments, satisfaction guaranteed.",
    keywords:
      "order caricature online, custom caricature from photo, caricature gift India, hand drawn caricature, personalized caricature print, framed caricature",
  },
  "/book-event": {
    title: "Book a Live Caricature Artist for Your Event",
    description:
      "Hire a professional live caricature artist for weddings, corporate events, birthdays, sangeets & parties. Pan-India + international bookings. Transparent pricing, instant quote, secure advance payment.",
    keywords:
      "book caricature artist, live caricature wedding, corporate caricature artist, sangeet caricature, birthday caricature artist, hire caricaturist Mumbai Delhi Bangalore",
    type: "service",
  },
  "/shop": {
    title: "Caricature Merchandise Shop — Mugs, T-Shirts, Frames & Posters",
    description:
      "Shop print-on-demand caricature merchandise — mugs, T-shirts, framed prints, cushions, posters and more. Personalized with your custom caricature. Pan-India delivery.",
    keywords:
      "caricature mug, caricature t-shirt, custom caricature gift, personalized merchandise India, caricature poster, framed caricature print",
    type: "website",
  },
  "/shop/ai-caricature": {
    title: "AI Caricature Generator — Instant Caricature from Your Photo",
    description:
      "Create a stunning AI-generated caricature from your photo in seconds. Preview on mugs, T-shirts, frames and more. Powered by next-gen AI for studio-quality results.",
    keywords: "AI caricature generator, AI caricature from photo, instant caricature, AI portrait, caricature AI India",
  },
  "/shop/cart": { title: "Your Shop Cart", description: "Review items in your caricature merchandise cart and checkout securely.", noindex: true },
  "/shop/order-confirmation": { title: "Order Confirmed", description: "Your order has been placed successfully.", noindex: true },
  "/track-order": {
    title: "Track Your Caricature Order",
    description: "Track the live status of your caricature order — design, approval, print, dispatch and delivery — in real time.",
    keywords: "track caricature order, order status India, caricature delivery tracking",
  },
  "/enquiry": {
    title: "Get an Instant Quote — Caricature Enquiry",
    description: "Submit your event or order enquiry and get an instant WhatsApp quote with transparent pricing within minutes.",
    keywords: "caricature enquiry, instant quote, caricature pricing India, book artist quote",
  },
  "/about": {
    title: "About Creative Caricature Club — India's Premier Caricature Studio",
    description:
      "Founded in 2014, Creative Caricature Club is India's premier caricature studio with 30+ artists, 5000+ events delivered across 50+ cities and 20+ countries.",
    keywords: "about Creative Caricature Club, best caricature studio India, caricature artists team",
  },
  "/blog": {
    title: "Caricature Blog — Tips, Trends & Wedding Entertainment Ideas",
    description:
      "Latest articles on caricature art, wedding entertainment, corporate event ideas, custom gifting and behind-the-scenes from India's #1 caricature studio.",
    keywords: "caricature blog, wedding entertainment ideas, corporate event ideas, caricature tips, gifting blog India",
    type: "blog",
  },
  "/workshop": {
    title: "Caricature Workshop & Online Course — Learn from Pros",
    description:
      "Join our live caricature workshops and online courses. Learn fundamentals, exaggeration, digital tools and earn a certificate. Beginner to advanced batches.",
    keywords: "caricature workshop India, learn caricature online, caricature course, art class Mumbai, online drawing class",
    type: "course",
  },
  "/support": {
    title: "Customer Support — We're Here to Help",
    description:
      "Need help with an order, event booking or workshop? Reach our support team via WhatsApp, email or phone. Fast responses, friendly humans.",
    keywords: "caricature support, customer help India, contact caricature studio",
  },
  "/faqs": {
    title: "Frequently Asked Questions — Caricature Orders & Events",
    description: "Answers to the most common questions about ordering caricatures, booking artists, pricing, delivery and more.",
    keywords: "caricature FAQ, caricature pricing questions, order help, event booking FAQ",
  },
  "/explore": {
    title: "Explore Our Services — Caricatures, Events, Shop & Workshops",
    description: "Discover everything Creative Caricature Club offers — custom orders, live event artists, merchandise shop and workshops.",
    keywords: "caricature services India, explore caricature studio",
  },
  "/ai-caricature": {
    title: "AI Caricature — Instant AI Caricatures from Your Photo",
    description: "Generate AI caricatures instantly from any photo. Preview on merchandise and order in one click.",
    keywords: "AI caricature India, AI portrait generator, instant caricature AI",
  },
  "/caricature-budgeting": {
    title: "Caricature Budget Calculator — Plan Your Event Spend",
    description: "Plan your caricature event budget with our smart calculator. Get instant estimates for live artists, durations and city-wise pricing.",
    keywords: "caricature budget calculator, event budgeting, caricature artist cost India",
  },
  "/lil-flea": {
    title: "Creative Caricature Club at Lil Flea — Live at Mumbai's Iconic Market",
    description: "Catch our live caricature booth at Lil Flea Mumbai. Get your hand-drawn portrait while you shop, eat and explore the city's most loved festival.",
    keywords: "Lil Flea Mumbai, live caricature Lil Flea, BKC market caricature",
  },
  "/lil-flea-gallery": { title: "Lil Flea Caricature Gallery", description: "Memorable caricature portraits made live at Lil Flea Mumbai.", keywords: "Lil Flea gallery, live caricature photos" },
  "/lil-flea/gallery": { title: "Lil Flea Caricature Gallery", description: "Memorable caricature portraits made live at Lil Flea Mumbai.", keywords: "Lil Flea gallery, live caricature photos" },
  "/live-chat": { title: "Live Chat — Talk to Our Team", description: "Chat live with our team for instant help on orders, bookings and pricing.", keywords: "live chat caricature, instant help" },
  "/chat-now": { title: "Chat Now", description: "Open a live chat with our team.", noindex: true },
  "/download": {
    title: "Download the Creative Caricature Club App",
    description: "Install our PWA & Android APK for faster access to orders, events, AI caricatures and exclusive in-app offers.",
    keywords: "caricature app India, Creative Caricature Club APK, install caricature app",
  },
  "/notifications": { title: "Notifications", description: "Your activity notifications.", noindex: true },
  "/login": { title: "Sign In", description: "Sign in to your Creative Caricature Club account.", noindex: true },
  "/register": { title: "Create Account", description: "Create your free Creative Caricature Club account.", noindex: true },
  "/forgot-password": { title: "Reset Password", description: "Reset your account password.", noindex: true },
  "/dashboard": { title: "My Dashboard", description: "Your account dashboard.", noindex: true },
  "/artist-dashboard": { title: "Artist Dashboard", description: "Artist portal.", noindex: true },
  "/artistlogin": { title: "Artist Sign In", description: "Artist account sign-in.", noindex: true },
  "/appeal-ban": { title: "Account Appeal", description: "Submit an account appeal.", noindex: true },
  "/sync-queue": { title: "Sync Queue", description: "Offline sync queue.", noindex: true },
  "/claim-link": { title: "Claim Link", description: "Claim your personalised offer.", noindex: true },
  "/admin-panel": { title: "Admin Panel", description: "Internal admin.", noindex: true },
  "/customcad75": { title: "Admin Sign In", description: "Internal admin.", noindex: true },
  "/CFCAdmin936": { title: "Shop Admin Sign In", description: "Internal shop admin.", noindex: true },
  "/cccworkshop2006": { title: "Workshop Admin Sign In", description: "Internal workshop admin.", noindex: true },
  "/shop-admin": { title: "Shop Admin", description: "Internal shop admin.", noindex: true },
  "/workshop-admin-panel": { title: "Workshop Admin", description: "Internal workshop admin.", noindex: true },
  "/database-entry-reversal": { title: "Database Recovery", description: "Internal database tool.", noindex: true },
  "/workshop/dashboard": { title: "Workshop Dashboard", description: "Student workshop dashboard.", noindex: true },
  // Policy pages
  "/terms": { title: "Terms & Conditions", description: "Read the terms & conditions for using Creative Caricature Club services." },
  "/privacy": { title: "Privacy Policy", description: "How we collect, use and protect your personal data at Creative Caricature Club." },
  "/refund": { title: "Refund Policy", description: "Our refund and cancellation policy for orders and event bookings." },
  "/shipping": { title: "Shipping Policy", description: "Shipping timelines, charges and coverage for caricature orders across India and abroad." },
  "/cancellation": { title: "Cancellation Policy", description: "Order and event cancellation policy and timelines." },
  "/intellectual-property": { title: "Intellectual Property Policy", description: "Our IP, copyright and licensing policy for caricature artwork." },
  "/workshop-policy": { title: "Workshop Policy", description: "Workshop enrollment, attendance, refund and certification policy." },
  "/event-policy": { title: "Event Booking Policy", description: "Live event booking, advance, travel and cancellation policy." },
  "/disclaimer": { title: "Disclaimer", description: "Legal disclaimer for content and services on Creative Caricature Club." },
};

// Prefix matching for dynamic segments (handled in component)
export const PREFIX_REGISTRY: Array<{ prefix: string; build: (slug: string) => RouteSEO }> = [
  {
    prefix: "/blog/",
    build: (slug) => ({
      title: `${humanize(slug)} — Caricature Blog`,
      description: `${humanize(slug)} — read our latest article on caricature art, events and custom gifting from Creative Caricature Club.`,
      keywords: `caricature blog, ${slug.replace(/-/g, " ")}, caricature article India`,
      type: "article",
    }),
  },
  {
    prefix: "/shop/product/",
    build: (slug) => ({
      title: `${humanize(slug)} — Caricature Merchandise`,
      description: `Buy ${humanize(slug).toLowerCase()} — personalized caricature merchandise. Pan-India delivery, secure checkout.`,
      keywords: `${slug.replace(/-/g, " ")}, caricature merchandise, custom gift India`,
      type: "product",
    }),
  },
  {
    prefix: "/page/",
    build: (slug) => ({
      title: humanize(slug),
      description: `${humanize(slug)} — Creative Caricature Club.`,
    }),
  },
  {
    prefix: "/gallery/",
    build: (slug) => ({
      title: `${humanize(slug)} Gallery — Hand-Drawn Caricatures`,
      description: `Browse our ${humanize(slug).toLowerCase()} caricature gallery — real artwork delivered to clients across India and abroad.`,
      keywords: `${slug.replace(/-/g, " ")} gallery, caricature portfolio India`,
    }),
  },
];

function humanize(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function lookupSEO(pathname: string): RouteSEO | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (SEO_REGISTRY[clean]) return SEO_REGISTRY[clean];
  for (const { prefix, build } of PREFIX_REGISTRY) {
    if (clean.startsWith(prefix)) {
      const slug = clean.slice(prefix.length).split("/")[0];
      if (slug) return build(slug);
    }
  }
  // SEO landing pages live at root-level slugs (e.g. /caricature-artist-in-mumbai)
  if (/^\/caricature-artist-in-[a-z-]+$/.test(clean)) {
    const city = clean.replace("/caricature-artist-in-", "").replace(/-/g, " ");
    const Title = city.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `Caricature Artist in ${Title} — Live & Custom Caricatures`,
      description: `Book India's top caricature artists in ${Title} for weddings, corporate events, birthdays & parties. Live & custom hand-drawn caricatures. Instant quote.`,
      keywords: `caricature artist ${city}, live caricature ${city}, wedding caricature ${city}, hire caricaturist ${city}`,
    };
  }
  return null;
}
