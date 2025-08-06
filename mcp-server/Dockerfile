# -------- build stage --------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# -------- runtime --------
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy the jobs seed data (must be pulled with git lfs before build)
COPY --from=builder /app/jobs_seed.json ./

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["sh", "-c", "node dist/scripts/ensureJobsIdx.js && node dist/index.js"]
    