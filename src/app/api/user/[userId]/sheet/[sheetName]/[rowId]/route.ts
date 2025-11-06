import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets, fields, rows, cells } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';

// GET - 获取单条记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetName: string; rowId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId, sheetName, rowId } = await params;

    // 验证用户权限
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 根据名称和用户查找表格
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.name, sheetName), eq(sheets.userId, userId)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 验证行是否属于该表格
    const [row] = await db
      .select()
      .from(rows)
      .where(and(eq(rows.id, rowId), eq(rows.sheetId, sheet.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // 获取字段定义
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, sheet.id))
      .orderBy(fields.order);

    // 获取该行的所有单元格
    const sheetCells = await db
      .select()
      .from(cells)
      .where(eq(cells.rowId, rowId));

    // 构建返回数据
    const result: Record<string, any> = { _id: row.id };
    sheetFields.forEach((field) => {
      const cell = sheetCells.find((c) => c.fieldId === field.id);
      result[field.name] = cell?.value ?? null;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - 更新记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetName: string; rowId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId, sheetName, rowId } = await params;
    const body = await request.json();

    // 验证用户权限
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 根据名称和用户查找表格
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.name, sheetName), eq(sheets.userId, userId)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 验证行是否属于该表格
    const [row] = await db
      .select()
      .from(rows)
      .where(and(eq(rows.id, rowId), eq(rows.sheetId, sheet.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // 获取字段定义
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, sheet.id));

    // 更新每个字段对应的单元格
    for (const field of sheetFields) {
      if (field.name in body) {
        // 查找该单元格
        const [existingCell] = await db
          .select()
          .from(cells)
          .where(and(eq(cells.rowId, rowId), eq(cells.fieldId, field.id)))
          .limit(1);

        if (existingCell) {
          // 更新现有单元格
          await db
            .update(cells)
            .set({ value: body[field.name], updatedAt: new Date() })
            .where(eq(cells.id, existingCell.id));
        } else {
          // 创建新单元格
          await db.insert(cells).values({
            rowId,
            fieldId: field.id,
            value: body[field.name],
          });
        }
      }
    }

    // 返回更新后的数据
    const updatedCells = await db
      .select()
      .from(cells)
      .where(eq(cells.rowId, rowId));

    const result: Record<string, any> = { _id: row.id };
    sheetFields.forEach((field) => {
      const cell = updatedCells.find((c) => c.fieldId === field.id);
      result[field.name] = cell?.value ?? null;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - 删除记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetName: string; rowId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId, sheetName, rowId } = await params;

    // 验证用户权限
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 根据名称和用户查找表格
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(eq(sheets.name, sheetName), eq(sheets.userId, userId)))
      .limit(1);

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 验证行是否属于该表格
    const [row] = await db
      .select()
      .from(rows)
      .where(and(eq(rows.id, rowId), eq(rows.sheetId, sheet.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // 删除行（级联删除单元格）
    await db.delete(rows).where(eq(rows.id, rowId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
