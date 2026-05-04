#!/usr/bin/env node
/**
 * 诗词自动分类脚本（CLI）
 * 算法见 lib/autoClassifyCategory.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const { CATEGORIES, applyContentCategoriesToEmpty } = require('../lib/autoClassifyCategory');

function main() {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'poetry.db');

  console.log('开始诗词分类...');
  console.log('分类类别:', CATEGORIES.join(', '));

  const db = new Database(DB_PATH);
  const pending = db
    .prepare("SELECT COUNT(*) AS c FROM poems WHERE category IS NULL OR TRIM(category) = ''")
    .get().c;
  console.log(`\n找到 ${pending} 首未分类的诗词`);

  const updated = applyContentCategoriesToEmpty(db);

  console.log('\n分类完成!');
  console.log(`已写入 category 的行数: ${updated}`);

  const stats = db.prepare('SELECT category AS cat, COUNT(*) AS c FROM poems GROUP BY category ORDER BY c DESC').all();
  console.log('\n当前分类分布:');
  for (const { cat, c } of stats) {
    console.log(`  ${cat || '(空)'}: ${c} 首`);
  }

  db.close();
}

main();
