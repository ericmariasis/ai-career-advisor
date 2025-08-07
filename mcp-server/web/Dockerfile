# ---- builder stage ----
    FROM node:20-bookworm-slim AS builder

    # Add build arguments for Next.js public environment variables
    ARG NEXT_PUBLIC_ALGOLIA_APP_ID
    ARG NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY
    ARG NEXT_PUBLIC_ALGOLIA_INDEX

    # Set environment variables for the build process
    ENV NEXT_PUBLIC_ALGOLIA_APP_ID=$NEXT_PUBLIC_ALGOLIA_APP_ID
    ENV NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY=$NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY
    ENV NEXT_PUBLIC_ALGOLIA_INDEX=$NEXT_PUBLIC_ALGOLIA_INDEX

    RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 build-essential \
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
&& rm -rf /var/lib/apt/lists/*
    
    ENV PATH="/root/.cargo/bin:${PATH}" \
    npm_config_build_from_source=true
    
    WORKDIR /app
    COPY package*.json ./
    ENV NODE_OPTIONS="--max_old_space_size=2048"
    RUN npm ci --unsafe-perm
    COPY . .                                  
    RUN npm run build                           
    
    # ---- runtime stage ----
FROM node:20-bookworm-slim AS runner

# repeat the ARGs *and* promote them to ENV so they exist at runtime
ARG NEXT_PUBLIC_ALGOLIA_APP_ID
ARG NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY
ARG NEXT_PUBLIC_ALGOLIA_INDEX
ENV NEXT_PUBLIC_ALGOLIA_APP_ID=$NEXT_PUBLIC_ALGOLIA_APP_ID \
    NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY=$NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY \
    NEXT_PUBLIC_ALGOLIA_INDEX=$NEXT_PUBLIC_ALGOLIA_INDEX

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

# Install node_modules with package.json (includes canvas)
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Rebuild native modules for the current platform
RUN npm rebuild canvas --build-from-source

# Remove any Windows-compiled .node files from the Next.js build
RUN find /app/.next/server -name "*.node" -delete || true

# Create the expected directory structure for the API route and copy canvas.node
RUN mkdir -p /app/.next/server/app/api/resume/upload/_next && \
    if [ -f /app/node_modules/canvas/build/Release/canvas.node ]; then \
      cp /app/node_modules/canvas/build/Release/canvas.node /app/.next/server/app/api/resume/upload/_next/; \
    fi

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
    