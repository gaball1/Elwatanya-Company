# =============================================================================
# El Wataniya ERP - Backend production image (NestJS + Prisma + Playwright)
# Build context must be the repository ROOT (monorepo workspaces + lockfile).
# =============================================================================

# ---- deps: install backend workspace (includes dev) so prisma/playwright are
#      available to generate and build. NOTE: we intentionally install ONLY the
#      backend workspace: the repo root pins typescript@6 while the backend
#      pins typescript@5, and installing the workspace root would hoist TS 6
#      and break `nest build`. -----------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --no-audit --no-fund

# ---- builder: generate Prisma client and compile NestJS --------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY --from=deps /app/node_modules ./node_modules
# backend/node_modules holds the workspace-nested typescript@5.9.3 (the root
# pins typescript@6, which hoists to /app/node_modules and would otherwise be
# resolved by @nestjs/cli, breaking `nest build` with TS5107/TS5101).
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# ---- runtime: minimal, runs migrations then serves --------------------------
# Official Playwright image: Chromium (matching playwright@^1.62.1) and its
# system deps are pre-baked at /ms-playwright, so no per-build browser
# download/apt step is needed. --no-sandbox flags are already set in
# PdfRendererService, so no sandbox setup is required.
FROM mcr.microsoft.com/playwright:v1.62.1-noble-amd64 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=builder /app/node_modules ./node_modules
# Mirror the builder layout (backend workspace root): the backend's own
# node_modules may hold workspace-nested packages (e.g. uuid), and dist/prisma
# must sit under /app/backend so module resolution from the compiled output
# finds them exactly as it did during `nest build`.
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Prisma needs a writable cache dir and the app writes uploads.
RUN mkdir -p /app/uploads /app/generated-pdfs /app/.prisma \
    && chown -R ubuntu:ubuntu /app
USER ubuntu
EXPOSE 3001

# Run DB migrations (deploy, non-interactive) before starting the app.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./backend/prisma/schema.prisma && node backend/dist/src/main.js"]
