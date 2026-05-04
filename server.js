#!/usr/bin/env node
/**
 * poetry-app — Express + EJS server
 * Single entry point for Docker/Coolify deployment.
 */

const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const APP_DIR  = __dirname;
const DB_PATH  = process.env.DB_PATH  || path.join(APP_DIR, 'data', 'poetry.db');
const DATA_FILE = process.env.DATA_FILE || path.join(APP_DIR, 'poetry_data.json');
const { inferPoetryType } = require('./lib/inferPoetryType');
const { applyContentCategoriesToEmpty } = require('./lib/autoClassifyCategory');

// ── DB singleton ────────────────────────────────────────────────────────────────
let _db = null;

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Remove main DB file and SQLite WAL/SHM sidecars so a copy/replace is clean. */
function unlinkSqliteCluster(dbFilePath) {
  for (const extra of ['', '-wal', '-shm']) {
    const p = extra ? dbFilePath + extra : dbFilePath;
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) { /* ignore */ }
  }
}

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS poems (
        id TEXT PRIMARY KEY, author_name TEXT NOT NULL, title TEXT NOT NULL,
        subtitle TEXT DEFAULT "", content TEXT NOT NULL, dynasty TEXT DEFAULT "",
        poetry_type TEXT DEFAULT "", source TEXT DEFAULT "", tags TEXT DEFAULT "[]",
        notes TEXT DEFAULT "", category TEXT DEFAULT "", category_score REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
        poem_count INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_author_name ON poems(author_name);
      CREATE INDEX IF NOT EXISTS idx_tags        ON poems(tags);
      CREATE INDEX IF NOT EXISTS idx_title       ON poems(title);
      CREATE INDEX IF NOT EXISTS idx_category    ON poems(category);
    `);
  }
  return _db;
}

function parseTags(json) {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function rowToPoem(row) {
  return {
    ...row,
    tags:          parseTags(row.tags),
    subtitle:       row.subtitle    || '',
    dynasty:        row.dynasty     || '现代',
    poetry_type:    row.poetry_type || '诗',
    category:       row.category    || '',
    category_score: row.category_score || 0,
  };
}

/** Rebuild `authors` from `poems` (after import / delete). */
function syncAuthorCounts() {
  const db = getDb();
  db.prepare('DELETE FROM authors').run();
  const counts = db.prepare('SELECT author_name AS name, COUNT(*) AS c FROM poems GROUP BY author_name').all();
  const ins = db.prepare('INSERT INTO authors (id, name, poem_count) VALUES (?, ?, ?)');
  db.transaction(() => {
    for (const r of counts) ins.run(r.name, r.name, r.c);
  })();
}

function safeDecodePathParam(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function clampInt(value, fallback, min, max) {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const POETRY_TYPE_INFER_META_KEY = 'poetry_type_infer_v4';

/** 一次性为全库重写 poetry_type（词 / 曲 / 现代诗 / 诗等），不修改 category。 */
function runPoetryTypeInferenceIfNeeded() {
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS app_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
  const done = db.prepare('SELECT 1 FROM app_meta WHERE k = ?').get(POETRY_TYPE_INFER_META_KEY);
  if (done) return;

  const rows = db.prepare('SELECT id, title, content, dynasty, poetry_type FROM poems').all();
  const upd = db.prepare('UPDATE poems SET poetry_type = ? WHERE id = ?');
  db.transaction(() => {
    for (const row of rows) {
      upd.run(inferPoetryType(row), row.id);
    }
    db.prepare('INSERT OR REPLACE INTO app_meta (k, v) VALUES (?, ?)').run(POETRY_TYPE_INFER_META_KEY, '1');
  })();
  console.log(`[migrate] Reinferred poetry_type for ${rows.length} poems (${POETRY_TYPE_INFER_META_KEY}).`);
}

// ── Migrate: seed from JSON or copy best backup ──────────────────────────────
function migrate() {
  const db = getDb();

  const catCount = db.prepare("SELECT COUNT(*) as c FROM poems WHERE category != ''").get().c;
  if (catCount > 100) {
    console.log(`[migrate] DB already has ${catCount} categorized poems — using it.`);
    return;
  }

  // Check /app/poetry.db backup (from local dev with classified data)
  const backupPath = path.join(APP_DIR, 'poetry.db');
  if (backupPath !== DB_PATH && fs.existsSync(backupPath)) {
    try {
      const backup = new Database(backupPath, { readonly: true, timeout: 3000 });
      const backupCat = backup.prepare("SELECT COUNT(*) as c FROM poems WHERE category != ''").get().c;
      backup.close();
      if (backupCat > catCount) {
        console.log(`[migrate] Backup DB (${backupCat} cats) better than current (${catCount}) — copying over.`);
        closeDb();
        unlinkSqliteCluster(DB_PATH);
        fs.copyFileSync(backupPath, DB_PATH);
        _db = new Database(DB_PATH);
        _db.pragma('journal_mode = WAL');
        return;
      }
    } catch (_) { /* backup unreadable, fall through to JSON */ }
  }

  // Seed from JSON
  if (!fs.existsSync(DATA_FILE)) {
    console.warn('[migrate] No DB and no poetry_data.json — empty DB.');
    return;
  }
  const poems = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`[migrate] Seeding ${poems.length} poems from JSON into ${DB_PATH}…`);
  const insertPoem = db.prepare(`
    INSERT INTO poems (id,author_name,title,subtitle,content,dynasty,poetry_type,source,tags,notes,category,category_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const upsertAuthor = db.prepare(`
    INSERT INTO authors (id,name,poem_count) VALUES (?,?,?)
    ON CONFLICT(name) DO UPDATE SET poem_count=excluded.poem_count
  `);
  const authorCounts = {};
  const tx = db.transaction((rows) => {
    for (const p of rows) {
      const tags = ['2026'];
      if (Array.isArray(p.tags)) tags.push(...p.tags);
      insertPoem.run(
        p.id, p.author_name, p.title, p.subtitle||'', p.content,
        p.dynasty||'', p.poetry_type||'', p.source||'',
        JSON.stringify(tags), p.notes||'', p.category||'', p.category_score||0
      );
      authorCounts[p.author_name] = (authorCounts[p.author_name]||0) + 1;
    }
    for (const [name, count] of Object.entries(authorCounts)) {
      upsertAuthor.run(name, name, count);
    }
  });
  tx(poems);
  const total = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
  console.log(`[migrate] Done — ${total} poems, ${Object.keys(authorCounts).length} authors.`);
}

// Ensure DB parent directory exists (Docker volume mount or fresh clone)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

migrate();
runPoetryTypeInferenceIfNeeded();
const categoryFillCount = applyContentCategoriesToEmpty(getDb());
if (categoryFillCount > 0) {
  console.log(`[migrate] Auto-filled 内容分类 for ${categoryFillCount} poems (had blank category).`);
}

// ── Express App ───────────────────────────────────────────────────────────────
const app  = express();
const PORT  = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.static(path.join(APP_DIR, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(APP_DIR, 'views'));

const CATEGORIES = [
  '不忘初心','咏物寄情','情系河山','老龄心声','感事抒怀',
  '诗社撷英','曲赋雅韵','时代风云','刺玫瑰','七彩人生','诗词文苑','心香一瓣'
];

// ── API Routes ────────────────────────────────────────────────────────────────

app.get('/api/poems', (req, res) => {
  const db = getDb();
  const limit  = clampInt(req.query.limit, 100, 1, 500);
  const offset = clampInt(req.query.offset, 0, 0, 1_000_000);
  const author  = req.query.author;
  const rows = author
    ? db.prepare('SELECT * FROM poems WHERE author_name=? ORDER BY title LIMIT ? OFFSET ?').all(author, limit, offset)
    : db.prepare('SELECT * FROM poems ORDER BY author_name,id LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
  res.json({ poems: rows.map(rowToPoem), total, limit, offset });
});

app.get('/api/poems/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM poems WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToPoem(row));
});

app.get('/api/authors', (req, res) => {
  res.json({ authors: getDb().prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC').all() });
});

app.get('/api/categories', (req, res) => {
  const db = getDb();
  res.json({
    stats:      db.prepare(`SELECT category,COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all(),
    authors:     db.prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC').all(),
    totalPoems:  db.prepare('SELECT COUNT(*) as c FROM poems').get().c,
    categories:  CATEGORIES,
  });
});

app.get('/api/tags', (req, res) => {
  const db = getDb();
  const categories   = db.prepare(`SELECT category as name, COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all();
  const authors     = db.prepare(`SELECT author_name as name, COUNT(*) as count FROM poems GROUP BY author_name ORDER BY count DESC`).all();
  const poetryTypes = db.prepare(`SELECT poetry_type as name, COUNT(*) as count FROM poems GROUP BY poetry_type ORDER BY count DESC`).all();
  const dynasties   = db.prepare(`SELECT dynasty as name, COUNT(*) as count FROM poems GROUP BY dynasty ORDER BY count DESC`).all();
  const tagCounts = {};
  for (const row of db.prepare('SELECT tags FROM poems').all()) {
    for (const t of parseTags(row.tags)) tagCounts[t] = (tagCounts[t]||0) + 1;
  }
  const customTags = Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  res.json({ categories, authors, poetryTypes, dynasties, customTags });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q||'').trim();
  if (!q) return res.json({ poems: [] });
  const db = getDb();
  const pat = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM poems WHERE title LIKE ? OR content LIKE ? OR author_name LIKE ?
       OR tags LIKE ? OR category LIKE ? OR poetry_type LIKE ? OR dynasty LIKE ? OR subtitle LIKE ?
    ORDER BY author_name, title
  `).all(pat,pat,pat,pat,pat,pat,pat,pat);
  res.json({ poems: rows.map(rowToPoem) });
});

app.get('/api/export', async (req, res) => {
  try {
  const format = req.query.format || 'docx';
  const db = getDb();

  if (format === 'docx') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
    const poems = db.prepare('SELECT * FROM poems ORDER BY author_name, title').all();
    const children = poems.flatMap(p => [
      new Paragraph({ children: [new TextRun({ text: `${p.author_name} 《${p.title}》`, bold: true, size: 28 })], heading: HeadingLevel.HEADING_2 }),
      ...p.content.split('\n').filter(Boolean).map(l => new Paragraph({ children: [new TextRun(l)] })),
      new Paragraph({ children: [] }),
    ]);
    const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
    res.setHeader('Content-Disposition', 'attachment; filename="poetry.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return res.send(buf);
  }

  if (format === 'xlsx') {
    const XLSX_CELL_MAX_CHARS = 32700;
    const truncateForXlsx = (value) => {
      const flat = String(value ?? '').replace(/\r\n/g, '\n').replace(/\n/g, ' ');
      if (flat.length <= XLSX_CELL_MAX_CHARS) return flat;
      return flat.slice(0, XLSX_CELL_MAX_CHARS) + '…';
    };
    const ExcelJS = require('exceljs');
    const poems = db.prepare('SELECT * FROM poems ORDER BY author_name, title').all();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('诗词');
    ws.columns = [
      { header: '标题', key: 'title', width: 22 },
      { header: '副题', key: 'subtitle', width: 16 },
      { header: '作者', key: 'author_name', width: 12 },
      { header: '朝代', key: 'dynasty', width: 8 },
      { header: '体裁', key: 'poetry_type', width: 10 },
      { header: '内容分类', key: 'category', width: 14 },
      { header: '标签', key: 'tags_display', width: 18 },
      { header: '备注', key: 'notes', width: 20 },
      { header: '内容', key: 'content', width: 50 },
    ];
    ws.addRows(
      poems.map((p) => ({
        ...p,
        subtitle: p.subtitle || '',
        tags_display: parseTags(p.tags).join('、'),
        notes: truncateForXlsx(p.notes || ''),
        content: truncateForXlsx(p.content),
      }))
    );
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename="poetry.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  }

  if (format === 'byauthor') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
    const authors = db.prepare('SELECT name FROM authors ORDER BY name').all();
    const children = authors.flatMap(a => {
      const poems = db.prepare('SELECT * FROM poems WHERE author_name=? ORDER BY title').all(a.name);
      return [
        new Paragraph({ children: [new TextRun({ text: `${a.name} (${poems.length}首)`, bold: true, size: 32 })], heading: HeadingLevel.HEADING_1 }),
        ...poems.flatMap(p => [
          new Paragraph({ children: [new TextRun({ text: p.title, bold: true })] }),
          ...p.content.split('\n').filter(Boolean).map(l => new Paragraph({ children: [new TextRun(l)] })),
          new Paragraph({ children: [] }),
        ]),
      ];
    });
    const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
    res.setHeader('Content-Disposition', 'attachment; filename="poetry_by_author.docx"');
    return res.send(buf);
  }

  if (format === 'bycategory') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
    const children = CATEGORIES.flatMap(cat => {
      const poems = db.prepare('SELECT * FROM poems WHERE category=? ORDER BY author_name,title').all(cat);
      if (!poems.length) return [];
      return [
        new Paragraph({ children: [new TextRun({ text: `${cat} (${poems.length}首)`, bold: true, size: 32 })], heading: HeadingLevel.HEADING_1 }),
        ...poems.flatMap(p => [
          new Paragraph({ children: [new TextRun({ text: `${p.author_name} 《${p.title}》`, bold: true })] }),
          ...p.content.split('\n').filter(Boolean).map(l => new Paragraph({ children: [new TextRun(l)] })),
          new Paragraph({ children: [] }),
        ]),
      ];
    });
    const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
    res.setHeader('Content-Disposition', 'attachment; filename="poetry_by_category.docx"');
    return res.send(buf);
  }

  res.status(400).json({ error: 'Unknown format. Use: docx|xlsx|byauthor|bycategory' });
  } catch (err) {
    console.error('[api/export]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed', detail: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/poems/import', (req, res) => {
  const { poems } = req.body;
  if (!Array.isArray(poems)) return res.status(400).json({ error: 'poems array required' });
  const db = getDb();
  let imported = 0;
  const upsert = db.prepare(`
    INSERT INTO poems (id,author_name,title,subtitle,content,dynasty,poetry_type,source,tags,notes,category,category_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      author_name=excluded.author_name, title=excluded.title, subtitle=excluded.subtitle,
      content=excluded.content, dynasty=excluded.dynasty, poetry_type=excluded.poetry_type,
      source=excluded.source, tags=excluded.tags, notes=excluded.notes,
      category=excluded.category, category_score=excluded.category_score
  `);
  const tx = db.transaction((rows) => {
    for (const p of rows) {
      try {
        let tagsField;
        if (Array.isArray(p.tags)) tagsField = JSON.stringify(p.tags);
        else if (typeof p.tags === 'string') {
          try {
            JSON.parse(p.tags);
            tagsField = p.tags;
          } catch {
            tagsField = JSON.stringify([]);
          }
        } else tagsField = JSON.stringify([]);
        const inferredType = inferPoetryType({
          title: p.title,
          content: p.content || '',
          dynasty: p.dynasty || '',
          poetry_type: p.poetry_type || '',
        });
        upsert.run(p.id, p.author_name, p.title, p.subtitle||'', p.content,
          p.dynasty||'', inferredType, p.source||'',
          tagsField, p.notes||'', p.category||'', p.category_score||0);
        imported++;
      } catch (_) { /* skip row errors */ }
    }
  });
  tx(poems);
  syncAuthorCounts();
  res.json({ imported });
});

app.delete('/api/poems/:id', (req, res) => {
  const info = getDb().prepare('DELETE FROM poems WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  syncAuthorCounts();
  res.json({ ok: true });
});

// ── Page Routes ────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const db = getDb();
  const filterCategory = (req.query.category || '').trim();
  const filterPoetryType = (req.query.poetry_type || '').trim();
  const filterQ = (req.query.q || '').trim();

  let sql = 'SELECT * FROM poems WHERE 1=1';
  const params = [];
  if (filterCategory) {
    sql += ' AND category = ?';
    params.push(filterCategory);
  }
  if (filterPoetryType) {
    sql += ' AND poetry_type = ?';
    params.push(filterPoetryType);
  }
  if (filterQ) {
    const pat = `%${filterQ}%`;
    sql += ' AND (title LIKE ? OR content LIKE ? OR subtitle LIKE ? OR author_name LIKE ?)';
    params.push(pat, pat, pat, pat);
  }
  sql += ' ORDER BY author_name, id LIMIT 400';
  const poems = db.prepare(sql).all(...params);

  const authorCategories = db.prepare(
    `SELECT DISTINCT category AS v FROM poems WHERE TRIM(category) != '' ORDER BY category`
  ).all().map((r) => r.v);
  const authorPoetryTypes = db.prepare(
    `SELECT DISTINCT poetry_type AS v FROM poems WHERE TRIM(poetry_type) != '' ORDER BY poetry_type`
  ).all().map((r) => r.v);

  const authors = db.prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC').all();
  const stats = db.prepare(`SELECT category, COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all();
  const total = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
  res.render('index', {
    title: '爱国诗词集',
    authors,
    stats,
    poems: poems.map(rowToPoem),
    total,
    selectedAuthor: null,
    currentPage: 'home',
    headerBrandOnly: true,
    authorCategories,
    authorPoetryTypes,
    filterCategory,
    filterPoetryType,
    filterQ,
  });
});

app.get('/poems/:id', (req, res) => {
  const db = getDb();
  const poem = db.prepare('SELECT * FROM poems WHERE id=?').get(req.params.id);
  if (!poem) return res.status(404).render('404', { title: '404', message: '未找到该诗词' });
  res.render('poem', { title: rowToPoem(poem).title, poem: rowToPoem(poem) });
});

app.get('/author/:name', (req, res) => {
  const db = getDb();
  const authorName = safeDecodePathParam(req.params.name);
  const authorRow = db.prepare('SELECT name, poem_count FROM authors WHERE name=?').get(authorName);
  if (!authorRow) return res.status(404).render('404', { title: '404', message: '作者未找到' });

  const filterCategory = (req.query.category || '').trim();
  const filterPoetryType = (req.query.poetry_type || '').trim();
  const filterQ = (req.query.q || '').trim();

  let sql = 'SELECT * FROM poems WHERE author_name = ?';
  const params = [authorName];
  if (filterCategory) {
    sql += ' AND category = ?';
    params.push(filterCategory);
  }
  if (filterPoetryType) {
    sql += ' AND poetry_type = ?';
    params.push(filterPoetryType);
  }
  if (filterQ) {
    const pat = `%${filterQ}%`;
    sql += ' AND (title LIKE ? OR content LIKE ? OR subtitle LIKE ?)';
    params.push(pat, pat, pat);
  }
  sql += ' ORDER BY title';
  const poems = db.prepare(sql).all(...params);

  const authorCategories = db.prepare(
    `SELECT DISTINCT category AS v FROM poems WHERE author_name = ? AND TRIM(category) != '' ORDER BY category`
  ).all(authorName).map((r) => r.v);
  const authorPoetryTypes = db.prepare(
    `SELECT DISTINCT poetry_type AS v FROM poems WHERE author_name = ? AND TRIM(poetry_type) != '' ORDER BY poetry_type`
  ).all(authorName).map((r) => r.v);

  const authors = db.prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC').all();
  const stats = db.prepare(`SELECT category, COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all();
  const total = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
  res.render('index', {
    title: authorName,
    author: authorRow,
    authors,
    stats,
    poems: poems.map(rowToPoem),
    total,
    selectedAuthor: authorName,
    currentPage: 'home',
    headerBrandOnly: false,
    authorCategories,
    authorPoetryTypes,
    filterCategory,
    filterPoetryType,
    filterQ,
  });
});

app.get('/search', (req, res) => {
  const q = (req.query.q||'').trim();
  if (!q) return res.render('search', { title:'搜索', poems:[], query:'', currentPage:'home' });
  const db = getDb();
  const pat = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM poems WHERE title LIKE ? OR content LIKE ? OR author_name LIKE ?
       OR tags LIKE ? OR category LIKE ? OR poetry_type LIKE ? OR dynasty LIKE ? OR subtitle LIKE ?
    ORDER BY author_name, title
  `).all(pat,pat,pat,pat,pat,pat,pat,pat);
  res.render('search', { title:`搜索: ${q}`, poems: rows.map(rowToPoem), query: q, currentPage:'home' });
});

app.get('/categories', (req, res) => {
  const db = getDb();
  const stats      = db.prepare(`SELECT category, COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all();
  const authors    = db.prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC').all();
  const totalPoems = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
  res.render('categories', { title:'数据可视化', stats, authors, totalPoems, currentPage:'categories' });
});

app.get('/tags', (req, res) => {
  const db = getDb();
  const categories   = db.prepare(`SELECT category as name, COUNT(*) as count FROM poems WHERE category!='' GROUP BY category ORDER BY count DESC`).all();
  const authors     = db.prepare(`SELECT author_name as name, COUNT(*) as count FROM poems GROUP BY author_name ORDER BY count DESC`).all();
  const poetryTypes = db.prepare(`SELECT poetry_type as name, COUNT(*) as count FROM poems GROUP BY poetry_type ORDER BY count DESC`).all();
  const tagCounts = {};
  for (const row of db.prepare('SELECT tags FROM poems').all()) {
    for (const t of parseTags(row.tags)) tagCounts[t] = (tagCounts[t]||0) + 1;
  }
  const customTags = Object.entries(tagCounts).map(([n,c]) => ({ name:n, count:c })).sort((a,b) => b.count-a.count);
  res.render('tags', { title:'标签管理', categories, authors, poetryTypes, customTags, currentPage:'tags' });
});

app.use((req, res) => res.status(404).render('404', { title:'404' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] poetry-app running at http://0.0.0.0:${PORT}  DB=${DB_PATH}`);
});