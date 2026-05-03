import Database from 'better-sqlite3';
import path from 'path';

// In standalone mode the server runs from .next/standalone/, so resolve
// the DB path relative to /app (the original workdir before cwd shift).
const DB_PATH = process.env.DB_PATH
  || (/standalone[/\\]/.test(__dirname)
      ? path.resolve(__dirname, '..', '..', '..', 'poetry.db')
      : path.join(process.cwd(), 'poetry.db'));

// 12种诗词分类
export const CATEGORIES = [
  '不忘初心',
  '咏物寄情',
  '情系河山',
  '老龄心声',
  '感事抒怀',
  '诗社撷英',
  '曲赋雅韵',
  '时代风云',
  '刺玫瑰',
  '七彩人生',
  '诗词文苑',
  '心香一瓣'
] as const;

export type Category = typeof CATEGORIES[number];

// 分类关键词权重表
export const CATEGORY_KEYWORDS: Record<Category, { keyword: string; weight: number }[]> = {
  '不忘初心': [
    { keyword: '党', weight: 1.0 },
    { keyword: '祖国', weight: 1.0 },
    { keyword: '使命', weight: 0.9 },
    { keyword: '信仰', weight: 0.9 },
    { keyword: '忠诚', weight: 0.8 },
    { keyword: '奋斗', weight: 0.8 },
    { keyword: '初心', weight: 0.9 },
    { keyword: '追梦', weight: 0.7 },
    { keyword: '复兴', weight: 0.8 },
    { keyword: '强国', weight: 0.8 },
    { keyword: '中国梦', weight: 0.9 },
    { keyword: '红旗', weight: 0.7 },
    { keyword: '革命', weight: 0.7 }
  ],
  '咏物寄情': [
    { keyword: '梅', weight: 0.9 },
    { keyword: '兰', weight: 0.8 },
    { keyword: '竹', weight: 0.8 },
    { keyword: '菊', weight: 0.8 },
    { keyword: '花', weight: 0.6 },
    { keyword: '月', weight: 0.7 },
    { keyword: '鸟', weight: 0.7 },
    { keyword: '风', weight: 0.5 },
    { keyword: '雨', weight: 0.5 },
    { keyword: '雪', weight: 0.7 },
    { keyword: '荷', weight: 0.8 },
    { keyword: '松', weight: 0.7 },
    { keyword: '柳', weight: 0.6 },
    { keyword: '桃', weight: 0.6 },
    { keyword: '桂', weight: 0.6 },
    { keyword: '牡丹', weight: 0.8 },
    { keyword: '海棠', weight: 0.7 },
    { keyword: '石榴', weight: 0.7 }
  ],
  '情系河山': [
    { keyword: '山', weight: 0.8 },
    { keyword: '水', weight: 0.7 },
    { keyword: '江', weight: 0.7 },
    { keyword: '河', weight: 0.7 },
    { keyword: '海', weight: 0.8 },
    { keyword: '湖', weight: 0.7 },
    { keyword: '峰', weight: 0.8 },
    { keyword: '峡', weight: 0.8 },
    { keyword: '草原', weight: 0.9 },
    { keyword: '大地', weight: 0.6 },
    { keyword: '天涯', weight: 0.7 },
    { keyword: '远方', weight: 0.6 },
    { keyword: '长城', weight: 1.0 },
    { keyword: '黄河', weight: 0.9 },
    { keyword: '长江', weight: 0.9 },
    { keyword: '珠峰', weight: 0.9 },
    { keyword: '江南', weight: 0.7 },
    { keyword: '塞北', weight: 0.8 }
  ],
  '老龄心声': [
    { keyword: '老', weight: 1.0 },
    { keyword: '退休', weight: 1.0 },
    { keyword: '养生', weight: 0.9 },
    { keyword: '健康', weight: 0.8 },
    { keyword: '长寿', weight: 0.9 },
    { keyword: '子孙', weight: 0.8 },
    { keyword: '夕阳', weight: 1.0 },
    { keyword: '暮年', weight: 0.9 },
    { keyword: '古稀', weight: 1.0 },
    { keyword: '耄耋', weight: 1.0 },
    { keyword: '颐养', weight: 0.9 },
    { keyword: '天年', weight: 0.8 },
    { keyword: '桑榆', weight: 0.9 },
    { keyword: '白首', weight: 0.8 },
    { keyword: '鶴发', weight: 0.8 }
  ],
  '感事抒怀': [
    { keyword: '感', weight: 0.9 },
    { keyword: '怀', weight: 0.8 },
    { keyword: '叹', weight: 0.7 },
    { keyword: '思', weight: 0.6 },
    { keyword: '悟', weight: 0.8 },
    { keyword: '情', weight: 0.7 },
    { keyword: '愁', weight: 0.8 },
    { keyword: '忧', weight: 0.8 },
    { keyword: '思乡', weight: 0.9 },
    { keyword: '离别', weight: 0.9 },
    { keyword: '感怀', weight: 1.0 },
    { keyword: '感事', weight: 1.0 },
    { keyword: '抒怀', weight: 1.0 },
    { keyword: '追忆', weight: 0.8 },
    { keyword: '回首', weight: 0.7 }
  ],
  '诗社撷英': [
    { keyword: '诗社', weight: 1.0 },
    { keyword: '雅聚', weight: 1.0 },
    { keyword: '唱和', weight: 1.0 },
    { keyword: '酬唱', weight: 1.0 },
    { keyword: '笔会', weight: 1.0 },
    { keyword: '文友', weight: 0.9 },
    { keyword: '吟诵', weight: 0.9 },
    { keyword: '雅集', weight: 0.9 },
    { keyword: '诗会', weight: 0.9 },
    { keyword: '联吟', weight: 0.9 },
    { keyword: '切磋', weight: 0.8 },
    { keyword: '诗缘', weight: 0.8 },
    { keyword: '韵友', weight: 0.8 }
  ],
  '曲赋雅韵': [
    { keyword: '曲', weight: 1.0 },
    { keyword: '赋', weight: 0.9 },
    { keyword: '词', weight: 0.7 },
    { keyword: '令', weight: 0.8 },
    { keyword: '慢', weight: 0.8 },
    { keyword: '引', weight: 0.7 },
    { keyword: '近', weight: 0.6 },
    { keyword: '蝶恋花', weight: 1.0 },
    { keyword: '清平乐', weight: 1.0 },
    { keyword: '满江红', weight: 1.0 },
    { keyword: '沁园春', weight: 1.0 },
    { keyword: '水调歌头', weight: 1.0 },
    { keyword: '念奴娇', weight: 1.0 },
    { keyword: '西江月', weight: 1.0 },
    { keyword: '鹧鸪天', weight: 1.0 },
    { keyword: '临江仙', weight: 1.0 },
    { keyword: '采桑子', weight: 1.0 },
    { keyword: '如梦令', weight: 1.0 }
  ],
  '时代风云': [
    { keyword: '抗疫', weight: 1.0 },
    { keyword: '航天', weight: 1.0 },
    { keyword: '奥运', weight: 1.0 },
    { keyword: '一带一路', weight: 1.0 },
    { keyword: '峰会', weight: 0.9 },
    { keyword: '改革开放', weight: 0.9 },
    { keyword: '亚运会', weight: 1.0 },
    { keyword: '冬奥会', weight: 1.0 },
    { keyword: '航母', weight: 0.9 },
    { keyword: '阅兵', weight: 0.9 },
    { keyword: '峰会', weight: 0.9 },
    { keyword: '博鳌', weight: 1.0 },
    { keyword: '上合', weight: 1.0 },
    { keyword: 'G20', weight: 0.9 },
    { keyword: '进博会', weight: 1.0 },
    { keyword: '数字化', weight: 0.8 },
    { keyword: '人工智能', weight: 0.8 }
  ],
  '刺玫瑰': [
    { keyword: '讽刺', weight: 1.0 },
    { keyword: '批判', weight: 0.9 },
    { keyword: '揭露', weight: 0.9 },
    { keyword: '时弊', weight: 1.0 },
    { keyword: '官场', weight: 0.9 },
    { keyword: '腐败', weight: 0.9 },
    { keyword: '贪婪', weight: 0.8 },
    { keyword: '虚伪', weight: 0.8 },
    { keyword: '丑恶', weight: 0.8 },
    { keyword: '贪婪', weight: 0.8 },
    { keyword: '趋炎', weight: 0.7 },
    { keyword: '附势', weight: 0.7 }
  ],
  '七彩人生': [
    { keyword: '生活', weight: 0.7 },
    { keyword: '情趣', weight: 0.8 },
    { keyword: '闲适', weight: 0.9 },
    { keyword: '逸趣', weight: 0.9 },
    { keyword: '雅兴', weight: 0.9 },
    { keyword: '漫步', weight: 0.8 },
    { keyword: '游历', weight: 0.8 },
    { keyword: '游览', weight: 0.8 },
    { keyword: '品茶', weight: 0.9 },
    { keyword: '饮酒', weight: 0.8 },
    { keyword: '弈棋', weight: 1.0 },
    { keyword: '书法', weight: 0.9 },
    { keyword: '丹青', weight: 0.9 },
    { keyword: '垂钓', weight: 0.9 },
    { keyword: '田园', weight: 0.8 }
  ],
  '诗词文苑': [
    { keyword: '论诗', weight: 1.0 },
    { keyword: '品诗', weight: 1.0 },
    { keyword: '诗论', weight: 1.0 },
    { keyword: '诗法', weight: 1.0 },
    { keyword: '艺术', weight: 0.7 },
    { keyword: '意境', weight: 0.9 },
    { keyword: '韵律', weight: 0.9 },
    { keyword: '平仄', weight: 1.0 },
    { keyword: '对仗', weight: 0.9 },
    { keyword: '推敲', weight: 1.0 },
    { keyword: '诗话', weight: 1.0 },
    { keyword: '词话', weight: 1.0 },
    { keyword: '诗评', weight: 1.0 }
  ],
  '心香一瓣': [
    { keyword: '祭', weight: 1.0 },
    { keyword: '悼', weight: 1.0 },
    { keyword: '缅怀', weight: 1.0 },
    { keyword: '追思', weight: 1.0 },
    { keyword: '纪念', weight: 0.9 },
    { keyword: '千古', weight: 0.8 },
    { keyword: '哀思', weight: 1.0 },
    { keyword: '伤逝', weight: 1.0 },
    { keyword: '英灵', weight: 1.0 },
    { keyword: '忠魂', weight: 1.0 },
    { keyword: '不朽', weight: 0.8 },
    { keyword: '缅想', weight: 0.9 },
    { keyword: '追悼', weight: 1.0 },
    { keyword: '奠', weight: 0.9 }
  ]
};

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  database.exec(`
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
}

export interface Poem {
  id: string;
  author_name: string;
  title: string;
  subtitle?: string;
  content: string;
  dynasty?: string;
  poetry_type?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  category?: string;
  category_score?: number;
  created_at?: string;
  updated_at?: string;
}

export function insertPoem(poem: Poem): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO poems (id, author_name, title, subtitle, content, dynasty, poetry_type, source, tags, notes, category, category_score, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    poem.id,
    poem.author_name,
    poem.title,
    poem.subtitle || '',
    poem.content,
    poem.dynasty || '现代',
    poem.poetry_type || '诗',
    poem.source || '',
    JSON.stringify(poem.tags || []),
    poem.notes || '',
    poem.category || '',
    poem.category_score || 0
  );

  // 更新作者统计
  updateAuthorCount(poem.author_name);
}

export function updateAuthorCount(authorName: string): void {
  const database = getDb();

  // 获取该作者的诗词数量
  const countResult = database.prepare(
    'SELECT COUNT(*) as count FROM poems WHERE author_name = ?'
  ).get(authorName) as { count: number };

  // 更新或插入作者记录
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO authors (id, name, poem_count)
    VALUES (
      (SELECT id FROM authors WHERE name = ?),
      ?,
      ?
    )
  `);

  // 使用 REPLACE 方式
  database.prepare(`
    INSERT INTO authors (id, name, poem_count)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET poem_count = ?
  `).run(
    authorName,
    authorName,
    countResult.count,
    countResult.count
  );
}

