import { NextRequest, NextResponse } from 'next/server';
import { getAllPoems, getPoemById, searchPoems, getPoemsByAuthor, getPoemCount } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const author = searchParams.get('author');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 搜索模式
    if (query) {
      const results = searchPoems(query);
      return NextResponse.json({
        poems: results,
        total: results.length,
        query
      });
    }

    // 按作者筛选
    if (author) {
      const results = getPoemsByAuthor(author);
      return NextResponse.json({
        poems: results,
        total: results.length,
        author
      });
    }

    // 获取全部（分页）
    const poems = getAllPoems(limit, offset);
    const total = getPoemCount();

    return NextResponse.json({
      poems,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch poems' },
      { status: 500 }
    );
  }
}