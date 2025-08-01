# ---- builder stage ----
    FROM node:20-bookworm-slim AS builder

    RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 build-essential \
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
&& rm -rf /var/lib/apt/lists/*
    
    ENV PATH="/root/.cargo/bin:${PATH}" \
    npm_config_build_from_source=true
    
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --unsafe-perm
    COPY . .                                  
    RUN npm run build                           
    
    # ---- runtime stage ----
FROM node:20-bookworm-slim AS runner

# Install both runtime libraries AND build tools to rebuild native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Runtime libraries
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libfontconfig1 \
    libxrender1 \
    libxext6 \
    libx11-6 \
    libjpeg62-turbo \
    libpng16-16 \
    libgif7 \
    librsvg2-2 \
    # Build tools for rebuilding native modules
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy standalone bundle (this puts server.js at /app/server.js)
COPY --from=builder /app/.next/standalone ./

# Rebuild native modules for the current platform
RUN npm rebuild canvas --build-from-source

# Remove Windows-compiled .node files and rebuild them for Linux
RUN find /app/.next/server -name "*.node" -delete || true

# The canvas rebuild should have created proper Linux binaries in node_modules
# Copy the Linux-compiled canvas binary to where Next.js expects it
RUN if [ -f /app/node_modules/canvas/build/Release/canvas.node ]; then \
      cp /app/node_modules/canvas/build/Release/canvas.node /app/.next/server/chunks/canvas.node; \
    fi

# Create the expected directory structure for the API route
RUN mkdir -p /app/.next/server/app/api/resume/upload/_next && \
    if [ -f /app/.next/server/chunks/canvas.node ]; then \
      ln -sf /app/.next/server/chunks/canvas.node /app/.next/server/app/api/resume/upload/_next/; \
    fi

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
    