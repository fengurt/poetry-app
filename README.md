# 爱国诗词集 (poetry-app)

Express 5 + EJS + SQLite. Production entrypoint: `node server.js`.

## Local preview

```bash
npm install
npm run preview
```

Open [http://localhost:3000](http://localhost:3000). Or: `npm start` / `npm run dev` (same server).

## Docker (local)

```bash
bash build-and-run.sh deploy
```

## Coolify

Use **Dockerfile** build pack (not Nixpacks). Persist **`/app/data`** for SQLite. See [DEPLOY.md](./DEPLOY.md) and `coolify.json` for env vars (`PORT`, `DB_PATH`, `DATA_FILE`).

Deploy branch on GitHub is typically **`deploy-configs`** until you merge to **`main`**. OpenTofu deploy hook: **`infra/coolify/`**. Agent-oriented summary: **[AGENTS.md](./AGENTS.md)**.
