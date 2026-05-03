import { NextResponse } from 'next/server';
import { getCategoryStats, getAllAuthors, getPoemCount } from '@/lib/db';

export async function GET() {
  try {
    const stats = getCategoryStats();
    const authors = getAllAuthors();
    const totalPoems = getPoemCount();

    // Build category by author matrix
    const categoryByAuthor: Record<string, Record<string, number>> = {};
    for (const author of authors) {
      categoryByAuthor[author.name] = {};
    }

    // Get poems grouped by author and category
    const db = require('@/lib/db').getDb();
    const poems = db.prepare("SELECT author_name, category FROM poems WHERE category != '' AND category IS NOT NULL").all() as any[];

    for (const poem of poems) {
      if (categoryByAuthor[poem.author_name]) {
        categoryByAuthor[poem.author_name][poem.category] =
          (categoryByAuthor[poem.author_name][poem.category] || 0) + 1;
      }
    }

    return NextResponse.json({
      stats,
      authors,
      totalPoems,
      categoryByAuthor,
      categories: [
        '不忘初心', '咏物寄情', '情系河山', '老龄心声',
        '感事抒怀', '诗社撷英', '曲赋雅韵', '时代风云',
        '刺玫瑰', '七彩人生', '诗词文苑', '心香一瓣'
      ]
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category stats' },
      { status: 500 }
    );
  }
}