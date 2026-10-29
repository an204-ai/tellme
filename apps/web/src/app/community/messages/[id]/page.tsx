import { MessagesScreen } from "@/components/screens/MessagesScreen";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MessagesScreen conversationId={id} />;
}
