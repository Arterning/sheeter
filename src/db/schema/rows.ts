import { pgTable, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sheets } from './sheets';

// 行表
export const rows = pgTable('rows', {
  id: uuid('id').primaryKey().defaultRandom(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => sheets.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// 定义关系
export const rowsRelations = relations(rows, ({ one, many }) => ({
  sheet: one(sheets, {
    fields: [rows.sheetId],
    references: [sheets.id],
  }),
  cells: many(cells),
}));

// 从 cells.ts 导入（稍后创建）
import { cells } from './cells';
