import { NextRequest, NextResponse } from 'next/server';
import { importPoems } from '@/lib/db';
import { Poem } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const poems = body.poems as Poem[];

    if (!Array.isArray(poems) || poems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid poems data' },
        { status: 400 }
      );
    }

    const count = importPoems(poems);

    return NextResponse.json({
      success: true,
      imported: count,
      total: poems.length
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to import poems' },
      { status: 500 }
    );
  }
}