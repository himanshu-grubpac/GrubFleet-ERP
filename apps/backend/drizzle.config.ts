import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.development') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp',
  },
  strict: true,
  verbose: true,
});
