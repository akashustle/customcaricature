import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, Instagram, Facebook, Youtube, Sparkles,
  Award, Users, Calendar, Heart, Twitter, Linkedin, Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
import { useSiteSetting } from "@/hooks/useSiteSetting";

const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
});

const ICON_MAP: Record<string, any> = {
  Calendar, Users, Heart, Award, Mail, Phone, Instagram, Facebook, Youtube,
  Twitter, Linkedin, Globe, Sparkles,
};

const DEFAULT_ABOUT = {
  founder_name: "Ritesh Mahendra Gupta",
  founder_label: "Founded by",
  stats: [
    { icon: "Calendar", val: "500+", label: "Events" },
    { icon: "Users", val: "100+", label: "Artists" },
    { icon: "Heart", val: "1000+", label: "Clients" },
    { icon: "Award", val: "4.9★", label: "Rating" },
  ],
  intro_paragraphs: [] as string[],
  services_title: "Services Offered",
  services: [] as { title: string; desc: string; sub: string }[],
  contact_title: "Contact Information",
  contacts: [] as { icon: string; href: string; text: string }[],
};

const About = () => {
  const navigate = useNavigate();
  const data = useSiteSetting("page_about", DEFAULT_ABOUT) as typeof DEFAULT_ABOUT;

  return (
    <div className="min-h-screen brand-gradient-bg pb-16 md:pb-0">
      <SEOHead
        title="About Creative Caricature Club™ | India's #1 Caricature Studio"
        description="Creative Caricature Club™ is India's leading caricature studio founded by Ritesh Mahendra Gupta. Professional caricature artists for events, weddings & custom orders."
        canonical="/about"
      />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg"  loading="lazy" decoding="async" />
          <h1 className="font-calligraphy text-xl font-bold">About Us</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-6 text-sm text-foreground/80">
        <motion.div
          initial={{ scale: 0.8, rotateY: 180, opacity: 0 }}
          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="text-center"
        >
          <motion.img
            src="/logo.png"
            alt="Creative Caricature Club™"
            className="w-24 h-24 rounded-2xl mx-auto mb-4 shadow-3d border-glow"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground text-3d animate-text-glow">
            Creative Caricature Club™
          </h2>
          <p className="text-muted-foreground italic mt-2">
            {data.founder_label} <strong className="text-foreground">{data.founder_name}</strong>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(data.stats || []).map((s, i) => {
            const Icon = ICON_MAP[s.icon] || Calendar;
            return (
              <motion.div
                key={`${s.label}-${i}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="card-3d p-4 text-center"
              >
                <Icon className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="font-calligraphy text-2xl font-bold text-foreground">{s.val}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {(data.intro_paragraphs || []).map((p, i) => (
          <motion.p
            key={i}
            {...fadeUp(0.2 + i * 0.05)}
            dangerouslySetInnerHTML={{ __html: p }}
          />
        ))}

        {(data.services || []).length > 0 && (
          <motion.div {...fadeUp(0.4)} className="border-t border-border pt-6 mt-6">
            <h3 className="font-calligraphy text-xl font-bold text-foreground mb-4 text-3d flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-wiggle" /> {data.services_title}
            </h3>
            <div className="space-y-3">
              {data.services.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.45 + i * 0.1 }}
                  className="card-3d p-4 hover:border-glow"
                >
                  <h4 className="font-calligraphy text-lg font-bold text-foreground mb-1">{s.title}</h4>
                  <p className="mb-1">{s.desc}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {(data.contacts || []).length > 0 && (
          <motion.div {...fadeUp(0.8)} className="border-t border-border pt-6 mt-6">
            <h3 className="font-calligraphy text-xl font-bold text-foreground mb-4 text-3d">{data.contact_title}</h3>
            <div className="space-y-2">
              {data.contacts.map((c, i) => {
                const Icon = ICON_MAP[c.icon] || Mail;
                return (
                  <motion.a
                    key={i}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.85 + i * 0.06 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-card transition-all group"
                  >
                    <Icon className="w-5 h-5 text-accent group-hover:animate-wiggle flex-shrink-0" />
                    <span className="text-accent hover:underline">{c.text}</span>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </div>
  );
};

export default About;
