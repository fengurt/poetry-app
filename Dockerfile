# Simple single-stage Dockerfile — no build step needed
# Express serves pre-built EJS templates directly
FROM node:22-slim

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
ENV DB_PATH=/app/data/poetry.db
ENV DATA_FILE=/app/poetry_data.json

# poetry_data.json seeds empty DB; optional /app/poetry.db in image = classified backup
CMD ["node", "server.js"]