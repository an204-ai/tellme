export const isOwner = (userId: string, ownerId: string) => {
  return userId === ownerId;
};
