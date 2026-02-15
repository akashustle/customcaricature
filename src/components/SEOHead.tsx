import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
  noindex?: boolean;
}

const SITE_NAME = "Creative Caricature Club";
const DEFAULT_DESC = "Order custom hand-crafted caricatures online. Single, couple & group caricatures in cute, romantic, fun, royal & minimal styles. Delivered to your doorstep across India.";
const BASE_URL = "https://customcaricature.lovable.app";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  type = "website",
  image = "/logo.png",
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Custom Hand-Crafted Caricatures Online`;
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
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", fullImage);

    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      const el = document.querySelector('meta[name="robots"]');
      if (el) el.remove();
    }

    if (fullCanonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = fullCanonical;
    }

    if (fullCanonical) {
      setMeta("og:url", fullCanonical, "property");
    }
  }, [fullTitle, description, type, fullImage, fullCanonical, noindex]);

  return null;
};

export default SEOHead;
