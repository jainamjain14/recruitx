# ==========================================
# RecruitX Multi-Stage Production Dockerfile
# Stage 1: Build Client (Vite + React + TS)
# Stage 2: Build Server (Node.js + TS)
# Stage 3: Production Runtime
# ==========================================

# ------------------------------------------
# Stage 1: Client Build
# ------------------------------------------
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ------------------------------------------
# Stage 2: Server Build
# ------------------------------------------
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ------------------------------------------
# Stage 3: Production Runtime
# ------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy compiled server build
COPY --from=server-builder /app/server/dist ./server/dist

# Ensure uploads directory exists (runtime-generated, not copied from host)
RUN mkdir -p ./server/uploads

# Copy compiled client build for static serving (if served by server or reverse proxy)
COPY --from=client-builder /app/client/dist ./client/dist

# Expose HTTP port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/server.js"]
