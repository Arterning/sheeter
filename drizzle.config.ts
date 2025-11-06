import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// 加载 .env.local 文件
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
