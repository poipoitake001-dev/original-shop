# ============================================================
# Space Card Shop - Production Multi-Stage Dockerfile
# Stack: Vite+React frontend / Express.js backend / MySQL
# ============================================================

# ----------------------------------------------------------
# Stage 1: Build frontend assets with Vite
# ----------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY frontend/ ./
RUN npm run build


# ----------------------------------------------------------
# Stage 2: Install backend production dependencies
# ----------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /build

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev


# ----------------------------------------------------------
# Stage 3: Production runner (minimal image)
# ----------------------------------------------------------
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app/backend

# Copy production node_modules from deps stage
COPY --from=deps /build/node_modules ./node_modules

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets to where server.js expects them
# server.js: path.join(__dirname, '../frontend/dist')
COPY --from=frontend-builder /build/frontend/dist ../frontend/dist

# Admin panel is embedded in server.js — no separate static files needed

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/products || exit 1

CMD ["node", "server.js"]
