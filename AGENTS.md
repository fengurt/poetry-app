# Agent notes — poetry-app

## What this is

- **Runtime:** Node **Express 5** + **EJS**, SQLite via **better-sqlite3**.
- **Entry:** `server.js` (see `package.json` `start` / `dev` / `preview`).
- **Container:** root **Dockerfile**; production DB path **`DB_PATH=/app/data/poetry.db`** (use a Coolify **persistent volume** on `/app/data`).
- **Seed / backup:** `poetry_data.json` and optional root **`poetry.db`** in the image for first-run migrate logic.

## Branches

- **`deploy-configs`** — current Express + Coolify work (Docker, `views/`, `coolify.json`, `DEPLOY.md`).
- **`origin/main`** on GitHub may still be behind; deploy from **`deploy-configs`** or open a **PR → `main`** and set Coolify’s branch to whatever you merge.

## Coolify (UI)

1. Application from **Git** → this repo, branch **`deploy-configs`** (or **`main`** after merge).
2. **Build pack:** **Dockerfile** (not Nixpacks).
3. **Port:** `3000`; **health check path:** `/`.
4. **Volume:** mount storage to **`/app/data`**.
5. Env (defaults also set in Dockerfile): `NODE_ENV=production`, `PORT=3000`, `DB_PATH`, `DATA_FILE`.

Details: `DEPLOY.md`, hints: `coolify.json`.

## OpenTofu (API deploy trigger)

- Layout: **`infra/coolify/`** — minimal **null_resource** + `curl` against Coolify’s **deploy** API (adjust URL if your Coolify version differs).
- Copy `terraform.tfvars.example` → `terraform.tfvars` (gitignored); set `coolify_token`, `coolify_application_uuid`, `coolify_api_base`.
- Run: `cd infra/coolify && tofu init && tofu apply` (or `terraform` if you do not use OpenTofu).
- Bump `redeploy_trigger` in tfvars when you want apply to trigger a new deploy.

Optional: use a community Coolify Terraform provider instead of `curl`; see `infra/coolify/README.md`.

## Local preview

```bash
npm install && npm run preview
```
