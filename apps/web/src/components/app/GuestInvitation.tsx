import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function GuestInvitation({ next }: { next: string }) {
  return <div className="guest-invitation"><span>Ngày đi làm của bạn có gì mới?</span><Link href={`/auth/login?next=${encodeURIComponent(next)}`}>Tham gia Tellme<ArrowRight size={16} aria-hidden="true" /></Link></div>;
}
