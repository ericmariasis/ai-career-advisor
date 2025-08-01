# ────────── build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# 1. install *all* deps (build needs tsc, etc.)
COPY package*.json ./
RUN npm ci

# 2. compile TS → dist/
COPY . .
RUN npm run build

# ────────── runtime (stage-2) ─────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# copy just the bits we need from the builder image
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist          ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
