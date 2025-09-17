# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Enable Corepack so pnpm is available
RUN corepack enable

# ---- Deps (install with dev deps) ----
FROM base AS deps
ENV NODE_ENV=development
# Root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Workspace package manifests (adjust to your repo)
COPY apps/ui/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json

# Activate pinned pnpm
ARG PNPM_VERSION=8.15.0
RUN corepack prepare pnpm@${PNPM_VERSION} --activate

# Install workspace deps (including devDependencies like turbo)
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
#ENV NODE_ENV=production
WORKDIR /app
# Reuse deps + manifests
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
# Copy the rest of the monorepo
COPY . .

# Ensure Turbo uses pnpm
ENV TURBO_PACKAGE_MANAGER=pnpm
# Build only the web app and its deps
RUN pnpm -w turbo run build --filter=web

# ---- Runtime (prod-only deps) ----
FROM node:20-alpine AS runner
WORKDIR /app
#ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4200
ENV HOSTNAME=0.0.0.0

# Optional non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy Next standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 4200
CMD ["node", "apps/web/server.js"]
