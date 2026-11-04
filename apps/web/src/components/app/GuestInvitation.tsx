import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function GuestInvitation({ next }: { next: string }) {
  return <div className="guest-invitation"><span>Có chuyện đi làm muốn kể?</span><Link href={`/auth/login?next=${encodeURIComponent(next)}`}><span className="guest-invitation-join-full">Tham gia Tellme</span><span className="guest-invitation-join-compact">Tham gia</span><ArrowRight size={16} aria-hidden="true" /></Link></div>;
}
