import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPoemsByAuthor, getPoemsByCategory, CATEGORIES } from '@/lib/db';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';

function normalizePoemRows(rows: any[]): any[] {
  return rows.map((p: any) => ({
    ...p,
    tags: p.tags ? JSON.parse(p.tags) : []
  }));
}

function groupPoemsByCategory(poems: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const poem of poems) {
    const cat = (poem.category && String(poem.category).trim()) || '未分类';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(poem);
  }
  return map;
}

function sortedCategoryKeys(groups: Map<string, any[]>): string[] {
  const keys = [...groups.keys()];
  const known = CATEGORIES.filter((c) => keys.includes(c));
  const rest = keys
    .filter((k) => !CATEGORIES.includes(k as (typeof CATEGORIES)[number]) && k !== '未分类')
    .sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  const ordered = [...known, ...rest];
  if (keys.includes('未分类')) ordered.push('未分类');
  return ordered;
}

function sanitizeExcelSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').trim() || 'Sheet';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

function uniqueExcelSheetName(categoryLabel: string, used: Set<string>): string {
  let base = sanitizeExcelSheetName(categoryLabel);
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = `_${n}`;
    const maxBase = 31 - suffix.length;
    candidate = (base.slice(0, Math.max(1, maxBase)) + suffix).slice(0, 31);
    n++;
  }
  used.add(candidate);
  return candidate;
}

function poemRowsForExcel(poems: any[]) {
  return poems.map((poem: any, index: number) => ({
    序号: index + 1,
    作者: poem.author_name,
    标题: poem.title,
    副标题: poem.subtitle || '',
    分类: poem.category || '',
    类型: poem.poetry_type || '诗',
    朝代: poem.dynasty || '现代',
    标签: Array.isArray(poem.tags) ? poem.tags.join(', ') : '',
    得分: poem.category_score || 0,
    来源: poem.source || '',
    内容: poem.content.replace(/\n/g, ' ')
  }));
}

const EXCEL_COL_WIDTHS = [
  { wch: 6 },
  { wch: 10 },
  { wch: 20 },
  { wch: 15 },
  { wch: 10 },
  { wch: 6 },
  { wch: 6 },
  { wch: 10 },
  { wch: 6 },
  { wch: 15 },
  { wch: 50 }
];

function appendPoemsByAuthorToDoc(children: Paragraph[], poems: any[], startIndex: number): number {
  const byAuthor = poems.reduce((acc: Record<string, any[]>, poem: any) => {
    const authorName = poem.author_name;
    if (!acc[authorName]) acc[authorName] = [];
    acc[authorName].push(poem);
    return acc;
  }, {});

  let poemIndex = startIndex;
  for (const [authorName, authorPoems] of Object.entries(byAuthor)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `【${authorName}】`, bold: true, size: 28, color: '0066cc' })],
        spacing: { before: 400 }
      })
    );

    for (const poem of authorPoems as any[]) {
      const titleText = poem.subtitle ? `${poem.title}——${poem.subtitle}` : poem.title;

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${poemIndex}. ${titleText}`, bold: true, size: 26 })],
          spacing: { before: 200 }
        })
      );

      if (poem.category) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${poem.category}]`, size: 20, color: '888888', italics: true })
            ]
          })
        );
      }

      const contentLines = poem.content.split('\n');
      for (const line of contentLines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line.trim(), size: 24 })],
              alignment: 'center'
            })
          );
        }
      }

      if (poem.tags && poem.tags.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `标签: ${poem.tags.join(', ')}`, size: 18, color: '666666' })
            ]
          })
        );
      }

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '─'.repeat(25), color: 'cccccc' })],
          alignment: 'center'
        })
      );

      poemIndex++;
    }
  }
  return poemIndex;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exportType = searchParams.get('type') || 'word';
    const exportFormat = searchParams.get('format') || 'all';
    const author = searchParams.get('author');
    const category = searchParams.get('category');

    const db = getDb();

    let poems: any[] = [];
    let filename = 'poetry_export';

    if (author) {
      poems = getPoemsByAuthor(author);
      filename = `${author}_诗词`;
    } else if (category) {
      poems = getPoemsByCategory(category);
      filename = `${category}_诗词`;
    } else {
      poems = db.prepare('SELECT * FROM poems ORDER BY author_name, title').all();
      filename = '全部诗词';
    }

    if (poems.length === 0) {
      return NextResponse.json({ error: 'No poems to export' }, { status: 404 });
    }

    poems = normalizePoemRows(poems);

    const useCategoryFormat =
      exportFormat === 'categories' && !author && !category;

    if (useCategoryFormat) {
      filename = '诗词按分类';
    }

    if (exportType === 'excel') {
      if (useCategoryFormat) {
        return exportExcelByCategory(poems, filename);
      }
      return exportExcel(poems, filename);
    } else {
      if (useCategoryFormat) {
        return exportWordByCategory(poems, filename);
      }
      return exportWord(poems, filename);
    }
  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export poems' },
      { status: 500 }
    );
  }
}

async function exportWord(poems: any[], filename: string) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: filename, bold: true, size: 36 })],
      heading: HeadingLevel.HEADING_1,
      alignment: 'center'
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `共 ${poems.length} 首诗词`, size: 24 })],
      alignment: 'center'
    })
  );

  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

  appendPoemsByAuthorToDoc(children, poems, 1);

  const doc = new Document({
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8Array = new Uint8Array(buffer);

  return new Response(uint8Array, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`
    }
  });
}

async function exportWordByCategory(poems: any[], filename: string) {
  const children: Paragraph[] = [];
  const groups = groupPoemsByCategory(poems);
  const keys = sortedCategoryKeys(groups);

  children.push(
    new Paragraph({
      children: [new TextRun({ text: filename, bold: true, size: 36 })],
      heading: HeadingLevel.HEADING_1,
      alignment: 'center'
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `共 ${poems.length} 首诗词 · 按 ${keys.length} 个分类编排`, size: 24 })],
      alignment: 'center'
    })
  );

  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

  let poemIndex = 1;
  for (const cat of keys) {
    const list = groups.get(cat)!;
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `━━ ${cat}（${list.length} 首）━━`, bold: true, size: 28, color: '333333' })
        ],
        spacing: { before: 400 }
      })
    );
    poemIndex = appendPoemsByAuthorToDoc(children, list, poemIndex);
  }

  const doc = new Document({
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8Array = new Uint8Array(buffer);

  return new Response(uint8Array, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`
    }
  });
}

function exportExcel(poems: any[], filename: string) {
  const data = poemRowsForExcel(poems);
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = EXCEL_COL_WIDTHS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '诗词');

  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const uint8Array = new Uint8Array(excelBuffer);

  return new Response(uint8Array, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`
    }
  });
}

function exportExcelByCategory(poems: any[], filename: string) {
  const workbook = XLSX.utils.book_new();
  const groups = groupPoemsByCategory(poems);
  const keys = sortedCategoryKeys(groups);
  const usedSheetNames = new Set<string>();

  for (const cat of keys) {
    const list = groups.get(cat)!;
    const data = poemRowsForExcel(list);
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = EXCEL_COL_WIDTHS;
    const sheetName = uniqueExcelSheetName(cat, usedSheetNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const uint8Array = new Uint8Array(excelBuffer);

  return new Response(uint8Array, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`
    }
  });
}