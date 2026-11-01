import { AppShell } from "@/components/app/AppShell";
import { PostDetailScreen } from "@/components/screens/CollectionScreens";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; view?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <AppShell>
      <PostDetailScreen id={id} fromArchive={query.from === "archive"} archiveView={query.view === "hidden" ? "hidden" : "saved"} />
    </AppShell>
  );
}