export function getAllPoems(limit = 100, offset = 0): Poem[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM poems ORDER BY author_name, id LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as any[];
  return rows.map(parsePoemRow);
}

export function getPoemById(id: string): Poem | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM poems WHERE id = ?');
  const row = stmt.get(id) as any;
  return row ? parsePoemRow(row) : null;
}

export function searchPoems(query: string): Poem[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM poems
    WHERE title LIKE ? OR content LIKE ? OR author_name LIKE ? OR tags LIKE ?
       OR category LIKE ? OR poetry_type LIKE ? OR dynasty LIKE ? OR subtitle LIKE ?
    ORDER BY author_name, title
  `);

  const searchPattern = `%${query}%`;
  const rows = stmt.all(
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern
  ) as any[];
  return rows.map(parsePoemRow);
}

export function getPoemsByAuthor(authorName: string): Poem[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM poems WHERE author_name = ? ORDER BY title');
  const rows = stmt.all(authorName) as any[];
  return rows.map(parsePoemRow);
}

export function getAllAuthors(): { name: string; poem_count: number }[] {
  const database = getDb();
  const stmt = database.prepare('SELECT name, poem_count FROM authors ORDER BY poem_count DESC');
  return stmt.all() as { name: string; poem_count: number }[];
}

export function getPoemsByTag(tag: string): Poem[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM poems WHERE tags LIKE ? ORDER BY author_name, title
  `);
  const rows = stmt.all(`%"${tag}"%`) as any[];
  return rows.map(parsePoemRow);
}

