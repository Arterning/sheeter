import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rows, sheets } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';

// PATCH - 批量更新行的顺序
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // body 格式: { orders: [{ id: 'row-id-1', order: 0 }, { id: 'row-id-2', order: 1 }] }
    const { orders } = body as { orders: Array<{ id: string; order: number }> };

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // 验证用户是否拥有该表格
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(eq(sheets.id, id))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    if (sheet.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 批量更新行顺序
    for (const { id: rowId, order } of orders) {
      await db
        .update(rows)
        .set({ order, updatedAt: new Date() })
        .where(eq(rows.id, rowId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error reordering rows:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
