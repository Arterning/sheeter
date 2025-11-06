import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sheets } from './sheets';

// 字段类型枚举
export const fieldTypes = [
  'text',         // 单行文本
  'longText',     // 多行文本
  'number',       // 数字
  'select',       // 单选
  'multiSelect',  // 多选
  'date',         // 日期
  'datetime',     // 日期时间
] as const;

export type FieldType = (typeof fieldTypes)[number];

// 字段选项接口
export interface FieldOptions {
  choices?: string[]; // 用于 select 和 multiSelect
  numberFormat?: {    // 用于 number
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
  dateFormat?: string; // 用于 date 和 datetime
}

// 字段表
export const fields = pgTable('fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => sheets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().$type<FieldType>().default('text'),
  options: jsonb('options').$type<FieldOptions>(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// 定义关系
export const fieldsRelations = relations(fields, ({ one, many }) => ({
  sheet: one(sheets, {
    fields: [fields.sheetId],
    references: [sheets.id],
  }),
  cells: many(cells),
}));

// 从 cells.ts 导入（稍后创建）
import { cells } from './cells';