export function getPoemsByCategory(category: string): Poem[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM poems WHERE category = ? ORDER BY author_name, title');
  const rows = stmt.all(category) as any[];
  return rows.map(parsePoemRow);
}

export function getCategoryStats(): { category: string; count: number }[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT category, COUNT(*) as count
    FROM poems
    WHERE category != ''
    GROUP BY category
    ORDER BY count DESC
  `);
  return stmt.all() as { category: string; count: number }[];
}

export function updatePoemCategory(id: string, category: string, score: number): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE poems SET category = ?, category_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(category, score, id);
}

export function getAllTags(): { tag: string; count: number }[] {
  const database = getDb();
  const poems = database.prepare('SELECT tags FROM poems').all() as any[];

  const tagCounts: Record<string, number> = {};
  for (const row of poems) {
    try {
      const tags = JSON.parse(row.tags || '[]') as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// 获取所有元数据标签（分类、作者、类型等）
export function getAllMetadataTags(): {
  categories: { name: string; count: number }[];
  authors: { name: string; count: number }[];
  poetryTypes: { name: string; count: number }[];
  dynasties: { name: string; count: number }[];
  customTags: { name: string; count: number }[];
} {
  const database = getDb();

  // 获取分类统计
  const categories = database.prepare(`
    SELECT category as name, COUNT(*) as count
    FROM poems WHERE category != '' GROUP BY category ORDER BY count DESC
  `).all() as { name: string; count: number }[];

  // 获取作者统计
  const authors = database.prepare(`
    SELECT author_name as name, COUNT(*) as count
    FROM poems GROUP BY author_name ORDER BY count DESC
  `).all() as { name: string; count: number }[];

  // 获取类型统计
  const poetryTypes = database.prepare(`
    SELECT poetry_type as name, COUNT(*) as count
    FROM poems GROUP BY poetry_type ORDER BY count DESC
  `).all() as { name: string; count: number }[];

  // 获取朝代统计
  const dynasties = database.prepare(`
    SELECT dynasty as name, COUNT(*) as count
    FROM poems GROUP BY dynasty ORDER BY count DESC
  `).all() as { name: string; count: number }[];

  // 获取自定义标签（从tags字段提取）
  const poems = database.prepare('SELECT tags FROM poems').all() as any[];
  const tagCounts: Record<string, number> = {};
  for (const row of poems) {
    try {
      const tags = JSON.parse(row.tags || '[]') as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch {
      // ignore
    }
  }

  const customTags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { categories, authors, poetryTypes, dynasties, customTags };
}

export function updatePoemTags(id: string, tags: string[]): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE poems SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(JSON.stringify(tags), id);
}

export function deletePoem(id: string): void {
  const database = getDb();
  const poem = getPoemById(id);
  if (poem) {
    const stmt = database.prepare('DELETE FROM poems WHERE id = ?');
    stmt.run(id);
    updateAuthorCount(poem.author_name);
  }
}

export function getPoemCount(): number {
  const database = getDb();
  const result = database.prepare('SELECT COUNT(*) as count FROM poems').get() as { count: number };
  return result.count;
}

export function importPoems(poems: Poem[]): number {
  let count = 0;
  for (const poem of poems) {
    try {
      insertPoem(poem);
      count++;
    } catch (error) {
      console.error(`Failed to insert poem ${poem.id}:`, error);
    }
  }
  return count;
}

function parsePoemRow(row: any): Poem {
  return {
    ...row,
    tags: parseTags(row.tags),
    subtitle: row.subtitle || '',
    dynasty: row.dynasty || '现代',
    poetry_type: row.poetry_type || '诗',
    source: row.source || '',
    notes: row.notes || '',
    category: row.category || '',
    category_score: row.category_score || 0
  };
}

function parseTags(tagsJson: string): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}