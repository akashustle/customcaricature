const BASE_URL = "https://portal.creativecaricatureclub.com";
const LOGO_URL = `${BASE_URL}/logo.png?v=2`;

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Creative Caricature Club™",
  url: BASE_URL,
  logo: LOGO_URL,
  description: "Book professional caricature artists for weddings, corporate events, birthdays and parties. Order custom caricatures from photos online.",
  founder: { "@type": "Person", name: "Ritesh Mahendra Gupta" },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-8369594271",
    contactType: "customer service",
    email: "creativecaricatureclub@gmail.com",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [
    "https://www.instagram.com/creativecaricatureclub",
    "https://www.facebook.com/creativecaricatureclub",
    "https://www.youtube.com/creativecaricatureclub",
    "https://share.google/sDpIC3P2ZMJJPLYj1",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mumbai",
    addressRegion: "Maharashtra",
    addressCountry: "IN",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Creative Caricature Club™",
  image: LOGO_URL,
  url: BASE_URL,
  description: "India's premium caricature studio. Custom hand-crafted caricatures for gifts, events and celebrations. Live caricature artists for weddings, corporate events and parties.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mumbai",
    addressRegion: "Maharashtra",
    addressCountry: "IN",
  },
  priceRange: "₹₹",
  sameAs: [
    "https://www.instagram.com/creativecaricatureclub",
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Custom Caricature Art",
  provider: { "@type": "Organization", name: "Creative Caricature Club™" },
  description: "Professional hand-crafted caricatures in cute, romantic, fun, royal, and minimal styles. Order custom caricatures from photos online.",
  areaServed: [
    { "@type": "Country", name: "India" },
    { "@type": "City", name: "Mumbai" },
  ],
  serviceType: "Custom Caricature Drawing",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  },
};

const eventServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Live Event Caricature Artists",
  provider: { "@type": "Organization", name: "Creative Caricature Club™" },
  description: "Book professional caricature artists for weddings, corporate events, birthdays, and parties. Live on-the-spot caricature entertainment.",
  areaServed: { "@type": "Country", name: "India" },
  serviceType: "Live Event Caricature Entertainment",
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Custom Caricature from Photo",
  brand: { "@type": "Brand", name: "Creative Caricature Club™" },
  description: "Hand-crafted caricature artwork created from your photos. Available in cute, romantic, fun, royal, and minimal styles.",
  image: `${BASE_URL}/logo.png`,
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    url: `${BASE_URL}/order`,
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How long does it take to receive my caricature?",
      acceptedAnswer: { "@type": "Answer", text: "Due to high demand, delivery timeline is 25-30 days from order confirmation." },
    },
    {
      "@type": "Question",
      name: "What styles of caricatures do you offer?",
      acceptedAnswer: { "@type": "Answer", text: "We offer Cute, Romantic, Fun, Royal, Minimal, and Artist's Choice styles." },
    },
    {
      "@type": "Question",
      name: "Can I order caricatures for groups?",
      acceptedAnswer: { "@type": "Answer", text: "Yes! We offer single, couple, and group caricatures with multiple faces." },
    },
    {
      "@type": "Question",
      name: "Do you provide live caricature artists for events?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, we provide professional caricature artists for weddings, corporate events, birthdays and more across India and internationally." },
    },
    {
      "@type": "Question",
      name: "How can I book a caricature artist for my wedding?",
      acceptedAnswer: { "@type": "Answer", text: "You can book a wedding caricature artist through our website. Register, select your event date and location, and complete the booking with advance payment." },
    },
    {
      "@type": "Question",
      name: "What is your refund policy?",
      acceptedAnswer: { "@type": "Answer", text: "Creative Caricature Club™ maintains a strict No Refund Policy. All payments once made are final for event bookings, custom orders, workshops, and merchandise." },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Order Custom Caricature", item: `${BASE_URL}/order` },
    { "@type": "ListItem", position: 3, name: "Book Event Artist", item: `${BASE_URL}/book-event` },
    { "@type": "ListItem", position: 4, name: "Track Order", item: `${BASE_URL}/track-order` },
    { "@type": "ListItem", position: 5, name: "Shop", item: `${BASE_URL}/shop` },
    { "@type": "ListItem", position: 6, name: "Blog", item: `${BASE_URL}/blog` },
    { "@type": "ListItem", position: 7, name: "About Us", item: `${BASE_URL}/about` },
  ],
};

const JsonLd = () => (
  <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventServiceSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
  </>
);

export default JsonLd;
