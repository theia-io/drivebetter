# ---- Base image ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies layer (cached) ----
FROM base AS deps
# Copy only manifests to maximize build cache
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build layer ----
FROM base AS builder
# Bring in node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the project
COPY . .
ENV NODE_ENV=production
# Build Next.js (Pages Router) and compile server (server.ts -> dist/)
# Requires "build": "next build && tsc -p tsconfig.server.json" in package.json
RUN npm run build

# ---- Runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Optionally create non-root user
# RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# USER nextjs

# Copy production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/config ./config
COPY --from=builder /app/next.config.cjs ./next.config.cjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Start Express + Next server (server.ts compiled to dist/server.js)
# Requires "start": "node dist/server.js" in package.json
CMD ["npm", "run", "start"]
