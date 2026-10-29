import { ProfileScreen } from "@/components/screens/ProfileScreen";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ProfileScreen username={username} />;
}
