import { NextRequest, NextResponse } from 'next/server';
import { getAllAuthors } from '@/lib/db';

export async function GET() {
  try {
    const authors = getAllAuthors();
    return NextResponse.json({ authors });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authors' },
      { status: 500 }
    );
  }
}