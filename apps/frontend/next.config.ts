import type { NextConfig } from 'next';
import path from 'path';

/** Set NEXT_STATIC_EXPORT=true for S3 + CloudFront (CI or scripts/sync-portal). Docker keeps standalone. */
const staticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  transpilePackages: ['@grubpac/shared-types', '@grubpac/validation'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  /** Client bundles read this at runtime; must match `trailingSlash` when static export. */
  env: {
    NEXT_PUBLIC_PORTAL_TRAILING_SLASH: staticExport ? 'true' : 'false',
  },
  ...(staticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : { output: 'standalone' }),
};

export default nextConfig;
