import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

// 表格表
export const sheets = pgTable('sheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// 定义关系
export const sheetsRelations = relations(sheets, ({ one, many }) => ({
  user: one(users, {
    fields: [sheets.userId],
    references: [users.id],
  }),
  fields: many(fields),
  rows: many(rows),
}));

// 从 fields.ts 和 rows.ts 导入（稍后创建）
import { fields } from './fields';
import { rows } from './rows';
