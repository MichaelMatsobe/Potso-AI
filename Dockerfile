# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY backend/ ./backend/
COPY public/ ./public/
COPY index.html .
COPY vite.config.ts .
COPY server.ts .

# Build web app
RUN npm run build:web

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built web app from builder
COPY --from=builder /app/dist ./dist

# Copy backend code
COPY backend/ ./backend/
COPY server.ts .
COPY tsconfig.json .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to run Node.js
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "server.ts"]
