import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">About Us</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <img src="/logo.png" alt="Creative Caricature Club" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-center text-foreground">Creative Caricature Club</h2>
        <p>We are a team of passionate artists dedicated to creating unique, hand-crafted caricatures that capture the essence of your personality. Every artwork is meticulously crafted with love and attention to detail.</p>
        <p>Based in Mumbai, India, we deliver our premium caricatures across the country. Mumbai orders include a beautiful frame at no extra cost.</p>
        <p>With styles ranging from Cute, Romantic, Fun, Royal, Minimal, to Artist's Choice — we have something for everyone. Whether it's a gift for a loved one or a treat for yourself, our caricatures are guaranteed to bring a smile.</p>
        <p>Follow us on Instagram <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" className="text-primary font-medium">@creativecaricatureclub</a> to see our latest work!</p>
      </div>
    </div>
  );
};

export default About;
