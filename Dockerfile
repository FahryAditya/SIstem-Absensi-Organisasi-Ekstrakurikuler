# =========================
# BASE IMAGE
# =========================
FROM node:20-alpine AS base

# =========================
# DEPENDENCIES STAGE
# =========================
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependency files dulu (biar cache optimal)
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install --legacy-peer-deps

# =========================
# BUILDER STAGE
# =========================
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy node_modules dari deps
COPY --from=deps /app/node_modules ./node_modules

# Copy project files (PENTING: prisma harus ikut di sini)
COPY . .

# Pastikan Prisma schema ada sebelum generate
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Disable telemetry Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN npm run build

# =========================
# PRODUCTION STAGE
# =========================
FROM base AS runner

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create user (security best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js build output
# COPY --from=builder /app/public ./public (Dikomen karena project Anda tidak memiliki folder public)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma (untuk runtime & migration)
COPY --from=builder /app/prisma ./prisma

# Copy scripts jika ada (optional)
COPY --from=builder /app/scripts ./scripts

# Entry point script (optional tapi bagus untuk migration auto-run)
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start app
ENTRYPOINT ["./entrypoint.sh"]