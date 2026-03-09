import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, Instagram, MessageCircle, Youtube, Facebook, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";

const Support = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_messages" as any).insert({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || null,
        subject: subject.trim() || null,
        message: message.trim(),
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Message sent successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const socials = [
    { icon: Instagram, label: "@creativecaricatureclub", href: "https://instagram.com/creativecaricatureclub", color: "from-pink-500 to-purple-600" },
    { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/918369594271", color: "from-green-500 to-green-600" },
    { icon: Youtube, label: "YouTube", href: "https://youtube.com/@creativecaricatureclub", color: "from-red-500 to-red-600" },
    { icon: Facebook, label: "Facebook", href: "https://facebook.com/creativecaricatureclub", color: "from-blue-500 to-blue-600" },
    { icon: Mail, label: "hello@creativecaricature.com", href: "mailto:hello@creativecaricature.com", color: "from-amber-500 to-orange-600" },
  ];

  if (submitted) {
    return (
      <>
        <SEOHead title="Support | Creative Caricature Club" description="Get in touch with us" />
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="w-full max-w-md shadow-2xl border-primary/20 text-center">
              <CardContent className="p-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-display text-2xl font-bold">Message Sent!</h2>
                <p className="text-sm text-muted-foreground font-sans">We'll get back to you as soon as possible.</p>
                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => window.open("https://wa.me/918369594271", "_blank")} className="w-full font-sans bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="font-sans">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Support & Contact | Creative Caricature Club" description="Have a question or want to discuss a project? We'd love to hear from you!" />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
            <Button variant="ghost" onClick={() => navigate("/")} className="absolute left-4 top-4 font-sans">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Get in Touch</h1>
              <p className="text-muted-foreground font-sans max-w-xl mx-auto">
                Have a question or want to discuss a project? We'd love to hear from you! Drop us a message and we'll get back to you as soon as possible.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-6">
              <h2 className="font-display text-xl font-bold">Contact Information</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Phone</p>
                    <a href="tel:+918369594271" className="text-sm text-muted-foreground font-sans hover:text-primary transition-colors">+91 8369594271</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Email</p>
                    <a href="mailto:hello@creativecaricature.com" className="text-sm text-muted-foreground font-sans hover:text-primary transition-colors">hello@creativecaricature.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Location</p>
                    <p className="text-sm text-muted-foreground font-sans">Mumbai, Maharashtra, India</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Business Hours</p>
                    <p className="text-sm text-muted-foreground font-sans">Mon - Sat: 10am - 7pm IST</p>
                    <p className="text-sm text-muted-foreground font-sans">Sun: 11am - 5pm IST</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-display text-lg font-bold mb-3">Follow Us</h3>
                <div className="grid grid-cols-1 gap-2">
                  {socials.map((s, i) => (
                    <a
                      key={i}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all group"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-sans text-muted-foreground group-hover:text-foreground transition-colors">{s.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="shadow-xl border-primary/10">
                <CardContent className="p-6">
                  <h2 className="font-display text-xl font-bold mb-4">Send a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-sans">Your Name *</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-sans">Email Address *</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-sans">Mobile Number</Label>
                      <Input value={mobile} onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setMobile(v); }} placeholder="10-digit number" className="mt-1" maxLength={10} />
                    </div>
                    <div>
                      <Label className="font-sans">Subject</Label>
                      <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-sans">Message *</Label>
                      <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us about your project or question..." className="mt-1 min-h-[120px]" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full rounded-full font-sans h-12 text-base">
                      {submitting ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Support;
