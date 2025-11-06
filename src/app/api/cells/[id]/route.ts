import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cells, rows, fields, sheets } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';

// 更新单元格值
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: cellId } = await params;
    const body = await request.json();

    const { value } = body;

    // 获取单元格信息并验证所有权
    const [cell] = await db
      .select({
        cell: cells,
        sheetId: rows.sheetId,
        userId: sheets.userId,
      })
      .from(cells)
      .innerJoin(rows, eq(cells.rowId, rows.id))
      .innerJoin(sheets, eq(rows.sheetId, sheets.id))
      .where(eq(cells.id, cellId))
      .limit(1);

    if (!cell) {
      return NextResponse.json({ error: 'Cell not found' }, { status: 404 });
    }

    if (cell.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 更新单元格值
    const [updatedCell] = await db
      .update(cells)
      .set({
        value,
        updatedAt: new Date(),
      })
      .where(eq(cells.id, cellId))
      .returning();

    return NextResponse.json({ cell: updatedCell });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating cell:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
