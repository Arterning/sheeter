import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets, fields, rows, cells } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq, and, inArray } from 'drizzle-orm';

// GET - 获取表格所有数据（数组对象格式）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetName: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId, sheetName } = await params;

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

    // 获取字段定义
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, sheet.id))
      .orderBy(fields.order);

    // 获取所有行
    const sheetRows = await db
      .select()
      .from(rows)
      .where(eq(rows.sheetId, sheet.id))
      .orderBy(rows.order);

    // 获取所有单元格
    const rowIds = sheetRows.map((r) => r.id);
    const sheetCells =
      rowIds.length > 0
        ? await db.select().from(cells).where(inArray(cells.rowId, rowIds))
        : [];

    // 转换为数组对象格式
    const data = sheetRows.map((row) => {
      const rowData: Record<string, any> = { _id: row.id };

      sheetFields.forEach((field) => {
        const cell = sheetCells.find(
          (c) => c.rowId === row.id && c.fieldId === field.id
        );
        rowData[field.name] = cell?.value ?? null;
      });

      return rowData;
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching sheet data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - 创建新记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; sheetName: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId, sheetName } = await params;
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

    // 获取字段定义
    const sheetFields = await db
      .select()
      .from(fields)
      .where(eq(fields.sheetId, sheet.id));

    // 获取当前最大的 order 值
    const existingRows = await db
      .select()
      .from(rows)
      .where(eq(rows.sheetId, sheet.id));
    const nextOrder = existingRows.length;

    // 创建新行
    const [newRow] = await db
      .insert(rows)
      .values({
        sheetId: sheet.id,
        order: nextOrder,
      })
      .returning();

    // 为新行创建单元格
    const cellValues = sheetFields.map((field) => ({
      rowId: newRow.id,
      fieldId: field.id,
      value: body[field.name] ?? null,
    }));

    if (cellValues.length > 0) {
      await db.insert(cells).values(cellValues);
    }

    // 返回创建的数据
    const result: Record<string, any> = { _id: newRow.id };
    sheetFields.forEach((field) => {
      result[field.name] = body[field.name] ?? null;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
