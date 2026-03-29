import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string;
}

const SITE_NAME = "Creative Caricature Club™";
const DEFAULT_DESC = "Creative Caricature Club™ — India's #1 caricature studio. Book live caricature artists for weddings, corporate events, birthdays & parties in Mumbai & across India. Order custom hand-crafted caricatures from photos online. International event bookings available.";
const BASE_URL = "https://portal.creativecaricatureclub.com";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  type = "website",
  image = "/logo.png",
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Custom Hand-Crafted Caricatures Online India`;
  const fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
  const fullCanonical = canonical ? `${BASE_URL}${canonical}` : undefined;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description);
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", type, "property");
    setMeta("og:image", fullImage, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "en_IN", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", fullImage);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    if (fullCanonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = fullCanonical;
      setMeta("og:url", fullCanonical, "property");
    }
  }, [fullTitle, description, type, fullImage, fullCanonical, noindex]);

  return null;
};

export default SEOHead;