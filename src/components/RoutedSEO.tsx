import { useLocation } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { lookupSEO } from "@/lib/seo-registry";

/**
 * Auto-injects SEO metadata for the current route based on the registry.
 * Mounted ONCE inside the Router; runs on every navigation.
 * Per-page <SEOHead /> calls (e.g. with dynamic data) override this baseline.
 */
const RoutedSEO = () => {
  const { pathname } = useLocation();
  const meta = lookupSEO(pathname);
  if (!meta) return null;
  return (
    <SEOHead
      title={meta.title}
      description={meta.description}
      keywords={meta.keywords}
      noindex={meta.noindex}
      type={meta.type}
      canonical={pathname}
    />
  );
};

export default RoutedSEO;
