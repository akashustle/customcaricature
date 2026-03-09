import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Instagram, Calendar, Clock, Briefcase } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const WorkshopProfile = ({ user }: { user: any }) => {
  const details = [
    { icon: User, label: "Name", value: user.name },
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Mobile", value: user.mobile },
    { icon: Instagram, label: "Instagram", value: user.instagram_id || "—" },
    { icon: User, label: "Age", value: user.age || "—" },
    { icon: Briefcase, label: "Occupation", value: user.occupation || "—" },
    { icon: Calendar, label: "Workshop Date", value: user.workshop_date ? new Date(user.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    { icon: Clock, label: "Slot", value: user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : user.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : user.slot },
  ];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">My Profile</h2>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
          {user.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {details.map((d) => (
          <div key={d.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
              <d.icon className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{d.label}</p>
              <p className="text-white text-sm font-medium truncate">{d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default WorkshopProfile;
