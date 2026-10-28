export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-xl font-bold">Hội thoại #{id}</h1>
    </div>
  );
}
