import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sheets } from '@/db/schema';
import { requireAuth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';

// 获取当前用户的所有表格
export async function GET() {
  try {
    const user = await requireAuth();

    const userSheets = await db
      .select()
      .from(sheets)
      .where(eq(sheets.userId, user.id))
      .orderBy(sheets.createdAt);

    return NextResponse.json({ sheets: userSheets });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 创建新表格
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const [newSheet] = await db
      .insert(sheets)
      .values({
        name,
        description: description || null,
        userId: user.id,
      })
      .returning();

    return NextResponse.json({ sheet: newSheet }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating sheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
