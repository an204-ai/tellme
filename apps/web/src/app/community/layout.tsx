import { AppShell } from "@/components/app/AppShell";
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
