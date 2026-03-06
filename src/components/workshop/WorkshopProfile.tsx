import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Instagram, Calendar, Clock, Briefcase } from "lucide-react";

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
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl">My Profile</CardTitle>
          <Badge variant="outline" className="font-sans text-xs capitalize">
            {user.student_type === "registered_online" ? "Online Student" : "Workshop Student"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details.map((d) => (
            <div key={d.label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <d.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">{d.label}</p>
                <p className="font-sans font-medium text-foreground text-sm">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkshopProfile;
