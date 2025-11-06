import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Better Auth 会自动处理所有认证相关的请求
export const { GET, POST } = toNextJsHandler(auth);
