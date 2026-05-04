# Simple single-stage Dockerfile — no build step needed
# Express serves pre-built EJS templates directly
# Pin amd64 so better-sqlite3 native binary matches Coolify / x86_64 hosts
FROM --platform=linux/amd64 node:22-slim

WORKDIR /app

# Install deps first (works reliably even on slow/unstable connections)
COPY package*.json ./
RUN npm install --prefer-offline --retry 3 --no-audit --no-fund || \
    npm install --retry 3 --no-audit --no-fund

# Copy everything else
COPY . .

# Persistent SQLite lives here (bind mount or named volume in Coolify)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Shanghai
ENV DB_PATH=/app/data/poetry.db
ENV DATA_FILE=/app/poetry_data.json

# Coolify / Docker health (matches coolify.json healthCheckPath)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# poetry_data.json seeds empty DB; optional /app/poetry.db in image = classified backup
CMD ["node", "server.js"]