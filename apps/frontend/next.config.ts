import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@grubpac/shared-types'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  output: 'standalone',
};

export default nextConfig;
