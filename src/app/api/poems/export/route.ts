import { NextRequest, NextResponse } from 'next/server';
import { getPoemById } from '@/lib/db';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',');
    const poems = [];

    for (const id of ids) {
      const poem = getPoemById(id.trim());
      if (poem) {
        poems.push(poem);
      }
    }

    if (poems.length === 0) {
      return NextResponse.json(
        { error: 'No poems found' },
        { status: 404 }
      );
    }

    // Create Word document
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: poems.length === 1 ? poems[0].title : '诗词合集',
            bold: true,
            size: 36
          })
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: 'center'
      })
    );

    // Metadata
    if (poems.length === 1) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `【${poems[0].author_name}】`,
              size: 28
            })
          ],
          alignment: 'center'
        })
      );

      if (poems[0].subtitle) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: poems[0].subtitle,
                size: 24
              })
            ],
            alignment: 'center'
          })
        );
      }
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `共 ${poems.length} 首诗词`,
              size: 24
            })
          ],
          alignment: 'center'
        })
      );
    }

    // Separator
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(30) })],
        alignment: 'center'
      })
    );

    // Add each poem
    for (let i = 0; i < poems.length; i++) {
      const poem = poems[i];

      // Poem title (if multiple)
      if (poems.length > 1) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${i + 1}. ${poem.title}`,
                bold: true,
                size: 28
              })
            ]
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `【${poem.author_name}】`,
                size: 22,
                color: '666666'
              })
            ]
          })
        );
      }

      // Poem content - each line as a paragraph
      const contentLines = poem.content.split('\n');
      for (const line of contentLines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: 26
                })
              ],
              alignment: 'center'
            })
          );
        }
      }

      // Separator between poems
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '─'.repeat(30) })],
          alignment: 'center'
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          children
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="poetry_export_${Date.now()}.docx"`
      }
    });
  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export poems' },
      { status: 500 }
    );
  }
}