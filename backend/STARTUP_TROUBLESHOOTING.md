# Backend Startup Troubleshooting Guide

## Issues Fixed

### 1. **Server Hanging During Startup** ✓ FIXED

#### Root Causes:
- **MongoDB connection timeout**: Default Mongoose timeout was 30 seconds, causing indefinite hangs when MongoDB is unavailable
- **Redis connection timeout**: No timeout configured, causing indefinite hangs when Redis is unavailable
- **No fallback handling**: Server would fail completely if external services were unavailable

#### Solutions Applied:
1. **Added connection timeouts**:
   - MongoDB: 5 second server selection timeout
   - Redis: 5 second connection timeout with retry logic

2. **Added graceful degradation**:
   - Server now continues to start even if MongoDB/Redis fail
   - Clear logging shows which services are connected/failed
   - Warnings indicate which features may not work

3. **Improved logging**:
   - Added connection attempt logs
   - Added success/failure indicators (✓/✗)
   - Added startup progress messages

### 2. **Mongoose Duplicate Index Warnings** ✓ FIXED

#### Root Causes:
Three models had duplicate index definitions:

1. **Team.model.ts**:
   - `managerId` had both `index: true` in field definition AND a separate index definition

2. **TrainingScenario.model.ts**:
   - `day` and `isActive` had `index: true` in field definitions
   - Same fields used in compound indexes

3. **Analytics.model.ts**:
   - Duplicate index on `userId + period.startDate + period.endDate`
   - One regular, one unique (only unique needed)

#### Solutions Applied:
- Removed `index: true` from field definitions when field is used in compound indexes
- Removed duplicate index definitions, keeping only the most specific ones (unique indexes)
- Kept compound indexes as they provide better query performance

---

## How to Start the Server

### Prerequisites
Make sure you have these services running:

#### 1. **MongoDB** (Required for full functionality)
```bash
# Option 1: Local MongoDB
mongod

# Option 2: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option 3: MongoDB Atlas (Cloud)
# Set MONGODB_URI in .env file
```

#### 2. **Redis** (Required for caching/sessions)
```bash
# Option 1: Local Redis
redis-server

# Option 2: Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Option 3: Cloud Redis
# Set REDIS_URL in .env file
```

### Environment Setup

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/sales-captain

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Start the Server

```bash
cd backend
npm install
npm run dev
```

### Expected Startup Output

**Successful startup (all services connected):**
```
DEBUG - OPENAI_API_KEY loaded: YES (starts with: sk-proj-x...)
Starting server initialization...
Attempting MongoDB connection...
MongoDB connected successfully
✓ MongoDB connected successfully
Attempting Redis connection...
Redis Client Connected
Redis Client Ready
✓ Redis connected successfully
✓ Server running on port 5000 in development mode
==================================================
Server initialization complete!
==================================================
```

**Partial startup (MongoDB fails):**
```
DEBUG - OPENAI_API_KEY loaded: YES (starts with: sk-proj-x...)
Starting server initialization...
Attempting MongoDB connection...
MongoDB connection failed: MongooseServerSelectionError: ...
✗ MongoDB connection failed: ...
Server will continue without MongoDB. Some features may not work.
Attempting Redis connection...
✓ Redis connected successfully
✓ Server running on port 5000 in development mode
==================================================
Server initialization complete!
==================================================
```

---

## Common Issues & Solutions

### Issue 1: Server Still Hangs
**Symptom**: Server shows Mongoose warnings but no further output

**Solution**:
1. Check if MongoDB is running:
   ```bash
   # Try connecting manually
   mongosh mongodb://localhost:27017
   ```

2. Check if Redis is running:
   ```bash
   # Try pinging Redis
   redis-cli ping
   # Should respond: PONG
   ```

3. Check firewall/network:
   - Ensure ports 27017 (MongoDB) and 6379 (Redis) are not blocked
   - Try using 127.0.0.1 instead of localhost

### Issue 2: OpenAI API Key Not Found
**Symptom**: `DEBUG - OPENAI_API_KEY loaded: NO`

**Solution**:
1. Create/update `.env` file with valid OpenAI API key
2. Restart the server
3. Get API key from: https://platform.openai.com/api-keys

### Issue 3: Port Already in Use
**Symptom**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9

# Or change port in .env:
PORT=5001
```

### Issue 4: Mongoose Warnings Persist
**Symptom**: Still seeing duplicate index warnings

**Solution**:
1. Drop existing indexes:
   ```bash
   mongosh
   use sales-captain
   db.teams.dropIndexes()
   db.trainingscenarios.dropIndexes()
   db.analytics.dropIndexes()
   ```

2. Restart server to recreate correct indexes

### Issue 5: Module Not Found Errors
**Symptom**: `Error: Cannot find module 'xyz'`

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Development Tips

### 1. Check Service Status
Create a script to verify all services before starting:

```bash
# check-services.sh
echo "Checking MongoDB..."
mongosh --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1 && echo "✓ MongoDB OK" || echo "✗ MongoDB not running"

echo "Checking Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✓ Redis OK" || echo "✗ Redis not running"
```

### 2. Docker Compose (Recommended)
Create a `docker-compose.yml` for easy service management:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:latest
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
```

Start all services:
```bash
docker-compose up -d
```

### 3. Monitor Logs
```bash
# Watch server logs
npm run dev | tee logs/server.log

# Monitor MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Monitor Redis logs
redis-cli monitor
```

---

## Best Practices

1. **Always check service availability** before reporting server issues
2. **Use Docker Compose** for consistent development environment
3. **Keep .env.example updated** with all required variables
4. **Document any new environment variables** in this file
5. **Add connection health checks** to your monitoring tools

---

## Quick Start Checklist

- [ ] MongoDB running
- [ ] Redis running
- [ ] `.env` file created with all variables
- [ ] `npm install` completed
- [ ] OpenAI API key configured
- [ ] Ports 5000, 27017, 6379 available
- [ ] Run `npm run dev`
- [ ] Check startup logs for errors
- [ ] Test health endpoint: `curl http://localhost:5000/health`

---

## Support

If issues persist after following this guide:
1. Check the terminal output for specific error messages
2. Verify all environment variables are correctly set
3. Ensure all dependencies are installed: `npm list`
4. Try a clean reinstall: `rm -rf node_modules && npm install`
5. Check system resources (RAM, disk space)

Last updated: November 2025

