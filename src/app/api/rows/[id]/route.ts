import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rows, sheets } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';

// 删除行
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: rowId } = await params;

    // 获取行信息并验证所有权
    const [row] = await db
      .select({
        row: rows,
        sheetId: rows.sheetId,
        userId: sheets.userId,
      })
      .from(rows)
      .innerJoin(sheets, eq(rows.sheetId, sheets.id))
      .where(eq(rows.id, rowId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    if (row.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 删除行（级联删除单元格）
    await db.delete(rows).where(eq(rows.id, rowId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting row:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
