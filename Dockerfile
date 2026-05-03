# Build for Coolify / self-hosted VPS deployment
# Usage: docker build -t poetry-app . && docker run -d -p 3000:3000 poetry-app

FROM node:22-slim

WORKDIR /app

COPY package*.json ./

# npm ci fails often on unstable connections; fall back to npm install with retries
RUN npm install --prefer-offline --retry 3 --no-audit --no-fund || \
    npm install --retry 3 --no-audit --no-fund

# Copy migrate script before "COPY . ." so it's available after .dockerignore exclusions
# Strip any CRLF from the script so Node.js can parse it (DOS line endings break shebang)
COPY scripts/migrate.js ./migrate.js
RUN sed -i 's/\r$//' migrate.js

COPY . .

RUN npx next build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "-c", "node migrate.js && node .next/standalone/server.js"]