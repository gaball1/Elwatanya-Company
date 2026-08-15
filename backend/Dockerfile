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
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# ---- runtime: minimal, runs migrations then serves --------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# Download Chromium + its full system dependency set (Playwright PDF engine).
# `install --with-deps` pulls every required apt package automatically; we run
# as root here and drop privileges afterwards. --no-sandbox flags are already
# set in PdfRendererService, so no sandbox setup is needed.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Prisma needs a writable cache dir and the app writes uploads.
RUN mkdir -p /app/uploads /app/generated-pdfs /app/.prisma /ms-playwright \
    && chown -R node:node /app /ms-playwright
USER node
EXPOSE 3001

# Run DB migrations (deploy, non-interactive) before starting the app.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
