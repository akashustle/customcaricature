import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Instagram, Calendar, Clock, Briefcase } from "lucide-react";

const WorkshopProfile = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";
  const itemBg = dm ? "bg-white/5 border-white/5" : "bg-purple-50/40 border-purple-100/20";
  const iconBg = dm ? "bg-purple-500/20" : "bg-gradient-to-br from-purple-200/60 to-pink-200/60";

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
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${textPrimary} text-lg`}>My Profile</h2>
        <Badge className={`${dm ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-purple-100 text-purple-600 border-purple-200"} text-xs`}>
          {user.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {details.map((d) => (
          <div key={d.label} className={`flex items-center gap-3 p-3 rounded-xl ${itemBg} border`}>
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <d.icon className={`w-4 h-4 ${dm ? "text-purple-400" : "text-purple-500"}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] ${textMuted} uppercase tracking-wider`}>{d.label}</p>
              <p className={`${textPrimary} text-sm truncate`}>{d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkshopProfile;
