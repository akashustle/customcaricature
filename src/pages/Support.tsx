import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, Instagram, MessageCircle, Youtube, Facebook, Send, CheckCircle2, ArrowLeft, Headphones, Sparkles } from "lucide-react";
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
    { icon: Instagram, label: "@creativecaricatureclub", href: "https://instagram.com/creativecaricatureclub", color: "from-rose-400 to-rose-500" },
    { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/918369594271", color: "from-emerald-400 to-emerald-500" },
    { icon: Youtube, label: "YouTube", href: "https://youtube.com/@creativecaricatureclub", color: "from-red-400 to-red-500" },
    { icon: Facebook, label: "Facebook", href: "https://facebook.com/creativecaricatureclub", color: "from-blue-400 to-blue-500" },
    { icon: Mail, label: "creativecaricatureclub@gmail.com", href: "mailto:creativecaricatureclub@gmail.com", color: "from-amber-400 to-amber-500" },
  ];

  if (submitted) {
    return (
      <>
        <SEOHead title="Support | Creative Caricature Club" description="Get in touch with us" />
        <div className="min-h-screen brand-gradient-bg flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <Card className="w-full max-w-md shadow-3d border-glow text-center">
              <CardContent className="p-8 space-y-4">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-3d">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="font-calligraphy text-3xl font-bold text-3d">Message Sent!</h2>
                <p className="text-sm text-muted-foreground font-body">We'll get back to you as soon as possible.</p>
                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => window.open("https://wa.me/918369594271", "_blank")} className="w-full font-body bg-emerald-500 hover:bg-emerald-600 text-white btn-3d rounded-full h-12">
                    <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="font-body rounded-full">
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
      <div className="min-h-screen brand-gradient-bg pb-24 md:pb-0">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          {/* Animated background blobs */}
          <motion.div className="absolute w-72 h-72 rounded-full opacity-20 animate-morph" style={{ background: "radial-gradient(circle, hsl(22 78% 52% / 0.3), transparent)", top: "-10%", right: "-5%" }} animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} />
          <motion.div className="absolute w-48 h-48 rounded-full opacity-15 animate-morph" style={{ background: "radial-gradient(circle, hsl(38 88% 50% / 0.3), transparent)", bottom: "0", left: "5%" }} animate={{ x: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }} />
          
          <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
            <Button variant="ghost" onClick={() => navigate("/")} className="absolute left-4 top-4 font-body rounded-full">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mb-6 shadow-3d">
                <Headphones className="w-10 h-10 text-accent-foreground" />
              </motion.div>
              <h1 className="font-calligraphy text-4xl md:text-5xl font-bold mb-3 text-3d animate-text-glow">Get in Touch</h1>
              <p className="text-muted-foreground font-body max-w-xl mx-auto text-base">
                Have a question or want to discuss a project? We'd love to hear from you!
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-6">
              <h2 className="font-calligraphy text-2xl font-bold text-3d">Contact Information</h2>

              <div className="space-y-3">
                {[
                  { icon: Phone, title: "Phone", content: <a href="tel:+918369594271" className="text-sm text-muted-foreground font-body hover:text-accent transition-colors">+91 8369594271</a> },
                  { icon: Mail, title: "Email", content: <a href="mailto:creativecaricatureclub@gmail.com" className="text-sm text-muted-foreground font-body hover:text-accent transition-colors">creativecaricatureclub@gmail.com</a> },
                  { icon: MapPin, title: "Location", content: <p className="text-sm text-muted-foreground font-body">Mumbai, Maharashtra, India</p> },
                  { icon: Clock, title: "Business Hours", content: <><p className="text-sm text-muted-foreground font-body">Mon - Sat: 10am - 7pm IST</p><p className="text-sm text-muted-foreground font-body">Sun: 11am - 5pm IST</p></> },
                ].map((item, i) => (
                  <motion.div key={item.title} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-2xl card-3d hover:border-glow cursor-default">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 shadow-3d">
                      <item.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-body font-semibold text-sm">{item.title}</p>
                      {item.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-calligraphy text-xl font-bold mb-3 text-3d">Follow Us</h3>
                <div className="grid grid-cols-1 gap-2">
                  {socials.map((s, i) => (
                    <motion.a
                      key={i}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      whileHover={{ x: 6, scale: 1.02 }}
                      className="flex items-center gap-3 p-3 rounded-xl card-3d group"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shadow-3d group-hover:animate-wiggle`}>
                        <s.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-body text-muted-foreground group-hover:text-foreground transition-colors">{s.label}</span>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <Card className="shadow-3d border-glow overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-accent via-primary to-accent animate-gradient" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Sparkles className="w-6 h-6 text-accent" />
                    </motion.div>
                    <h2 className="font-calligraphy text-2xl font-bold text-3d">Send a Message</h2>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                      <Label className="font-body">Your Name *</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="mt-1 rounded-xl" />
                    </motion.div>
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
                      <Label className="font-body">Email Address *</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1 rounded-xl" />
                    </motion.div>
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                      <Label className="font-body">Mobile Number</Label>
                      <Input value={mobile} onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setMobile(v); }} placeholder="10-digit number" className="mt-1 rounded-xl" maxLength={10} />
                    </motion.div>
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}>
                      <Label className="font-body">Subject</Label>
                      <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" className="mt-1 rounded-xl" />
                    </motion.div>
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                      <Label className="font-body">Message *</Label>
                      <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us about your project or question..." className="mt-1 min-h-[120px] rounded-xl" />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={submitting} className="w-full rounded-full font-body h-12 text-base btn-3d">
                        {submitting ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
                      </Button>
                    </motion.div>
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
