import type { NextConfig } from 'next';
import path from 'path';

/** Set NEXT_STATIC_EXPORT=true for S3 + CloudFront (CI or scripts/sync-portal). Docker keeps standalone. */
const staticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  transpilePackages: ['@grubpac/shared-types'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  ...(staticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : { output: 'standalone' }),
};

export default nextConfig;
