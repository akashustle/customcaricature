import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, ShoppingBag, Palette, Users, Star, GraduationCap, MessageCircle, HelpCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";

type ExploreSection = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  icon: string;
  sort_order: number;
  is_visible: boolean;
};

const ICON_MAP: Record<string, any> = {
  palette: Palette, calendar: Calendar, shopping: ShoppingBag, users: Users,
  star: Star, graduation: GraduationCap, chat: MessageCircle, help: HelpCircle, phone: Phone,
};

const DEFAULT_SECTIONS: ExploreSection[] = [
  { id: "order", title: "Custom Caricatures", subtitle: "Order hand-crafted caricature art from your photos", image_url: "", link: "/order", icon: "palette", sort_order: 1, is_visible: true },
  { id: "events", title: "Book for Events", subtitle: "Live caricature artists for weddings, parties & corporate events", image_url: "", link: "/book-event", icon: "calendar", sort_order: 2, is_visible: true },
  { id: "shop", title: "Shop", subtitle: "Browse caricature merchandise and gifts", image_url: "", link: "/shop", icon: "shopping", sort_order: 3, is_visible: true },
  { id: "gallery", title: "Gallery", subtitle: "Explore our portfolio of caricature masterpieces", image_url: "", link: "/gallery/caricatures", icon: "star", sort_order: 4, is_visible: true },
  { id: "workshop", title: "Workshop", subtitle: "Learn caricature art with professional artists", image_url: "", link: "/workshop", icon: "graduation", sort_order: 5, is_visible: true },
  { id: "chat", title: "Live Chat", subtitle: "Get instant help with your queries", image_url: "", link: "/live-chat", icon: "chat", sort_order: 6, is_visible: true },
  { id: "about", title: "About Us", subtitle: "Our story, team & journey", image_url: "", link: "/about", icon: "users", sort_order: 7, is_visible: true },
  { id: "faq", title: "FAQs", subtitle: "Frequently asked questions answered", image_url: "", link: "/faqs", icon: "help", sort_order: 8, is_visible: true },
  { id: "support", title: "Support", subtitle: "Need help? Reach out to us", image_url: "", link: "/support", icon: "phone", sort_order: 9, is_visible: true },
];

const Explore = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<ExploreSection[]>(DEFAULT_SECTIONS);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("content_blocks")
        .select("*")
        .eq("page", "explore")
        .order("sort_order");
      if (data && data.length > 0) {
        const mapped = data.filter(d => (d.content as any)?.is_visible !== false).map(d => {
          const c = d.content as any;
          return {
            id: d.id,
            title: c.title || "",
            subtitle: c.subtitle || "",
            image_url: c.image_url || "",
            link: c.link || "/",
            icon: c.icon || "palette",
            sort_order: d.sort_order,
            is_visible: d.is_visible,
          };
        });
        setSections(mapped);
      }
    };
    fetch();
    const ch = supabase.channel("explore-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_blocks", filter: "page=eq.explore" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEOHead title="Explore Caricature Services | Creative Caricature Club™" description="Explore all services — custom caricature orders, live event artist bookings, caricature workshops, merchandise shop & more from Creative Caricature Club™ India." canonical="/explore" />
      
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="font-calligraphy text-xl font-bold text-foreground">Explore</h1>
            <p className="text-[10px] text-muted-foreground">Discover all our services</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4">
          {sections.map((section, i) => {
            const IconComp = ICON_MAP[section.icon] || Palette;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className="cursor-pointer overflow-hidden border border-border/60 hover:border-primary/30 hover:shadow-lg transition-all group"
                  onClick={() => navigate(section.link)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      {section.image_url ? (
                        <img src={section.image_url} alt={section.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <IconComp className="w-7 h-7 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-semibold text-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{section.subtitle}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Explore;
