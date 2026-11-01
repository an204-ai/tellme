import { ArchiveScreen } from "@/components/screens/ArchiveScreen";
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const query = await searchParams;
  return <ArchiveScreen initialView={query.view === "hidden" ? "hidden" : "saved"} />;
}
