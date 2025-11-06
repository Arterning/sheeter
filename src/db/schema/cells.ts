import { pgTable, timestamp, uuid, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { rows } from './rows';
import { fields } from './fields';

// 单元格值类型
export type CellValue = string | number | string[] | null;

// 单元格表
export const cells = pgTable(
  'cells',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rowId: uuid('row_id')
      .notNull()
      .references(() => rows.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    value: jsonb('value').$type<CellValue>(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    // 确保每个单元格（行+字段）组合唯一
    uniqueRowField: unique().on(table.rowId, table.fieldId),
  })
);

// 定义关系
export const cellsRelations = relations(cells, ({ one }) => ({
  row: one(rows, {
    fields: [cells.rowId],
    references: [rows.id],
  }),
  field: one(fields, {
    fields: [cells.fieldId],
    references: [fields.id],
  }),
}));
