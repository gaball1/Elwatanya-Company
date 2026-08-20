# =============================================================================
# El Wataniya ERP - Frontend production image (Next.js standalone)
# Build context must be the repository ROOT (monorepo workspaces + lockfile).
# =============================================================================

# ---- deps: install ALL workspace deps (dev needed for next build) ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --include-workspace-root --no-audit --no-fund

# ---- builder: `next build` with standalone output ---------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_API_URL is baked into the BROWSER bundle: it must be the public
# HTTPS origin the browser can reach through the TLS reverse proxy
# (e.g. https://erp.example.com/api/v1). Do NOT use a docker-internal hostname.
# BACKEND_API_URL is server-only (used by Next.js rewrites) and should target
# the internal backend (e.g. http://backend:3001/api/v1 inside the compose net).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG BACKEND_API_URL=http://localhost:3001/api/v1
ENV BACKEND_API_URL=$BACKEND_API_URL
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY --from=deps /app/node_modules ./node_modules
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

# ---- runtime: standalone server ---------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# The standalone output preserves monorepo paths: server.js lives at
# ./frontend/server.js, so static assets and public must land under
# ./frontend/.next and ./frontend/public for the standalone server to find them.
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

RUN chown -R node:node /app
USER node
EXPOSE 3000

CMD ["node", "frontend/server.js"]
