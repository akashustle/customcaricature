import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Wifi, WifiOff, Trash2, Camera, Mic, Image, Eye } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type UserLocation = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  city: string | null;
  location_name: string | null;
  last_seen_at: string;
  is_online: boolean;
};

type OrderImage = {
  id: string;
  order_id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

const AdminLiveLocations = () => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPhotos, setUserPhotos] = useState<OrderImage[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchProfiles();
    const channel = supabase
      .channel("admin-live-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_live_locations" }, () => fetchLocations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("user_live_locations")
      .select("*")
      .order("last_seen_at", { ascending: false }) as any;
    if (data) setLocations(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email");
    if (data) {
      const map: Record<string, { name: string; email: string }> = {};
      data.forEach((p: any) => { map[p.user_id] = { name: p.full_name, email: p.email }; });
      setProfiles(map);
    }
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from("user_live_locations").delete().eq("id", id) as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Location deleted" });
      fetchLocations();
    }
  };

  const deleteAllLocations = async () => {
    // Delete all locations by deleting each one
    for (const loc of locations) {
      await supabase.from("user_live_locations").delete().eq("id", loc.id) as any;
    }
    toast({ title: "All locations deleted" });
    fetchLocations();
  };

  const viewUserPhotos = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingPhotos(true);
    setUserPhotos([]);
    setPhotoUrls({});

    // Get all orders for this user
    const { data: orders } = await supabase.from("orders").select("id").eq("user_id", userId);
    if (!orders || orders.length === 0) {
      setLoadingPhotos(false);
      return;
    }

    const orderIds = orders.map(o => o.id);
    const { data: images } = await supabase.from("order_images").select("*").in("order_id", orderIds);
    if (images) {
      setUserPhotos(images as OrderImage[]);
      // Generate signed URLs
      const urls: Record<string, string> = {};
      for (const img of images) {
        const { data: signedData } = await supabase.storage.from("order-photos").createSignedUrl(img.storage_path, 3600);
        if (signedData?.signedUrl) urls[img.id] = signedData.signedUrl;
      }
      setPhotoUrls(urls);
    }
    setLoadingPhotos(false);
  };

  const deletePhoto = async (image: OrderImage) => {
    await supabase.storage.from("order-photos").remove([image.storage_path]);
    await supabase.from("order_images").delete().eq("id", image.id) as any;
    toast({ title: "Photo deleted" });
    if (selectedUserId) viewUserPhotos(selectedUserId);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const onlineCount = locations.filter(l => l.is_online).length;

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Live User Locations</h2>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 border-none">
            <Wifi className="w-3 h-3 mr-1" />{onlineCount} Online
          </Badge>
          {locations.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs"><Trash2 className="w-3 h-3 mr-1" />Clear All</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all location data?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove all tracked user locations. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAllLocations}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {locations.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground">No location data yet. Users will appear here when they grant location access.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map((loc) => {
            const profile = profiles[loc.user_id];
            return (
              <Card key={loc.id} className={`hover:shadow-md transition-shadow ${loc.is_online ? "border-green-200" : "border-border"}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="cursor-pointer" onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}>
                      <p className="font-sans font-medium text-sm">{profile?.name || "Unknown User"}</p>
                      <p className="text-xs text-muted-foreground font-sans">{profile?.email || loc.user_id}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`border-none text-xs ${loc.is_online ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                        {loc.is_online ? <><Wifi className="w-3 h-3 mr-1" />Online</> : <><WifiOff className="w-3 h-3 mr-1" />Offline</>}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans cursor-pointer" onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}>
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                    {loc.city && <span>· {loc.city}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-sans">
                    Last seen: {formatTime(loc.last_seen_at)} ({getTimeSince(loc.last_seen_at)})
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => viewUserPhotos(loc.user_id)}>
                      <Image className="w-3 h-3 mr-1" />Photos
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}>
                      📍 Maps
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete location?</AlertDialogTitle>
                          <AlertDialogDescription>Remove location data for {profile?.name || "this user"}?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLocation(loc.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* User Photos Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Image className="w-5 h-5" />
              User Photos {selectedUserId && profiles[selectedUserId] ? `— ${profiles[selectedUserId].name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {loadingPhotos ? (
            <p className="text-center text-muted-foreground py-8 font-sans">Loading photos...</p>
          ) : userPhotos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 font-sans">No photos found for this user</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {userPhotos.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                  {photoUrls[img.id] ? (
                    <img src={photoUrls[img.id]} alt={img.file_name} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {photoUrls[img.id] && (
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => window.open(photoUrls[img.id], "_blank")}>
                        <Eye className="w-3 h-3 mr-1" />View
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-7 text-xs">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete photo?</AlertDialogTitle>
                          <AlertDialogDescription>Delete "{img.file_name}"? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePhoto(img)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans p-1 truncate">{img.file_name}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLiveLocations;
