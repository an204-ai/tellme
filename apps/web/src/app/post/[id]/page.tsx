import { AppShell } from "@/components/app/AppShell";
import { PostDetailScreen } from "@/components/screens/CollectionScreens";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <PostDetailScreen id={id} />
    </AppShell>
  );
}
