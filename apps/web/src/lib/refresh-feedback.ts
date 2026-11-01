/** Wait for React's updated DOM to reach a paint, without imposing a loading delay. */
export const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Only visible images matter; do not eagerly download the rest of an infinite feed. */
export async function waitForVisibleImages(root: HTMLElement, signal: AbortSignal, viewport = { width: window.innerWidth, height: window.innerHeight }) {
  const visible = Array.from(root.querySelectorAll("img")).filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width;
  });
  await Promise.all(visible.map((image) => waitForImage(image, signal)));
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal) {
  if (signal.aborted || image.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    // An unavailable photo must not pin the refresh control indefinitely.
    const timer = setTimeout(done, 8000);
    function done() {
      clearTimeout(timer);
      image.removeEventListener("load", done); image.removeEventListener("error", done);
      signal.removeEventListener("abort", done);
      resolve();
    }
    image.addEventListener("load", done, { once: true }); image.addEventListener("error", done, { once: true });
    signal.addEventListener("abort", done, { once: true });
    if (image.complete || signal.aborted) done();
  });
}

/** Both timeline and metadata/sidebar requests must finish before visual settling. */
export async function refreshTogether(operations: (() => Promise<unknown>)[]) {
  const results = await Promise.allSettled(operations.map((operation) => Promise.resolve().then(operation)));
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
