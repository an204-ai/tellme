export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold">Trang cá nhân @{username}</h1>
    </div>
  );
}
