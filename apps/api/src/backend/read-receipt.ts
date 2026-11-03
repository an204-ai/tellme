/** Cursor advancement is monotonic. The commit must use a database CAS/$max. */
export async function advanceReadReceipt(current: string | undefined, at: string,
  commit: () => Promise<{ modifiedCount: number }>, publish: () => Promise<void>) {
  if ((current || '') >= at) return false;
  const result = await commit();
  if (!result.modifiedCount) return false;
  await publish();
  return true;
}
