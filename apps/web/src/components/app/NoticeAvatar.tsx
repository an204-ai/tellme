import { CloudSun, Moon, Sunrise, Sunset, Utensils } from "lucide-react";
import { Avatar } from "@/components/ui/Primitives";
import type { Notice, Person } from "@/lib/types";

export function NoticeAvatar({ notice, person }: { notice: Notice; person?: Person }) {
  if (notice.kind !== "system") return <Avatar person={person} />;
  const Icon = { sunrise: Sunrise, lunch: Utensils, sunset: Sunset, moon: Moon, weather: CloudSun }[notice.systemIcon || "sunrise"];
  return <span className="system-notice-avatar" role="img" aria-label="Thông báo hệ thống Tellme">
    <img src="/images/reactions/like.png" alt="" width={44} height={44} />
    <span><Icon size={13} strokeWidth={2} /></span>
  </span>;
}
