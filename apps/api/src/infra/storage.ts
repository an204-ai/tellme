export const storageClient = {
  getUploadUrl: async (key: string) => {
    return { url: `https://storage.tellme.app/upload/${key}`, key };
  }
};
