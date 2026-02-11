import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <p>Creative Caricature Club respects your privacy and is committed to protecting your personal data.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Information We Collect</h2>
        <p>We collect your name, email, phone number, Instagram ID, delivery address, and photographs you upload for creating your caricature.</p>
        <h2 className="font-display text-lg font-bold text-foreground">How We Use Your Information</h2>
        <p>Your information is used solely for processing your order, contacting you about your order status, and delivering your artwork. We do not sell or share your personal data with third parties.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Photo Usage</h2>
        <p>Photos uploaded are used exclusively for creating your caricature. We may use completed artworks for portfolio purposes unless you opt out.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Data Security</h2>
        <p>We use industry-standard security measures to protect your personal information and payment details.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Contact</h2>
        <p>For privacy concerns, contact us on WhatsApp at 8369594271 or email us.</p>
      </div>
    </div>
  );
};

export default Privacy;
