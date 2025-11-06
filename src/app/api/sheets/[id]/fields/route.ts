import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets, fields, type FieldType } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and, max } from 'drizzle-orm';

// 创建新字段
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sheetId } = await params;
    const body = await request.json();

    // 验证表格所有权
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.id, sheetId), eq(sheets.userId, user.id)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    const { name, type, options } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 获取当前最大的 order 值
    const [maxOrderResult] = await db
      .select({ maxOrder: max(fields.order) })
      .from(fields)
      .where(eq(fields.sheetId, sheetId));

    const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

    const [newField] = await db
      .insert(fields)
      .values({
        sheetId,
        name,
        type: (type as FieldType) || 'text',
        options: options || null,
        order: nextOrder,
      })
      .returning();

    return NextResponse.json({ field: newField }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
