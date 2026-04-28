import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, MessageCircle, Phone, Mail, Instagram, Youtube, Facebook, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";

type Props = { postId: string; postTitle: string; postSlug: string };

const SESSION_KEY = "ccc_blog_session_id";
const getSessionId = () => {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
};

const BlogEngagement = ({ postId, postTitle, postSlug }: Props) => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const contact: any = (settings as any)?.contact_info || {};

  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(null);
  const [busy, setBusy] = useState(false);

  const wa = (contact?.whatsapp_number || "918369594271").replace(/[^0-9]/g, "");
  const phone = contact?.phone_number || contact?.whatsapp_number || "918369594271";
  const email = contact?.email || "hello@creativecaricatureclub.com";
  const igUrl = contact?.instagram_url || "https://instagram.com/creativecaricatureclub";
  const ytUrl = contact?.youtube_url || "https://www.youtube.com/@creativecaricatureclub";
  const fbUrl = contact?.facebook_url || "https://facebook.com/creativecaricatureclub";

  const waBookMsg = encodeURIComponent(
    `Hi! I just read your blog "${postTitle}" and I'd love to book a caricature artist for my event. Please share details.`,
  );
  const waReadMsg = encodeURIComponent(`Just read this on Creative Caricature Club: ${postTitle}`);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("blog_post_reactions")
      .select("reaction, user_id, session_id")
      .eq("post_id", postId);
    if (!data) return;
    let l = 0, d = 0;
    data.forEach((r: any) => (r.reaction === "like" ? l++ : d++));
    setLikes(l);
    setDislikes(d);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || null;
    const sid = getSessionId();
    const mine = data.find((r: any) => (uid ? r.user_id === uid : !r.user_id && r.session_id === sid));
    setMyReaction((mine?.reaction as any) || null);
  }, [postId]);

  useEffect(() => { refresh(); }, [refresh]);

  const react = async (type: "like" | "dislike") => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || null;
      const sid = getSessionId();

      // toggle off if same
      if (myReaction === type) {
        const q = supabase.from("blog_post_reactions").delete().eq("post_id", postId);
        await (uid ? q.eq("user_id", uid) : q.is("user_id", null).eq("session_id", sid));
      } else {
        // remove existing then insert new
        const q = supabase.from("blog_post_reactions").delete().eq("post_id", postId);
        await (uid ? q.eq("user_id", uid) : q.is("user_id", null).eq("session_id", sid));
        await supabase.from("blog_post_reactions").insert({
          post_id: postId,
          reaction: type,
          user_id: uid,
          session_id: uid ? null : sid,
        });
      }
      await refresh();
      toast({ title: type === "like" ? "Thanks for liking! ❤️" : "Thanks for the feedback" });
    } catch (e: any) {
      toast({ title: "Couldn't save reaction", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const socials = [
    { key: "wa", label: "WhatsApp", icon: MessageCircle, color: "from-emerald-400 to-green-600", href: `https://wa.me/${wa}?text=${waReadMsg}` },
    { key: "phone", label: "Call Us", icon: Phone, color: "from-sky-400 to-blue-600", href: `tel:+${String(phone).replace(/[^0-9]/g, "")}` },
    { key: "email", label: "Email", icon: Mail, color: "from-rose-400 to-red-600", href: `mailto:${email}?subject=${encodeURIComponent("Re: " + postTitle)}` },
    { key: "ig", label: "Instagram", icon: Instagram, color: "from-pink-500 via-fuchsia-500 to-orange-400", href: igUrl },
    { key: "yt", label: "YouTube", icon: Youtube, color: "from-red-500 to-rose-700", href: ytUrl },
    { key: "fb", label: "Facebook", icon: Facebook, color: "from-blue-500 to-indigo-700", href: fbUrl },
  ];

  return (
    <section className="mt-12 space-y-8" aria-label="Blog engagement">
      {/* ── Like / Dislike ── */}
      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">Did you enjoy this article?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Tap a reaction — it really helps us.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => react("like")}
              disabled={busy}
              aria-pressed={myReaction === "like"}
              className={`group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl border transition-all active:scale-95 ${
                myReaction === "like"
                  ? "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${myReaction === "like" ? "fill-white" : ""}`} />
              <span className="font-semibold text-sm tabular-nums">{likes}</span>
            </button>
            <button
              onClick={() => react("dislike")}
              disabled={busy}
              aria-pressed={myReaction === "dislike"}
              className={`group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl border transition-all active:scale-95 ${
                myReaction === "dislike"
                  ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/30"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              <ThumbsDown className={`w-5 h-5 ${myReaction === "dislike" ? "fill-white" : ""}`} />
              <span className="font-semibold text-sm tabular-nums">{dislikes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Book a Caricature Artist — premium 3D card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative rounded-[28px] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 50%, #c026d3 100%)",
          boxShadow: "0 30px 80px -25px rgba(109,40,217,0.5), 0 12px 30px -12px rgba(192,38,211,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {/* shine */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        <div aria-hidden className="absolute -top-10 -right-10 w-60 h-60 rounded-full blur-3xl opacity-40 bg-fuchsia-300" />
        <div aria-hidden className="absolute -bottom-16 -left-10 w-72 h-72 rounded-full blur-3xl opacity-30 bg-violet-400" />

        <div className="relative p-6 sm:p-8 md:p-10 text-center text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Book India's #1 Live Caricature Artists</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-black leading-tight max-w-2xl mx-auto">
            Make your guests <span className="italic">fall in love</span> with your event.
          </h3>
          <p className="mt-3 text-white/85 text-sm sm:text-base max-w-xl mx-auto">
            Live caricature stations, hand-drawn keepsakes, and unforgettable smiles — book a Creative Caricature Club artist for your wedding, birthday or corporate gig.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/book-event")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Book Now <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`https://wa.me/${wa}?text=${waBookMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Social 3D flash cards ── */}
      <div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground text-center mb-4">
          Connect with us
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {socials.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.a
                key={s.key}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -4, rotateX: 6, rotateY: -6 }}
                whileTap={{ scale: 0.94 }}
                style={{ transformStyle: "preserve-3d", perspective: 800 }}
                className={`group relative rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br ${s.color}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    boxShadow: "0 14px 30px -12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 8px rgba(0,0,0,0.15)",
                  }}
                />
                <span aria-hidden className="absolute inset-x-2 top-1.5 h-6 rounded-xl bg-white/20 blur-md opacity-70 pointer-events-none" />
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 drop-shadow" />
                <span className="text-[10px] sm:text-xs font-bold tracking-wide relative z-10 drop-shadow">{s.label}</span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BlogEngagement;
