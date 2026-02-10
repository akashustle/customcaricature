import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, Heart, Laugh, Crown, Minimize2, Sparkles, Clock, Truck, Monitor } from "lucide-react";

const styles = [
  { icon: Palette, name: "Cute", desc: "Adorable & charming portraits" },
  { icon: Heart, name: "Romantic", desc: "Perfect for couples & love" },
  { icon: Laugh, name: "Fun", desc: "Playful & humorous vibes" },
  { icon: Crown, name: "Royal", desc: "Majestic & regal themes" },
  { icon: Minimize2, name: "Minimal", desc: "Clean & elegant lines" },
  { icon: Sparkles, name: "Artist's Choice", desc: "Let our artists surprise you" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="container mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Creative Caricature
              <span className="block text-primary">Club</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto font-sans">
              Custom hand-crafted caricatures that capture personality in every stroke. Digital or physical — your choice.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/order")}
              className="text-lg px-10 py-6 rounded-full font-sans font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              Order Your Custom Caricature
            </Button>
          </motion.div>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/10 border-t border-primary/20">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-sm font-sans text-foreground/80 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Due to high demand, current delivery timelines apply. Digital: 15–20 days | Physical: 20–25 days
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">How It Works</h2>
          <p className="text-muted-foreground font-sans">Simple 3-step process to get your perfect caricature</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: Monitor, step: "1", title: "Choose & Customize", desc: "Select digital or physical, pick your style, and upload clear photos." },
            { icon: Palette, step: "2", title: "We Create", desc: "Our talented artists hand-craft your unique caricature with love." },
            { icon: Truck, step: "3", title: "You Receive", desc: "Get your digital file or framed artwork delivered to your doorstep." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="text-center border-none bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-sans font-semibold text-primary uppercase tracking-wider">Step {item.step}</span>
                  <h3 className="font-display text-xl font-semibold mt-2 mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Styles Showcase */}
      <section className="bg-secondary/40 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Our Styles</h2>
            <p className="text-muted-foreground font-sans">Choose the vibe that matches your personality</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {styles.map((style, i) => (
              <motion.div
                key={style.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="group cursor-pointer border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg bg-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <style.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-1">{style.name}</h3>
                    <p className="text-xs text-muted-foreground font-sans">{style.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Quick View */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Pricing</h2>
          <p className="text-muted-foreground font-sans">Transparent pricing, no hidden charges</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {[
            { type: "Digital", prices: ["Single: ₹3,000", "Couple: ₹9,000", "Group: ₹3,000/face"], timeline: "15–20 days", icon: Monitor },
            { type: "Physical", prices: ["Single: ₹5,000", "Couple: ₹9,000", "Group: ₹3,000/face"], timeline: "20–25 days", icon: Palette },
          ].map((item, i) => (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border border-border/50" style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{item.type}</h3>
                  </div>
                  <ul className="space-y-2 mb-4 font-sans">
                    {item.prices.map((p) => (
                      <li key={p} className="text-foreground/80 text-sm">• {p}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground font-sans flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Delivery: {item.timeline}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={() => navigate("/order")}
            className="rounded-full px-10 py-6 text-lg font-sans font-semibold"
          >
            Start Your Order
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/5 py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-lg font-semibold text-foreground mb-1">Creative Caricature Club</p>
          <p className="text-sm text-muted-foreground font-sans">Custom caricatures crafted with love ✨</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
