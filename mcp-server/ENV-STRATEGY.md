# 🔧 Environment Variables Strategy

## 📋 **Current Situation**

Your `docker-compose.yml` uses `env_file: .env.docker` for both `web` and `server` services.

## 🎯 **Two Deployment Strategies**

### **Option 1: Keep `.env.docker` (Recommended for Production)**

**Best for**: Production deployments with sensitive keys

**How it works**:
```yaml
web:
  image: ghcr.io/ericmariasis/ai-web:latest
  env_file:
    - .env.docker  # ✅ KEEP THIS

server:
  build:
    context: .
  env_file:
    - .env.docker  # ✅ KEEP THIS
```

**Requires**: Creating `.env.docker` with your keys:
```bash
# .env.docker (create this file)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_SEARCH_KEY=your_search_key
ALGOLIA_INDEX=jobs
OPENAI_API_KEY=your_openai_key
REDIS_URL=redis://redis:6379
PORT=4000
NODE_ENV=production

# Frontend variables
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY=your_search_key
NEXT_PUBLIC_ALGOLIA_INDEX=jobs
```

### **Option 2: Remove `.env.docker` (Host Environment)**

**Best for**: Simple deployments where host has environment variables

**How it works**:
```yaml
web:
  image: ghcr.io/ericmariasis/ai-web:latest
  # No env_file - uses host environment
  environment:
    - NEXT_PUBLIC_ALGOLIA_APP_ID=${ALGOLIA_APP_ID}
    - NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY=${ALGOLIA_SEARCH_KEY}
    - NEXT_PUBLIC_ALGOLIA_INDEX=${ALGOLIA_INDEX}

server:
  build:
    context: .
  # No env_file - uses host environment
  environment:
    - REDIS_URL=redis://redis:6379
    - PORT=4000
    - OPENAI_API_KEY=${OPENAI_API_KEY}
```

**Requires**: Setting environment variables on host:
```bash
export ALGOLIA_APP_ID=your_app_id
export ALGOLIA_SEARCH_KEY=your_search_key
export OPENAI_API_KEY=your_openai_key
```

## 🚀 **My Recommendation**

**For Production**: **Keep `env_file: .env.docker`**

**Why**:
- ✅ **Security**: Keeps secrets in a file (not command line)
- ✅ **Consistency**: Same config across environments
- ✅ **Simplicity**: One file with all variables
- ✅ **Git-safe**: `.env.docker` should be in `.gitignore`

## 🛠 **What You Need to Do**

1. **Create `.env.docker`** with your actual keys
2. **Add to `.gitignore`**:
   ```
   .env.docker
   .env
   *.env.local
   ```
3. **Keep current `docker-compose.yml`** structure

## ⚠️ **Important Notes**

- **Never commit** `.env.docker` to git
- **Frontend variables** need `NEXT_PUBLIC_` prefix to work in browser
- **Backend variables** don't need prefix
- **Production deployment** needs `.env.docker` on the server
