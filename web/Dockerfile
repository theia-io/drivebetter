# ---- Base image ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (cached) ----
FROM base AS deps
# Only copy lockfiles/manifests for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build ----
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=http://193.169.241.16/api/v1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Next.js app
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4200
ENV HOSTNAME=0.0.0.0

# (Optional) run as non-root
# RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# If you have a Next config, copy it (supports either extension)
# (Safe to omit if none exists)
# COPY --from=builder /app/next.config.js ./next.config.js
# COPY --from=builder /app/next.config.mjs ./next.config.mjs

# USER nextjs

EXPOSE 4200
CMD ["npm", "run", "start"]
