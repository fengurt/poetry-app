# 部署指南：腾讯云轻量 + Coolify v4 + 爱国诗词集

## 前置条件

- 腾讯云轻量应用服务器（建议 **2核4GB** 起，**Ubuntu 22.04 LTS**）
- 已备案域名（如使用大陆地域），境外地域（港澳）可不用备案
- 本地 `poetry-app` 已配置 GitHub 仓库（见第一步）

---

## 阶段一：在服务器上安装 Coolify v4

> 基于腾讯云官方文档 [How to Deploy Coolify on a VPS](https://www.tencentcloud.com/techpedia/144014) 与 Coolify 官方安装脚本。

### 1.1 连接服务器

```bash
ssh ubuntu@<你的服务器IP>
```

### 1.2 确认系统为 Ubuntu 22.04+

```bash
cat /etc/os-release
# 确认 VERSION_ID 为 "22.04"
```

### 1.3 添加 4GB swap（重要！防止构建时 OOM）

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h | grep Swap   # 确认 Swap 已启用
```

### 1.4 运行 Coolify 安装脚本

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

> 脚本会自动安装 Docker、Docker Compose、Traefik，并启动 Coolify 所有服务。
> 全程约 3～5 分钟，完成后会输出访问地址（如 `http://<IP>:8000`）。

### 1.5 放行防火墙端口（腾讯云安全组）

在腾讯云控制台 → 轻量服务器 → **防火墙** → 添加规则：

| 协议 | 端口 | 来源 | 用途 |
|------|------|------|------|
| TCP | 22 | 0.0.0.0/0 | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP（Let's Encrypt 用） |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 8000 | 0.0.0.0/0 | Coolify 管理界面（临时） |

### 1.6 创建 Coolify 管理员账号

1. 浏览器访问 `http://<服务器IP>:8000`
2. 按提示注册第一个管理员账户（邮箱 + 密码）
3. 设置 Instance URL 为你的域名（如 `https://coolify.yourdomain.com`，可以之后改）

### 1.7 后续锁定（可选但建议）

安装完成后，在腾讯云安全组中**移除** 8000 的外网入站规则，改为通过 **域名 + Nginx/Caddy 反代** 访问 Coolify 管理界面。

---

## 阶段二：将 poetry-app 接入 GitHub

### 2.1 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. Repository name: `poetry-app`
3. **不要**勾选 "Add a README file"（本地已有）
4. 点击 "Create repository"

### 2.2 将本地仓库与 GitHub 关联

```bash
cd /Users/af/cpro01/ksaclaude01/mamapoems999/poetry-app

# 添加 GitHub 仓库为 remote
git remote add origin https://github.com/<你的用户名>/poetry-app.git

# 推送 main 分支
git branch -M main
git push -u origin main
```

### 2.3 确认文件结构正确

确保项目根目录包含：
- `Dockerfile`
- `next.config.ts`（已配置 `output: "standalone"`）
- `scripts/migrate.js`
- `poetry_data.json`（数据文件，会在镜像中用到）

---

## 阶段三：在 Coolify 中部署 poetry-app

### 3.1 连接 GitHub

1. 在 Coolify 左侧菜单 → **Settings** → **Sources**
2. 选择 **GitHub**，点击 "Register New GitHub App"
3. 按提示授权你的 GitHub 账户
4. 在你的 GitHub 仓库安装 Coolify App（授予 `poetry-app` 仓库权限）

### 3.2 创建新项目

1. Coolify 首页 → **New Project**
2. Name: `诗词集`（任意）
3. 在项目内 → **Add New Resource** → **Application**
4. 选择 `poetry-app` 仓库

### 3.3 配置构建与启动

Coolify 会自动检测为 Next.js 应用，建议检查以下字段：

| 字段 | 值 |
|------|-----|
| **Build Pack** | Nixpacks（或 Dockerfile） |
| **Build Command** | （自动检测，如有需要填）`npm install && npm run build` |
| **Start Command** | `npm start` |
| **Port** | `3000` |
| **HEALTH CHECK PATH** | `/` |

### 3.4 配置环境变量

在 Coolify 应用设置的 **Environment Variables** 中添加：

```
NODE_ENV=production
PORT=3000
```

### 3.5 配置域名与 HTTPS

1. 应用设置 → **Domains**
2. 点击 **Add Domain**，输入你的子域名（如 `shici.yourdomain.com`）
3. 在你的域名 DNS 管理后台添加一条 **A 记录** 指向服务器 IP
4. 点击 **Enable HTTPS** — Coolify 自动通过 Let's Encrypt 申请并续期证书

### 3.6 部署

点击 **Deploy** — Coolify 会：
1. 从 GitHub 拉取最新代码
2. 在 Docker 容器中执行 `npm install && npm run build`
3. 启动 Next.js 生产进程（端口 3000）
4. 通过 Traefik 自动反向代理 + HTTPS

构建日志实时显示在 Coolify UI 中。正常 Next.js 冷构建约 90～120 秒。

---

## 阶段四：多项目管理（后续扩展）

当你在同一台服务器上部署第二个、第三个项目时：

1. 在 Coolify 中每个项目使用**不同的子域名**（如 `app2.yourdomain.com`）
2. Coolify 的 Traefik 自动按域名分流，无需额外配置 Nginx
3. 所有部署的 SSL 证书由 Let's Encrypt 自动管理
4. 通过 Coolify Dashboard 统一监控 CPU / 内存 / 磁盘

---

## 故障排查

| 症状 | 可能原因 | 处理方式 |
|------|----------|----------|
| 构建失败 OOM | 内存不足 | 确认 swap 已启用；降低并发构建数 |
| 访问显示 502 | 后端进程未启动 | 检查日志；确认 `npm start` 而非 `npm run dev` |
| HTTPS 申请失败 | 域名未正确解析 / 端口未通 | 确认 DNS A 记录生效；安全组放行 80/443 |
| `better-sqlite3` 报错 | Alpine 镜像缺少 `sqlite` | Dockerfile 中已加 `apk add --no-cache sqlite`，确认构建日志 |
| 数据库为空 | `poetry_data.json` 未找到 | 确认文件在仓库根目录；检查 `scripts/migrate.js` 日志 |

---

## 重要说明

- `poetry_data.json` 已包含所有诗词数据，构建时打包进镜像，容器首次启动时通过 `scripts/migrate.js` 自动写入 `poetry.db`
- 后续如有新数据，修改 `poetry_data.json` 后 `git push`，Coolify 自动重新构建 + 重新迁移
- 当前使用本地 SQLite 文件（`poetry.db`），适合低并发场景；如需水平扩展，可将数据库迁移至 Coolify 内置的 PostgreSQL