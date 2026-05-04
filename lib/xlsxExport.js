/**
 * Excel 导出：唯一从 SQLite 行构建工作簿（与 /api/export?format=xlsx 一致）
 * 调用方须先对 db 执行 applyContentCategoriesToEmpty（与其它导出格式共用一次即可）
 */

const ExcelJS = require('exceljs');
const {
  classifyPoem,
  isBlankCategory,
  trimCategoryDisplay,
} = require('./autoClassifyCategory');
const { parseTags, publishYearDisplayFromTagList } = require('./poemTags');
const { resolveSubtitleDisplay } = require('./poemSubtitle');

const XLSX_CELL_MAX_CHARS = 32700;
const XLSX_SUBTITLE_MAX_CHARS = 500;

function truncateForXlsx(value) {
  const flat = String(value ?? '').replace(/\r\n/g, '\n').replace(/\n/g, ' ');
  if (flat.length <= XLSX_CELL_MAX_CHARS) return flat;
  return flat.slice(0, XLSX_CELL_MAX_CHARS) + '…';
}

/** 列定义（header + key 与 ExcelJS addRows 对象键一致） */
const XLSX_COLUMN_DEFS = [
  { header: '标题', key: 'title', width: 22 },
  { header: '副标题', key: 'subtitle', width: 28 },
  { header: '作者', key: 'author_name', width: 12 },
  { header: '朝代', key: 'dynasty', width: 8 },
  { header: '体裁', key: 'poetry_type', width: 10 },
  { header: '内容分类', key: 'category', width: 14 },
  { header: '发布年份', key: 'publish_year', width: 12 },
  { header: '标签', key: 'tags_all', width: 22 },
  { header: '备注', key: 'notes', width: 20 },
  { header: '内容', key: 'content', width: 50 },
];

/**
 * 从 DB 当前行构建一行 Excel 数据，并在仍为空白分类时写回 category（与 server 原逻辑一致）
 * @param {import('better-sqlite3').Database} db
 * @returns {Promise<Buffer>}
 */
async function buildXlsxBufferFromDb(db) {
  const poems = db.prepare('SELECT * FROM poems ORDER BY author_name, title').all();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('诗词');
  ws.columns = XLSX_COLUMN_DEFS;

  const persistCat = db.prepare('UPDATE poems SET category = ?, category_score = ? WHERE id = ?');
  const toPersist = [];
  const excelRows = poems.map((p) => {
    const tagsArr = parseTags(p.tags);
    const blank = isBlankCategory(p.category);
    const inferred = classifyPoem(p.title, p.content);
    const category =
      (blank ? trimCategoryDisplay(inferred.category) || '诗词文苑' : trimCategoryDisplay(p.category)) ||
      '诗词文苑';
    if (blank) toPersist.push({ id: p.id, c: category, s: inferred.score });
    const subtitleRaw = resolveSubtitleDisplay(p);
    const subtitle =
      subtitleRaw.length > XLSX_SUBTITLE_MAX_CHARS
        ? subtitleRaw.slice(0, XLSX_SUBTITLE_MAX_CHARS) + '…'
        : subtitleRaw;
    return {
      title: p.title ?? '',
      subtitle,
      author_name: p.author_name ?? '',
      dynasty: p.dynasty != null ? String(p.dynasty) : '',
      poetry_type: p.poetry_type != null ? String(p.poetry_type) : '',
      category,
      publish_year: publishYearDisplayFromTagList(tagsArr),
      tags_all: tagsArr.join('、'),
      notes: truncateForXlsx(p.notes || ''),
      content: truncateForXlsx(p.content),
    };
  });

  if (toPersist.length) {
    db.transaction(() => {
      for (const x of toPersist) persistCat.run(x.c, x.s, x.id);
    })();
  }

  ws.addRows(excelRows);
  return wb.xlsx.writeBuffer();
}

module.exports = {
  XLSX_COLUMN_DEFS,
  buildXlsxBufferFromDb,
  truncateForXlsx,
};
