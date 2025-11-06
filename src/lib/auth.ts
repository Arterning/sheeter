import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP 阶段暂时关闭邮箱验证
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 分钟
    },
  },
  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.AUTH_URL || 'http://localhost:3000',
});

export type Session = typeof auth.$Infer.Session;
