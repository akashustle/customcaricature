const BASE_URL = "https://customcaricature.lovable.app";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Creative Caricature Club",
  image: `${BASE_URL}/logo.png`,
  url: BASE_URL,
  description: "Custom hand-crafted caricatures delivered to your doorstep. Single, couple, and group caricatures in multiple artistic styles.",
  address: {
    "@type": "PostalAddress",
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
  provider: { "@type": "Organization", name: "Creative Caricature Club" },
  description: "Professional hand-crafted caricatures in cute, romantic, fun, royal, and minimal styles.",
  areaServed: { "@type": "Country", name: "India" },
  serviceType: "Custom Caricature Drawing",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
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
      acceptedAnswer: { "@type": "Answer", text: "Yes, we provide professional caricature artists for weddings, corporate events, birthdays and more across India." },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Order Caricature", item: `${BASE_URL}/order` },
    { "@type": "ListItem", position: 3, name: "Book Event", item: `${BASE_URL}/book-event` },
    { "@type": "ListItem", position: 4, name: "Track Order", item: `${BASE_URL}/track-order` },
  ],
};

const JsonLd = () => (
  <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
  </>
);

export default JsonLd;
