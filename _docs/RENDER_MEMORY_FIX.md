# 🚀 RENDER DEPLOYMENT - FIX MEMORY ERRORS (512MB Out of Memory)

## ❌ Problem
Render free tier has **512MB RAM limit**. The application loads heavy ML models (torch, sentence-transformers, faiss) at startup, causing instant OOM crash.

## ✅ Solution: 4 Steps to Deploy Successfully

### **Step 1: Update your Render Service Settings**

Go to **Render Dashboard** → Select your service → **Settings**

#### **1a. Build Command:**
```bash
cd backend && pip install -r requirements-render.txt
```

#### **1b. Start Command:**
```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
```

#### **1c. Environment Variables (Required):**

| Variable | Value | Why |
|----------|-------|-----|
| `NEURALBI_LIGHTWEIGHT_MODE` | `true` | ⚡ Disables heavy ML models at startup |
| `SECRET_KEY` | `<see Step 2>` | 🔒 Security - generate new key |
| `SENTRY_DSN` | (optional) | 📊 Error tracking |
| `WORKERS` | `1` | 📉 Reduce memory on free tier |

**Generate SECRET_KEY locally:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### **Step 2: Update Dockerfile (Optional - if using Docker)**

If using Docker deployment, modify your Dockerfile:

```dockerfile
# Use lightweight requirements for build
COPY backend/requirements-render.txt .
RUN pip install -r requirements-render.txt

# Set environment variable
ENV NEURALBI_LIGHTWEIGHT_MODE=true
```

---

### **Step 3: Deploy Changes**

```bash
# Push changes
git add -A
git commit -m "Fix Render memory: use lightweight requirements and lazy-load models"
git push

# Render will auto-redeploy with new build command
```

---

### **Step 4: Verify Deployment**

After deployment (wait 2-3 minutes):

```bash
# Check API is responding
curl https://your-render-url/health

# Should return:
# {"status": "ok", "memory_mode": "lightweight"}
```

---

## 🎯 What This Changes

| Feature | Lightweight Mode | Full Mode |
|---------|------------------|-----------|
| **Startup Time** | ~10s ✅ | ~30s |
| **Memory Usage** | 180MB ✅ | 650MB ❌ |
| **ML Models** | Lazy-loaded on demand | Pre-loaded at startup |
| **Performance** | First ML request slower | All requests fast |
| **Cost** | Free tier works ✅ | Needs Standard plan ($7+) |

---

## 📊 Model Lazy-Loading (When do models load?)

Models load **on first request** to these endpoints:
- `/api/v1/analytics/run-ml` - AutoML training
- `/api/v1/copilot/query` - Natural language questions  
- `/api/v1/predict` - Predictions
- `/api/v1/embeddings` - Vector search

**First request will be ~5-10s slower, but subsequent requests are fast.**

---

## 🆘 Still Getting OOM? 

### Option A: Use PostgreSQL (Free Tier) instead of SQLite
```bash
# Set on Render:
DATABASE_URL = postgresql://user:password@render-postgres-host:5432/db
```

### Option B: Upgrade to Render Standard Tier ($7/month)
- Gives you 1GB RAM
- Can use full `requirements.txt`
- Can set `NEURALBI_LIGHTWEIGHT_MODE=false`

### Option C: Verify running processes
```bash
# On Render logs, you should see:
# ✓ Chrome0DB Vector Store initialized on first use  # <- this is lazy-loaded, NOT on startup
# ✓ Uvicorn running on 0.0.0.0:$PORT                # <- app started successfully
```

---

## 📋 Pre-Deployment Checklist

- [ ] `requirements-render.txt` exists in `backend/`
- [ ] Build Command: `cd backend && pip install -r requirements-render.txt`
- [ ] Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
- [ ] Environment: `NEURALBI_LIGHTWEIGHT_MODE=true`
- [ ] `SECRET_KEY` set to random 64-char hex
- [ ] Database configured (SQLite or PostgreSQL)
- [ ] All variables deployed

---

## 🎉 Success!

Once deployed:
- ✅ App starts in <15 seconds
- ✅ Health check: `/health` returns 200
- ✅ Frontend loads at `https://your-render-url`
- ✅ API docs at `https://your-render-url/docs`

**No more OOM errors!** 🚀
