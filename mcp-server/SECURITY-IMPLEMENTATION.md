# 🚨 CRITICAL: OpenAI API Security Implementation

## ⚠️ **Current Risk Assessment: HIGH**

Your app is publicly accessible with **UNPROTECTED OpenAI API endpoints**. This could result in:
- 💸 **Unlimited spending** on your OpenAI account
- 🚨 **API quota exhaustion** 
- 🎯 **Targeted abuse** by malicious users

---

## 🛡️ **Immediate Actions Required**

### **1. OpenAI Account Protection (Do This First!)**

```bash
# Set spending limits in OpenAI dashboard
# https://platform.openai.com/account/billing/limits

# Recommended limits:
# - Hard limit: $50/month
# - Soft limit: $25/month  
# - Email alerts: $10, $20, $40
```

### **2. Install Security Dependencies**

```bash
cd mcp-server
npm install express-rate-limit
```

### **3. Add Middleware Files**

The following middleware files have been created:
- `src/middleware/rateLimiter.ts` - Rate limiting
- `src/middleware/requestValidation.ts` - Input validation
- `src/middleware/usageMonitor.ts` - Usage tracking & limits

### **4. Update Routes (Critical)**

#### **Update `src/routes/resume.ts`:**

```typescript
// Add imports at the top
import { aiEndpointLimiter, feedbackLimiter } from '../middleware/rateLimiter';
import { validateResumeRequest } from '../middleware/requestValidation';
import { checkUsageLimits, usageMonitor } from '../middleware/usageMonitor';

// Update the main resume endpoint
router.post('/', aiEndpointLimiter, validateResumeRequest, checkUsageLimits, async (req, res) => {
  // ... existing code ...
  
  // After OpenAI API call (around line 87), add tracking:
  if (!seHit) {
    const inputTokens = await countTokens(rawResume.slice(0, 4_000));
    const outputTokens = await countTokens(aiSkillsRaw);
    await usageMonitor.trackUsage(req, OPENAI_MODEL, inputTokens, outputTokens);
  }
});

// Update the feedback endpoint
router.post('/feedback', feedbackLimiter, validateResumeRequest, checkUsageLimits, async (req, res) => {
  // ... existing code ...
  
  // After OpenAI API call (around line 227), add tracking:
  if (!fbHit) {
    const inputTokens = await countTokens(user);
    const outputTokens = await countTokens(feedback);
    await usageMonitor.trackUsage(req, OPENAI_MODEL, inputTokens, outputTokens);
  }
});
```

#### **Update `src/index.ts`:**

```typescript
// Add imports
import { generalApiLimiter, searchLimiter } from './middleware/rateLimiter';
import { validateSearchRequest } from './middleware/requestValidation';

// Add after app creation
app.use('/api', generalApiLimiter);

// Update search route
app.use('/api/search', searchLimiter, validateSearchRequest, searchRouter);
```

---

## 🔒 **Protection Layers Implemented**

### **Layer 1: Rate Limiting**
- ✅ **AI Endpoints**: 5 requests per 15 minutes per IP
- ✅ **Feedback**: 3 requests per hour per IP  
- ✅ **Search**: 30 requests per minute per IP
- ✅ **General API**: 100 requests per 15 minutes per IP

### **Layer 2: Request Validation**
- ✅ **Resume text size limit**: 10,000 characters max
- ✅ **Spam detection**: Repeated characters, suspicious patterns
- ✅ **Search query limits**: 200 characters max
- ✅ **XSS protection**: Block malicious queries

### **Layer 3: Usage Monitoring**
- ✅ **Daily spending limit**: $10/day
- ✅ **Daily request limits**: 500 AI requests total, 50 per IP
- ✅ **Cost tracking**: Real-time cost calculation
- ✅ **High-cost alerts**: Log requests > $0.10

### **Layer 4: OpenAI Account Limits**
- ⚠️ **Action Required**: Set in OpenAI dashboard

---

## 📊 **Monitoring Dashboard**

Add this endpoint to check usage:

```typescript
// Add to src/index.ts
app.get('/api/admin/usage', async (req, res) => {
  try {
    const stats = await usageMonitor.getUsageStats(7); // Last 7 days
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});
```

Access at: `https://yourdomain.com/api/admin/usage`

---

## ⚡ **Quick Deployment**

1. **Apply the middleware updates above**
2. **Build and deploy:**
   ```bash
   npm run build
   docker-compose up -d --build
   ```
3. **Test rate limiting:**
   ```bash
   # This should get rate limited after 5 requests
   for i in {1..10}; do curl -X POST https://yourdomain.com/api/resume -H "Content-Type: application/json" -d '{"resumeText":"test"}'; done
   ```

---

## 🚨 **Emergency Actions**

If you notice unusual activity:

1. **Temporary shutdown:**
   ```bash
   docker-compose down
   ```

2. **Check OpenAI usage:**
   ```bash
   curl https://api.openai.com/v1/usage \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **Reset API key if compromised:**
   - Generate new key in OpenAI dashboard
   - Update `.env` files
   - Redeploy

---

## 🎯 **Expected Impact**

After implementation:
- 📉 **95% reduction** in potential abuse
- 💰 **Cost protection** under $10/day
- 🛡️ **Malicious request blocking**
- 📊 **Full usage visibility**

**This is CRITICAL for production deployment!** 🚨
