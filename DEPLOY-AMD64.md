# AMD64 部署指南：与本地行为一致

本文说明如何在 **linux/amd64**（常见云服务器、Coolify 默认架构）上部署 **poetry-app**，并使 **Docker 脚本部署** 与 **Coolify 部署** 两种路径在数据、分类、导出上与本地 `npm run preview` / `npm start` 一致。

---

## 本地「基准」是什么

在仓库 `poetry-app` 目录下：

```bash
npm install
npm run preview
# 或 npm start
```

默认使用：

- **SQLite**：`data/poetry.db`（相对 `server.js` 所在目录），若不存在则由迁移逻辑创建并种子化。
- **种子 JSON**：`poetry_data.json`（与 `server.js` 同级目录）。

生产容器内对应关系：

| 本地（相对应用根） | 容器内路径 | 说明 |
|-------------------|------------|------|
| `poetry_data.json` | `/app/poetry_data.json` | 打进镜像，**不要**只绑到空卷路径 |
| `data/poetry.db` | `/app/data/poetry.db` | 应挂**持久卷**到 `/app/data` |

---

## 为什么必须固定 amd64

应用依赖 **better-sqlite3** 原生模块。若在 **ARM64**（例如 Apple Silicon）上构建镜像却在 **AMD64** 服务器上运行，会出现加载失败或异常行为。

本仓库已做：

- **Dockerfile**：`FROM --platform=linux/amd64 node:22-slim`
- **build-and-run.sh**：`docker build --platform linux/amd64 …`
- **docker-compose.yml**：`platform: linux/amd64`

在 **已是 amd64** 的 CI / Coolify 构建机上构建时，上述配置仍会得到一致的 amd64 镜像。

若在 **ARM 本机** 交叉构建供 amd64 服务器使用，请始终带 `--platform linux/amd64`（脚本已包含）。

---

## 两种部署方式（对齐同一套环境变量）

### 版本 A：`build-and-run.sh` / 手工 `docker run`

适合本机或任意已装 Docker 的 Linux（amd64）。

1. 使用仓库脚本（已含 amd64 构建）：

   ```bash
   cd poetry-app
   chmod +x build-and-run.sh
   ./build-and-run.sh deploy
   ```

2. 等价的手工参数（便于对照 Coolify）：

   ```bash
   docker build --platform linux/amd64 -t poetry-app:latest .
   docker run -d --name poetry-app --restart unless-stopped \
     -p 3000:3000 \
     -e PORT=3000 \
     -e NODE_ENV=production \
     -e TZ=Asia/Shanghai \
     -e DB_PATH=/app/data/poetry.db \
     -e DATA_FILE=/app/poetry_data.json \
     -v poetry-app-data:/app/data \
     poetry-app:latest
   ```

**与本地一致要点**：`DATA_FILE` 必须为 **`/app/poetry_data.json`**（镜像内文件）；卷只挂 **`/app/data`** 存数据库。

### 版本 B：Coolify（Dockerfile）

1. **Build Pack**：Dockerfile（不要用 Nixpacks 替代本仓库的 Node 镜像逻辑）。
2. **持久化**：将命名卷或绑定挂载挂到容器 **`/app/data`**。
3. **环境变量**（与 `coolify.json` 一致）：

   ```
   NODE_ENV=production
   PORT=3000
   TZ=Asia/Shanghai
   DB_PATH=/app/data/poetry.db
   DATA_FILE=/app/poetry_data.json
   ```

**常见错误**：把 `DATA_FILE` 写成 `/app/data/poetry_data.json`。空卷下该路径**没有文件**，迁移读不到 JSON，会出现诗词数量远少于本地、分类全空等现象。

---

## 启动后应与本地一致的行为

1. **首次空库**：从 `poetry_data.json` 种子写入 `DB_PATH`；诗词总数应与 JSON 条数一致（可与本地新建空库后对比）。
2. **内容分类（category）**：JSON 通常不带 `category`；服务启动后会对 **category 为空** 的行自动按关键词补全（与 `scripts/classify_all_poems.js` 同源逻辑）。
3. **体裁（poetry_type）**：由 `lib/inferPoetryType.js` 在首次需要时批量推断并写入 `app_meta`，之后不再重复跑。
4. **可选镜像内备份**：若构建时把已手工维护的 `poetry.db` 放在镜像 **`/app/poetry.db`**（与 `DB_PATH` 不同），且其「已分类条数」多于当前卷库，迁移会复制覆盖到 `DB_PATH`（会处理 WAL/SHM，避免损坏）。

---

## 部署后自检清单（与本地对比）

在浏览器或命令行核对（替换为你的域名或 `http://localhost:端口`）：

| 检查项 | 期望 |
|--------|------|
| 首页或列表诗词总数 | 与本地同版本 `poetry_data.json` 导入后一致 |
| 「内容分类」页 / 筛选 | 各分类有分布，不应长期全部空白 |
| `GET /api/export?format=xlsx` | 可下载；含「发布年份」与「标签」列；超长正文安全截断 |
| `GET /api/export?format=bycategory` | 各章节能看到对应分类下的作品 |

若总数不对：先查 **`DATA_FILE`** 与 **`DB_PATH`** 是否按上表配置，以及 Coolify / compose 是否误把 JSON 指到空卷路径。

---

## 标签与发布年份（Docker 与本地一致）

诗词的 **`tags`** 列为 JSON 字符串数组，**发布年份**即其中 **四位数字** 标签（如 `2026`），与自定义字符串标签并存。

- 首次种子 / 导入时，若 `tags` 中尚无四位年份，会自动 **`unshift` 当前公历年**（`new Date().getFullYear()`），与容器进程的**本地日期**一致。
- 为避免 UTC 容器在元旦前后与本地（中国）差一年，请在生产环境设置 **`TZ=Asia/Shanghai`**（本仓库 `Dockerfile`、`docker-compose.yml`、`coolify.json`、`build-and-run.sh` 已默认或示例包含）。
- Excel 导出：**「发布年份」** 列为从 `tags` 抽取的年份；**「标签」** 列为 `tags` 全量（顿号分隔），便于与本地导出的表格对照。

---

## 与主部署文档的关系

- 通用 Coolify 步骤、防火墙、域名：**[DEPLOY.md](./DEPLOY.md)**
- OpenTofu 仅触发部署：**[infra/coolify/README.md](./infra/coolify/README.md)**

将 **amd64 构建、环境变量、卷路径** 按本文设置后，**A（脚本 Docker）** 与 **B（Coolify）** 应与本地同一套种子与迁移逻辑对齐。
