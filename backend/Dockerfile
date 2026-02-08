# Multi-stage build for security and size optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# ─────────────────────────────────────────────────
# Production stage
# ─────────────────────────────────────────────────
FROM node:18-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app

# Copy built dependencies
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/ ./

USER nodeuser

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

CMD ["node", "src/server.js"]
