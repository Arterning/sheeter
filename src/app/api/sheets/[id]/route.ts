import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets, fields, rows, cells } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';

// 获取特定表格的详细信息（包括字段和数据）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // 获取表格信息
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 获取所有字段
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, id))
      .orderBy(fields.order);

    // 获取所有行
    const sheetRows = await db
      .select()
      .from(rows)
      .where(eq(rows.sheetId, id))
      .orderBy(rows.order);

    // 获取所有单元格数据
    const sheetCells = await db
      .select()
      .from(cells)
      .where(
        eq(
          cells.rowId,
          db.select({ id: rows.id }).from(rows).where(eq(rows.sheetId, id)) as any
        )
      );

    return NextResponse.json({
      sheet,
      fields: sheetFields,
      rows: sheetRows,
      cells: sheetCells,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching sheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 更新表格信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { name, description } = body;

    // 验证表格所有权
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    const [updatedSheet] = await db
      .update(sheets)
      .set({
        name: name || sheet.name,
        description: description !== undefined ? description : sheet.description,
        updatedAt: new Date(),
      })
      .where(eq(sheets.id, id))
      .returning();

    return NextResponse.json({ sheet: updatedSheet });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating sheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 删除表格
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // 验证表格所有权
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 删除表格（级联删除字段、行和单元格）
    await db.delete(sheets).where(eq(sheets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting sheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
