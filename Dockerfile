# Build for Coolify / self-hosted VPS deployment
# Usage: docker build -t poetry-app . && docker run -d -p 3000:3000 poetry-app

FROM node:22-slim

# Use a more reliable mirror and retry logic for slow/unstable networks
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80retry \
    && apt-get update \
    && apt-get install -y --no-install-recommends --fix-missing sqlite3 \
    && rm -rf /var/lib/apt/lists /tmp/* /var/tmp/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy migrate script before "COPY . ." so it's available after .dockerignore exclusions
COPY scripts/migrate.js ./

COPY . .

RUN npx next build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "-c", "node scripts/migrate.js && npm start"]