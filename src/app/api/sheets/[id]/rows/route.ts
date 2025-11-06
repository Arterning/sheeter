import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets, rows, cells, fields } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and, max } from 'drizzle-orm';

// 创建新行
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sheetId } = await params;

    // 验证表格所有权
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.id, sheetId), eq(sheets.userId, user.id)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 获取当前最大的 order 值
    const [maxOrderResult] = await db
      .select({ maxOrder: max(rows.order) })
      .from(rows)
      .where(eq(rows.sheetId, sheetId));

    const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

    // 创建新行
    const [newRow] = await db
      .insert(rows)
      .values({
        sheetId,
        order: nextOrder,
      })
      .returning();

    // 为新行创建所有字段的空单元格
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, sheetId));

    if (sheetFields.length > 0) {
      await db.insert(cells).values(
        sheetFields.map((field) => ({
          rowId: newRow.id,
          fieldId: field.id,
          value: null,
        }))
      );
    }

    return NextResponse.json({ row: newRow }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating row:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
