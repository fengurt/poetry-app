#!/usr/bin/env node
// migrate.js -- seeds the SQLite DB from poetry_data.json on container start

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(process.cwd(), "poetry_data.json");
const DB_PATH   = path.join(process.cwd(), "poetry.db");

if (!fs.existsSync(JSON_PATH)) {
  console.warn("poetry_data.json not found -- skipping DB seed.");
  process.exit(0);
}

const poemsData = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
console.log("Seeding " + poemsData.length + " poems into SQLite...");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS poems (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT "",
    content TEXT NOT NULL,
    dynasty TEXT DEFAULT "",
    poetry_type TEXT DEFAULT "",
    source TEXT DEFAULT "",
    tags TEXT DEFAULT "[]",
    notes TEXT DEFAULT "",
    category TEXT DEFAULT "",
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
  CREATE INDEX IF NOT EXISTS idx_tags        ON poems(tags);
  CREATE INDEX IF NOT EXISTS idx_title       ON poems(title);
  CREATE INDEX IF NOT EXISTS idx_category    ON poems(category);
`);

const existing = db.prepare("SELECT COUNT(*) as c FROM poems").get().c;
if (existing > 0) {
  console.log("DB already has " + existing + " poems -- skipping seed.");
  db.close();
  process.exit(0);
}

const insertPoem = db.prepare(`
  INSERT INTO poems (id, author_name, title, subtitle, content, dynasty, poetry_type, source, tags, notes, category, category_score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const upsertAuthor = db.prepare(`
  INSERT INTO authors (id, name, poem_count)
  VALUES (?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET poem_count = ?
`);

const authorCounts = {};

for (const poem of poemsData) {
  const tags = ["2026"];
  if (Array.isArray(poem.tags)) tags.push(...poem.tags);

  insertPoem.run(
    poem.id,
    poem.author_name,
    poem.title,
    poem.subtitle || "",
    poem.content,
    poem.dynasty || "",
    poem.poetry_type || "",
    poem.source || "",
    JSON.stringify(tags),
    poem.notes || "",
    poem.category || "",
    poem.category_score || 0
  );

  authorCounts[poem.author_name] = (authorCounts[poem.author_name] || 0) + 1;
}

for (const [name, count] of Object.entries(authorCounts)) {
  upsertAuthor.run(name, name, count, count);
}

const total = db.prepare("SELECT COUNT(*) as c FROM poems").get().c;
console.log("Seeded " + total + " poems and " + Object.keys(authorCounts).length + " authors.");
db.close();