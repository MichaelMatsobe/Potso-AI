# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./

RUN npm ci

COPY src/ ./src/
COPY backend/ ./backend/
COPY server.ts ./
COPY public/ ./public/ 2>/dev/null || true

RUN npm run build:web

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
# Install all deps (tsx needed to run TypeScript server)
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY backend/ ./backend/
COPY server.ts ./
COPY tsconfig.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S potso -u 1001 && \
    chown -R potso:nodejs /app

USER potso

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => { if (r.statusCode !== 200) process.exit(1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "server.ts"]
