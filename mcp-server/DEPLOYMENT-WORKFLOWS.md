# Deployment Workflows

## 🎯 Initial Production Setup (One-Time Only)

### **Step 1: Server Preparation**
```bash
# Install Docker & Docker Compose (if not already installed)
sudo apt update
sudo apt install -y docker.io docker-compose certbot

# Clone your repository
git clone https://github.com/your-username/ai-career-advisor.git
cd ai-career-advisor/mcp-server
```

### **Step 2: SSL Certificate Setup (One-Time)**
```bash
# Get SSL certificates (only needed once)
sudo certbot certonly --standalone \
  -d careercodeadvisor.com \
  -d www.careercodeadvisor.com

# Verify certificates were created
sudo ls -la /etc/letsencrypt/live/careercodeadvisor.com/
```

### **Step 3: Initial Deployment**
```bash
# Test nginx configuration
docker-compose run --rm nginx nginx -t

# Start all services
docker-compose up -d

# Verify everything is running
docker-compose ps
```

### **Step 4: Validation (One-Time)**
```bash
# Test HTTP and HTTPS endpoints
curl -I http://careercodeadvisor.com
curl -I https://careercodeadvisor.com
curl -I https://careercodeadvisor.com/api/search
```

---

## 🚀 Regular Deployments (Every Update)

### **Quick Deployment (Most Common)**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Restart services with new code/config
docker-compose up -d

# 3. Quick health check
curl -I https://careercodeadvisor.com/api/search
```

### **Full Deployment (When Unsure)**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Test nginx config (if nginx files changed)
docker-compose run --rm nginx nginx -t

# 3. Rebuild and restart services
docker-compose down
docker-compose up -d --build

# 4. Verify all services
docker-compose ps
curl -I https://careercodeadvisor.com
```

---

## 🤖 **Automated Deployment (Recommended)**

### **GitHub Actions Deployment (Already Set Up)**
Your `.github/workflows/build-web.yml` already handles:
- ✅ Building new images
- ✅ Pushing to registry
- ✅ Pulling on server
- ✅ Restarting services

**For most deployments, you just need to:**
```bash
git push origin main
# GitHub Actions handles the rest automatically!
```

---

## 🔧 **Maintenance Tasks**

### **SSL Certificate Renewal (Automatic)**
```bash
# Let's Encrypt auto-renews, but you can test:
sudo certbot renew --dry-run

# If manual renewal needed:
sudo certbot renew
docker-compose restart nginx
```

### **When to Run Different Commands:**

| **Scenario** | **Commands Needed** |
|--------------|-------------------|
| **Code changes only** | `git pull && docker-compose up -d` |
| **Nginx config changes** | `git pull && docker-compose run --rm nginx nginx -t && docker-compose up -d` |
| **New dependencies** | `git pull && docker-compose up -d --build` |
| **Major changes** | `git pull && docker-compose down && docker-compose up -d --build` |
| **SSL issues** | `sudo certbot renew && docker-compose restart nginx` |

---

## ⚡ **Most Common Deployment (90% of cases)**

```bash
# This is probably all you'll need most of the time:
git pull origin main
docker-compose up -d
```

The GitHub Actions workflow should handle most deployments automatically when you push to main!
