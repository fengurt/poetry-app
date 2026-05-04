#!/usr/bin/env node
/**
 * 校验 Excel 导出：数据经 lib/xlsxExport.js 唯一构建，读回单元格与 DB 预期一致。
 * 运行：node scripts/test-xlsx-export.js
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const { applyContentCategoriesToEmpty } = require('../lib/autoClassifyCategory');
const { buildXlsxBufferFromDb, XLSX_COLUMN_DEFS } = require('../lib/xlsxExport');

const DDL = `
  CREATE TABLE poems (
    id TEXT PRIMARY KEY, author_name TEXT NOT NULL, title TEXT NOT NULL,
    subtitle TEXT DEFAULT "", content TEXT NOT NULL, dynasty TEXT DEFAULT "",
    poetry_type TEXT DEFAULT "", source TEXT DEFAULT "", tags TEXT DEFAULT "[]",
    notes TEXT DEFAULT "", category TEXT DEFAULT "", category_score REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

function colIndexByKey(key) {
  const i = XLSX_COLUMN_DEFS.findIndex((c) => c.key === key);
  assert(i >= 0, 'unknown column key ' + key);
  return i + 1;
}

async function main() {
  const db = new Database(':memory:');
  db.exec(DDL);

  const longBody = '行\n'.repeat(20000);
  db.prepare(
    `INSERT INTO poems (id, author_name, title, subtitle, content, dynasty, poetry_type, tags, notes, category)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    'p1',
    '李白',
    '沁园春',
    '副',
    '雪',
    '唐',
    '词',
    '["2026","手稿"]',
    '短注',
    ''
  );
  db.prepare(
    `INSERT INTO poems (id, author_name, title, content, dynasty, poetry_type, tags, notes, category)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run('p2', '杜甫', '无题', '春望', '唐', '诗', '["2025"]', '', '\u3000');

  db.prepare(
    `INSERT INTO poems (id, author_name, title, content, dynasty, poetry_type, tags, notes, category)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run('p3', '王维', '长文', longBody, '唐', '诗', '["2026"]', 'n', '');

  db.prepare(
    `INSERT INTO poems (id, author_name, title, subtitle, content, dynasty, poetry_type, tags, notes, category)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    'p4',
    '张三',
    '建党颂',
    '',
    '——庆祝中国共产党成立104周年\n乘风破浪百四载，站起富起强起来。',
    '现代',
    '诗',
    '["2026"]',
    '',
    ''
  );

  applyContentCategoriesToEmpty(db);
  const buf = await buildXlsxBufferFromDb(db);

  const rows = await readDataRows(buf, 4);
  assert.strictEqual(rows.length, 4, 'expect 4 data rows');

  const r1 = rows.find((r) => r.title === '沁园春');
  assert(r1, 'row 沁园春');
  assert(r1.category && r1.category.length > 0, '内容分类非空: ' + r1.category);
  assert.strictEqual(r1.publish_year, '2026', '发布年份');
  assert(r1.tags_all.includes('2026') && r1.tags_all.includes('手稿'), '标签: ' + r1.tags_all);
  assert.strictEqual(r1.subtitle, '副', '副题');
  assert.strictEqual(r1.author_name, '李白', '作者');

  const r2 = rows.find((r) => r.title === '无题');
  assert(r2 && r2.category && r2.category.length > 0, '全角空白 category 应已推断: ' + (r2 && r2.category));

  const r3 = rows.find((r) => r.title === '长文');
  assert(r3 && r3.content.length <= 32701, '超长正文应截断 len=' + (r3 && r3.content.length));
  assert(r3.content.endsWith('…'), '截断以…结尾');

  const p1db = db.prepare('SELECT category FROM poems WHERE id=?').get('p1');
  assert(p1db.category && p1db.category.length > 0, '导出后 DB 应有 category');

  const r4 = rows.find((r) => r.title === '建党颂');
  assert(r4, 'row 建党颂');
  assert.strictEqual(
    r4.subtitle,
    '——庆祝中国共产党成立104周年',
    'subtitle 列为空时从正文首行题记推断副标题'
  );

  console.log('ok: xlsx export rows match expectations (single builder lib/xlsxExport.js)');
}

async function readDataRows(buf, expectedCount) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const out = [];
  for (let r = 2; r < 2 + expectedCount; r++) {
    const row = ws.getRow(r);
    const o = {};
    for (const def of XLSX_COLUMN_DEFS) {
      const cell = row.getCell(colIndexByKey(def.key));
      const v = cell.value;
      o[def.key] = v == null ? '' : typeof v === 'object' && v.text != null ? v.text : String(v);
    }
    out.push(o);
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
