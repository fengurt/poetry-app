import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  const cwd = process.cwd();
  const isStandalone = cwd.includes('standalone');
  const DB_PATH = process.env.DB_PATH || (
    isStandalone
      ? path.resolve(cwd, '..', '..', '..', 'poetry.db')
      : path.join(cwd, 'poetry.db')
  );

  let dbInfo: any = { error: 'not checked' };
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH, { readonly: true, timeout: 5000 });
    const count = (db.prepare('SELECT COUNT(*) as c FROM poems').get() as any)?.c;
    db.close();
    dbInfo = { ok: true, count };
  } catch (e: any) {
    dbInfo = { error: e.message };
  }

  return NextResponse.json({
    cwd, isStandalone, dbPath: DB_PATH,
    fileExists: require('fs').existsSync(DB_PATH),
    dbInfo,
    env: { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT, DB_PATH: process.env.DB_PATH }
  });
}