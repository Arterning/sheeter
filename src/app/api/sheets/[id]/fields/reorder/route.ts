import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { fields, sheets } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';

// PATCH - 批量更新字段的顺序
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // body 格式: { orders: [{ id: 'field-id-1', order: 0 }, { id: 'field-id-2', order: 1 }] }
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

    // 批量更新字段顺序
    for (const { id: fieldId, order } of orders) {
      await db
        .update(fields)
        .set({ order, updatedAt: new Date() })
        .where(eq(fields.id, fieldId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error reordering fields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
