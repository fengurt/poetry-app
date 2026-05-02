# Build for Coolify / self-hosted VPS deployment
# Usage: docker build -t poetry-app . && docker run -d -p 3000:3000 poetry-app

FROM node:22-slim

# Retry apt downloads up to 3 times on slow/unstable networks
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80retry \
    && apt-get update \
    && apt-get install -y --no-install-recommends --fix-missing sqlite3 \
    && rm -rf /var/lib/apt/lists /tmp/* /var/tmp/*

WORKDIR /app

COPY package*.json ./

# npm ci fails often on unstable connections; fall back to npm install with retries
# The extra --prefer-offline flag helps when packages are already in any local cache
RUN npm install --prefer-offline --retry 3 --no-audit --no-fund || \
    npm install --retry 3 --no-audit --no-fund

# Copy migrate script before "COPY . ." so it's available after .dockerignore exclusions
COPY scripts/migrate.js ./

COPY . .

RUN npx next build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "-c", "node scripts/migrate.js && npm start"]