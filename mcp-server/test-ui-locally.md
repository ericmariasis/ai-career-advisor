# 🌐 Local UI Testing Guide

## 🎯 **Testing Approaches**

### **Method 1: Fix nginx and Test Full Stack**

1. **Restart nginx on a different port:**
   ```bash
   # Change port in docker-compose.yml
   sed -i 's/"80:80"/"8082:80"/g' docker-compose.yml
   
   # Restart nginx
   docker-compose down nginx
   docker-compose up -d nginx
   
   # Check if it's working
   curl http://localhost:8082
   ```

2. **If port 8082 works, test the full UI:**
   - **Frontend**: http://localhost:8082
   - **API calls**: Go through nginx to backend
   - **All security**: Active and working

### **Method 2: Direct Container Access**

1. **Find the web container port:**
   ```bash
   docker-compose ps web
   # Look for port mappings like 0.0.0.0:3000->3000/tcp
   ```

2. **Access frontend directly:**
   - **Frontend**: http://localhost:3000 (or whatever port is mapped)
   - **Backend**: http://localhost:4000 (direct API access)

### **Method 3: Port Forwarding**

If nginx won't bind, create a temporary port forward:
```bash
# Forward local port 8082 to nginx container
docker run --rm -p 8082:80 --link mcp-server-nginx-1:nginx nginx:alpine
```

## 🧪 **Complete UI Testing Checklist**

### **1. Frontend Functionality**
- [ ] ✅ Page loads correctly
- [ ] ✅ Search bar works
- [ ] ✅ Job cards display
- [ ] ✅ Resume upload works
- [ ] ✅ Navigation works

### **2. Backend Security (Test via UI)**
- [ ] ✅ Resume matcher works (but rate limited)
- [ ] ✅ Resume feedback works (but rate limited)
- [ ] ✅ Search works (but rate limited)
- [ ] ✅ Invalid input gets blocked

### **3. Rate Limiting Tests via UI**
1. **Resume Matcher**: Upload 6 resumes quickly → should get blocked
2. **Resume Feedback**: Request feedback 4 times → should get blocked
3. **Search**: Search 31 times in 1 minute → should get blocked

### **4. Monitor Usage in Real-Time**
Open in another tab: http://localhost:4000/api/admin/usage

## 🚀 **Quick Test Commands**

```bash
# Test if containers are running
docker-compose ps

# Test backend directly
curl http://localhost:4000/health

# Test frontend (try different ports)
curl http://localhost:3000
curl http://localhost:8080  
curl http://localhost:8082

# Check nginx logs if it's not working
docker-compose logs nginx

# Restart everything if needed
docker-compose down && docker-compose up -d
```

## 🎯 **Expected UI Behavior with Security**

### **Resume Matcher Section:**
1. **First 5 uploads**: Should work normally, show job matches
2. **6th upload**: Should show rate limit error
3. **After 15 minutes**: Should work again

### **Resume Feedback Section:**
1. **First 3 requests**: Should work normally, show feedback
2. **4th request**: Should show rate limit error  
3. **After 1 hour**: Should work again

### **Search Section:**
1. **First 30 searches/minute**: Should work normally
2. **31st search**: Should show rate limit error
3. **After 1 minute**: Should work again

### **Invalid Input:**
- **Spam text**: Should show validation error
- **Too long text**: Should show validation error
- **Malicious queries**: Should show validation error

## 📊 **Monitoring Dashboard**

While testing the UI, keep this open in another tab:
- **Usage Stats**: http://localhost:4000/api/admin/usage
- **Health Check**: http://localhost:4000/health

## 🔧 **Troubleshooting**

### **If Frontend Won't Load:**
1. Check web container: `docker-compose ps web`
2. Check web logs: `docker-compose logs web`
3. Try direct port: http://localhost:3000

### **If API Calls Fail:**
1. Check backend: `curl http://localhost:4000/health`
2. Check backend logs: `docker-compose logs server`
3. Check nginx logs: `docker-compose logs nginx`

### **If nginx Won't Start:**
1. Check port conflicts: `netstat -ano | findstr :80`
2. Try different port: Change docker-compose.yml
3. Disable SSL: `echo "# SSL disabled" > nginx/ssl.conf`

## ✅ **Success Criteria**

Your local UI testing is successful when:
- ✅ **Frontend loads** and is functional
- ✅ **API calls work** through nginx or directly
- ✅ **Rate limiting triggers** after limits are exceeded
- ✅ **Input validation blocks** spam/malicious content
- ✅ **Usage monitoring shows** real-time stats
- ✅ **Error messages** are user-friendly

## 🎉 **Ready for Production**

Once local testing passes, your security implementation is ready for production deployment!
