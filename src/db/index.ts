import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 创建数据库连接
const connectionString = process.env.DATABASE_URL!;

// 创建 postgres 客户端
export const client = postgres(connectionString);

// 创建 drizzle 实例
export const db = drizzle(client, { schema });
