# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/
COPY backend/ ./backend/
COPY index.html .
COPY vite.config.ts .
COPY server.ts .

# Build web app
RUN npm run build:web

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx --save-prod

COPY --from=builder /app/dist ./dist
COPY backend/ ./backend/
COPY server.ts .
COPY tsconfig.json .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S potso -u 1001 && \
    chown -R potso:nodejs /app

USER potso

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O - http://localhost:8080/api/health || exit 1

ENV NODE_ENV=production
ENV API_PORT=8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "server.ts"]
