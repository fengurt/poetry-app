#!/usr/bin/env node
/**
 * 导入诗词数据到SQLite数据库
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 使用绝对路径
const SCRIPT_DIR = '/Users/af/cpro01/ksaclaude01/mamapoems999/poetry-app';
const DB_PATH = path.join(SCRIPT_DIR, 'poetry.db');
const JSON_PATH = '/Users/af/cpro01/ksaclaude01/mamapoems999/poetry_data.json';

// 读取JSON数据
const poemsData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

console.log(`读取到 ${poemsData.length} 首诗词`);

// 连接数据库
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS poems (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    content TEXT NOT NULL,
    dynasty TEXT DEFAULT '现代',
    poetry_type TEXT DEFAULT '诗',
    source TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    category TEXT DEFAULT '',
    category_score REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    poem_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_author_name ON poems(author_name);
  CREATE INDEX IF NOT EXISTS idx_tags ON poems(tags);
  CREATE INDEX IF NOT EXISTS idx_title ON poems(title);
  CREATE INDEX IF NOT EXISTS idx_category ON poems(category);
`);

// 清空现有数据
db.exec('DELETE FROM poems');
db.exec('DELETE FROM authors');

// 插入诗词
const insertStmt = db.prepare(`
  INSERT INTO poems (id, author_name, title, subtitle, content, dynasty, poetry_type, source, tags, notes, category, category_score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateAuthorStmt = db.prepare(`
  INSERT INTO authors (id, name, poem_count)
  VALUES (?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET poem_count = ?
`);

for (let i = 0; i < poemsData.length; i++) {
  const poem = poemsData[i];
  // Default tags include '2026'
  const tags = ['2026'];
  if (poem.tags && Array.isArray(poem.tags)) {
    tags.push(...poem.tags);
  }
  insertStmt.run(
    poem.id,
    poem.author_name,
    poem.title,
    poem.subtitle || '',
    poem.content,
    poem.dynasty || '现代',
    poem.poetry_type || '诗',
    poem.source || '',
    JSON.stringify(tags),
    poem.notes || '',
    poem.category || '',
    poem.category_score || 0
  );

  if ((i + 1) % 100 === 0) {
    console.log(`已导入 ${i + 1} 首诗词...`);
  }
}

// 更新作者统计
const authors = {};
for (const poem of poemsData) {
  authors[poem.author_name] = (authors[poem.author_name] || 0) + 1;
}

for (const [name, count] of Object.entries(authors)) {
  updateAuthorStmt.run(name, name, count, count);
}

console.log('导入完成！');

// 验证
const totalPoems = db.prepare('SELECT COUNT(*) as count FROM poems').get();
const totalAuthors = db.prepare('SELECT COUNT(*) as count FROM authors').get();

console.log(`诗词总数: ${totalPoems.count}`);
console.log(`作者总数: ${totalAuthors.count}`);

// 关闭数据库
db.close();