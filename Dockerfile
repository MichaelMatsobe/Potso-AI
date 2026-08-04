# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
COPY backend/ ./backend/
COPY public/ ./public/
COPY index.html .
COPY vite.config.ts .
COPY server.ts .
RUN npm run build:web

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
# tsx needed to run TypeScript server without a separate compile step
RUN npm ci --omit=dev && npm install tsx@4.21.0 --no-save
COPY --from=builder /app/dist ./dist
COPY backend/ ./backend/
COPY server.ts .
COPY tsconfig.json .

RUN addgroup -g 1001 -S nodejs && adduser -S potso -u 1001 -G nodejs
USER potso

ENV NODE_ENV=production
ENV API_PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
# In production, Express serves dist/ and listens on API_PORT
CMD ["npx", "tsx", "server.ts"]
