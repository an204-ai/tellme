export const canViewContent = (viewerId: string, authorId: string, privacyLevel: string) => {
  if (privacyLevel === "public") return true;
  if (viewerId === authorId) return true;
  return false;
};
