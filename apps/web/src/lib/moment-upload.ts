/** A captured photo is retained across retries; a retry after save failure reuses the upload. */
export function createMomentUpload(options: {
  upload: () => Promise<string>;
  save: (url: string) => Promise<unknown>;
  state: (status: "uploading" | "done" | "error", url?: string) => void;
  error: (error: unknown) => void;
  done: () => void;
}) {
  let running = false;
  let uploadedUrl = "";
  const run = async () => {
    if (running) return;
    running = true;
    options.state("uploading");
    try {
      if (!uploadedUrl) uploadedUrl = await options.upload();
      await options.save(uploadedUrl);
      options.state("done", uploadedUrl);
      options.done();
    } catch (error) { options.state("error"); options.error(error); }
    finally { running = false; }
  };
  return run;
}
