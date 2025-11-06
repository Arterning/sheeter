import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * 获取当前已登录用户的会话信息
 * 在服务器端 API 路由中使用
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

/**
 * 要求用户必须登录，否则抛出错误
 */
export async function requireAuth() {
  const session = await getCurrentUser();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return session.user;
}
