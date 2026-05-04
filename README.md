# 爱国诗词集 (poetry-app)

Express 5 + EJS + SQLite. Production entrypoint: `node server.js`.

## Local preview

```bash
npm install
npm run preview
```

Open [http://localhost:3000](http://localhost:3000). Or: `npm start` / `npm run dev` (same server).

发布 / 打 Docker 镜像前建议：`npm run verify`（语法检查 + Excel 导出回归脚本）。

## Docker (local)

```bash
bash build-and-run.sh deploy
```

## AMD64 与双路径部署一致性

云服务器与 Coolify 多为 **linux/amd64**。要保持 **`build-and-run.sh` 部署** 与 **Coolify 部署** 和本地 `npm run preview` 数据与分类行为一致，请按 **[DEPLOY-AMD64.md](./DEPLOY-AMD64.md)** 配置平台、`DATA_FILE` / `DB_PATH` 与卷挂载。

## Coolify

Use **Dockerfile** build pack (not Nixpacks). Persist **`/app/data`** for SQLite. See [DEPLOY.md](./DEPLOY.md) and `coolify.json` for env vars (`PORT`, `DB_PATH`, `DATA_FILE`).

Deploy branch on GitHub is typically **`deploy-configs`** until you merge to **`main`**. OpenTofu deploy hook: **`infra/coolify/`**. Agent-oriented summary: **[AGENTS.md](./AGENTS.md)**.
