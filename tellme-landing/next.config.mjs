/** Standalone static marketing site: no dependency on the Tellme API. */
export default {
  experimental: process.env.TELLME_LOW_MEMORY_BUILD === '1'
    ? { cpus: 1, webpackMemoryOptimizations: true }
    : {},
  // Keep Next's file tracing inside this standalone project, not the monorepo.
  outputFileTracingRoot: process.cwd(),
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
