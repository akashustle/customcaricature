import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Maximize, Lock, Clock, AlertTriangle } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const WorkshopVideos = ({ user }: { user: any }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchVideos(); fetchAccess(); fetchSettings();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase.from("workshop_videos" as any).select("*").order("workshop_date");
    if (data) setVideos(data as any[]);
  };
  const fetchAccess = async () => {
    const { data } = await supabase.from("workshop_user_video_access" as any).select("*").eq("user_id", user.id);
    if (data) setUserAccess(data as any[]);
  };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setGlobalSettings(map);
    }
  };

  const getVideoExpiry = (video: any) => {
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.custom_expiry) return new Date(access.custom_expiry);
    if (video.expiry_date) return new Date(video.expiry_date);
    return null;
  };

  const isVideoAccessible = (video: any) => {
    if (!globalSettings.global_video_access?.enabled) return false;
    if (!user.video_access_enabled) return false;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access && !access.access_enabled) return false;
    const expiry = getVideoExpiry(video);
    if (expiry && now > expiry) return false;
    return true;
  };

  const canDownload = (video: any) => {
    if (user.video_download_allowed) return true;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.download_allowed) return true;
    if (video.global_download_allowed) return true;
    if (globalSettings.global_video_download?.enabled) return true;
    return false;
  };

  const getCountdown = (expiry: Date) => {
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const skip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  return (
    <GlassCard>
      <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-purple-400" /> Workshop Videos
      </h2>
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-white/10 mx-auto mb-3" />
          <p className="text-white/50">Workshop recordings will appear here once uploaded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video: any) => {
            const accessible = isVideoAccessible(video);
            const expiry = getVideoExpiry(video);
            const countdown = expiry ? getCountdown(expiry) : null;
            const download = canDownload(video);
            const isActive = activeVideo === video.id;

            return (
              <div key={video.id} className={`rounded-xl p-4 border ${
                accessible ? "bg-white/5 border-white/10" : "bg-white/[0.02] border-white/5 opacity-60"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm">{video.title}</h3>
                    <p className="text-white/40 text-xs">
                      {new Date(video.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {video.slot && ` · ${video.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                    </p>
                  </div>
                  {!accessible ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Available</Badge>
                  )}
                </div>

                {accessible && countdown && (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-400">Video access expires in:</p>
                      <p className="text-xs font-mono font-bold text-amber-300">{countdown}</p>
                    </div>
                  </div>
                )}

                {!accessible && expiry && now > expiry && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs text-red-400">Video access has expired</p>
                  </div>
                )}

                {accessible && (
                  <>
                    {!isActive ? (
                      <Button onClick={() => setActiveVideo(video.id)} className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl">
                        <Play className="w-4 h-4 mr-2" /> Watch Video
                      </Button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                          <video ref={videoRef} src={video.video_url} controls
                            controlsList={download ? "" : "nodownload"}
                            onContextMenu={download ? undefined : (e) => e.preventDefault()}
                            className="w-full h-full" playsInline />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => skip(-10)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                            <SkipBack className="w-4 h-4 mr-1" />10s
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}
                            className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                            <Pause className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => skip(10)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                            10s<SkipForward className="w-4 h-4 ml-1" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) { document.fullscreenElement ? document.exitFullscreen() : videoRef.current.requestFullscreen(); }}}
                            className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                            <Maximize className="w-4 h-4" />
                          </Button>
                        </div>
                        {!download && <p className="text-[10px] text-center text-white/30">Download disabled</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};

export default WorkshopVideos;
