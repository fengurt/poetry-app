import { NextResponse } from 'next/server';
import { getAllMetadataTags } from '@/lib/db';

export async function GET() {
  try {
    const data = getAllMetadataTags();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}