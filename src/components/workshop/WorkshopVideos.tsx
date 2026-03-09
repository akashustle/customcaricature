import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Maximize, Lock, Clock, AlertTriangle, Download, ExternalLink } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/50 border border-purple-100/30 rounded-2xl p-5 shadow-sm ${className}`}>
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
    if (!video.global_download_allowed) return false;
    if (user.video_download_allowed) return true;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.download_allowed) return true;
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

  const isYouTube = (url: string) => url?.includes("youtube.com") || url?.includes("youtu.be");
  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const handleDownload = async (video: any) => {
    if (video.video_type === "file" && video.video_url) {
      try {
        const { data } = await supabase.storage.from("workshop-files").download(video.video_url);
        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = video.title || "video";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch {}
    }
  };

  return (
    <GlassCard>
      <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-purple-500" /> Workshop Videos
      </h2>
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-purple-200 mx-auto mb-3" />
          <p className="text-gray-400">Workshop recordings will appear here once uploaded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video: any) => {
            const accessible = isVideoAccessible(video);
            const expiry = getVideoExpiry(video);
            const countdown = expiry ? getCountdown(expiry) : null;
            const download = canDownload(video);
            const isActive = activeVideo === video.id;
            const isExternal = video.video_type === "external_link";
            const isEmbeddable = video.video_type === "embed_link" || isYouTube(video.video_url || "");

            return (
              <div key={video.id} className={`rounded-xl p-4 border ${
                accessible ? "bg-purple-50/40 border-purple-100/30" : "bg-gray-50/40 border-gray-200/20 opacity-60"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-700 font-medium text-sm">{video.title}</h3>
                    <p className="text-gray-400 text-xs">
                      {new Date(video.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {video.slot && ` · ${video.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                    </p>
                  </div>
                  {!accessible ? (
                    <Badge className="bg-red-100 text-red-500 border-red-200 text-xs"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-600 border-green-200 text-xs">Available</Badge>
                  )}
                </div>

                {accessible && countdown && (
                  <div className="mt-2 bg-amber-50/80 border border-amber-200/30 rounded-lg p-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-500">Video access expires in:</p>
                      <p className="text-xs font-mono font-bold text-amber-600">{countdown}</p>
                    </div>
                  </div>
                )}

                {!accessible && expiry && now > expiry && (
                  <div className="mt-2 bg-red-50/80 border border-red-200/30 rounded-lg p-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs text-red-500">Video access has expired</p>
                  </div>
                )}

                {accessible && (
                  <>
                    {isExternal ? (
                      <Button onClick={() => window.open(video.video_url, "_blank")}
                        className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl">
                        <ExternalLink className="w-4 h-4 mr-2" /> Open External Link
                      </Button>
                    ) : !isActive ? (
                      <Button onClick={() => setActiveVideo(video.id)}
                        className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl">
                        <Play className="w-4 h-4 mr-2" /> Watch Video
                      </Button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                          {isEmbeddable ? (
                            <iframe src={getYouTubeEmbed(video.video_url)} className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen />
                          ) : (
                            <video ref={videoRef} src={video.video_url} controls
                              controlsList={download ? "" : "nodownload"}
                              onContextMenu={download ? undefined : (e) => e.preventDefault()}
                              className="w-full h-full" playsInline />
                          )}
                        </div>
                        {!isEmbeddable && (
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => skip(-10)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg">
                              <SkipBack className="w-4 h-4 mr-1" />10s
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}
                              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg">
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => skip(10)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg">
                              10s<SkipForward className="w-4 h-4 ml-1" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) { document.fullscreenElement ? document.exitFullscreen() : videoRef.current.requestFullscreen(); }}}
                              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg">
                              <Maximize className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {download && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(video)}
                            className="w-full text-purple-500 border-purple-200 hover:bg-purple-50 rounded-lg">
                            <Download className="w-4 h-4 mr-1" /> Download Video
                          </Button>
                        )}
                        {!download && <p className="text-[10px] text-center text-gray-300">Download disabled by admin</p>}
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
