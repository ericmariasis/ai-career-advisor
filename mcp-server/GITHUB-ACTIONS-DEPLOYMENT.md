# 🚀 GitHub Actions Production Deployment Guide

## ✅ **What's Set Up**

### **1. Enhanced GitHub Actions Workflow**
- **File**: `.github/workflows/build-and-deploy.yml`
- **Triggers**: Push to `main` branch OR manual dispatch
- **Builds**: Both `web` and `server` images
- **Deploys**: Automatically to your production server

### **2. Production-Ready docker-compose.yml**
- **Web service**: Uses `ghcr.io/ericmariasis/ai-web:latest`
- **Server service**: Uses `ghcr.io/ericmariasis/ai-server:latest`
- **Nginx**: Production ports (80:80, 443:443)

## 🎯 **How to Deploy**

### **Step 1: Commit Your Changes**
```bash
# Add all your fixes
git add .

# Commit with a descriptive message
git commit -m "Fix console errors: API endpoint and Algolia handling"

# Push to main (this triggers the deployment!)
git push origin main
```

### **Step 2: Monitor the Deployment**
1. **Go to**: https://github.com/ericmariasis/ai-career-advisor/actions
2. **Watch**: The "Build & Deploy to Production" workflow
3. **Check**: All jobs complete successfully

### **Step 3: Verify Production**
After deployment completes:
```bash
# Test your production site
curl -I https://careercodeadvisor.com
curl -I https://careercodeadvisor.com/api/search

# Check that console errors are gone
# Open browser → Click job card → Check console
```

## 🔧 **What the Workflow Does**

### **Build Phase:**
1. **Build Web Image**: 
   - Uses your fixed `web/app/hooks/useLiveFavorites.ts`
   - Uses your fixed `web/app/insightsClient.ts`
   - Pushes to `ghcr.io/ericmariasis/ai-web:latest`

2. **Build Server Image**:
   - Uses your security middleware
   - Uses your rate limiting
   - Pushes to `ghcr.io/ericmariasis/ai-server:latest`

### **Deploy Phase:**
1. **SSH to Production Server**
2. **Pull Latest Code**: `git pull --ff-only`
3. **Pull New Images**: `docker compose pull web server`
4. **Restart Services**: `docker compose up -d`
5. **Clean Up**: `docker image prune -f`

## 🎉 **Expected Results**

After deployment:
- ✅ **Console errors gone** when clicking job cards
- ✅ **All security features** active (rate limiting, etc.)
- ✅ **Clean production logs**
- ✅ **Automatic SSL** working
- ✅ **All API endpoints** functional

## 🚨 **Troubleshooting**

### **If Workflow Fails:**
1. **Check GitHub Secrets**: Ensure `GHCR_USERNAME`, `GHCR_TOKEN`, `LS_HOST`, `LS_USER`, `LS_SSH_KEY` are set
2. **Check Server Access**: Ensure SSH key works
3. **Check Docker Registry**: Ensure you can push to ghcr.io

### **If Deployment Fails:**
1. **SSH to Server**: `ssh user@your-server`
2. **Check Logs**: `docker-compose logs`
3. **Manual Deploy**: 
   ```bash
   cd ~/ai-career-advisor/mcp-server
   git pull origin main
   docker-compose pull
   docker-compose up -d
   ```

## 🔄 **Manual Deployment (If Needed)**

If you need to deploy manually:
```bash
# On your production server
cd ~/ai-career-advisor/mcp-server
git pull origin main
docker-compose pull web server
docker-compose up -d
```

## 🎯 **Next Steps**

1. **Push your changes**: `git push origin main`
2. **Watch the workflow**: Monitor GitHub Actions
3. **Test production**: Verify console errors are gone
4. **Celebrate**: Your app is now properly deployed! 🎉

## 📋 **Checklist**

- [ ] ✅ Console error fixes committed
- [ ] ✅ docker-compose.yml updated for production
- [ ] ✅ GitHub Actions workflow created
- [ ] ✅ GitHub secrets configured
- [ ] ✅ Push to main branch
- [ ] ✅ Monitor deployment
- [ ] ✅ Test production site
- [ ] ✅ Verify console errors gone

**You're ready to deploy! Just push to main and GitHub Actions will handle the rest.** 🚀
