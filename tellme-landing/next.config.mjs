/** Standalone static marketing site: no dependency on the Tellme API. */
export default {
  // Keep Next's file tracing inside this standalone project, not the monorepo.
  outputFileTracingRoot: process.cwd(),
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
