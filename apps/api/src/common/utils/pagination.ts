export const parsePagination = (cursor?: string, limitStr?: string) => {
  const limit = Math.min(Number(limitStr) || 20, 50);
  return { cursor, limit };
};
