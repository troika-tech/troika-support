# Quick Start Guide

Get Sales Captain up and running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js version (should be 20+)
node --version

# Check npm version
npm --version

# Check if MongoDB is installed
mongod --version
```

## Installation Steps

### 1. Install All Dependencies

```bash
# From root directory
npm install
```

### 2. Setup Environment Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Configure Backend .env

Edit `backend/.env` and add your keys:

```env
# Minimum required configuration
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sales-captain
JWT_SECRET=my-super-secret-key-change-this
REFRESH_TOKEN_SECRET=my-refresh-secret-change-this
OPENAI_API_KEY=sk-your-key-here
CORS_ORIGINS=http://localhost:3000
```

### 4. Start MongoDB

```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or run manually
mongod --dbpath /path/to/data
```

### 5. Start the Application

```bash
# From root directory - starts both backend and frontend
npm run dev
```

That's it! 🎉

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Default Login (After Database Seeding)

```
Email: admin@salescaptain.com
Password: admin123
```

## Seed the Database (Optional)

```bash
cd backend
npm run seed
```

## Common Issues

### Port 5000 Already in Use
```bash
# Change PORT in backend/.env
PORT=5001

# Update VITE_API_URL in frontend/.env
VITE_API_URL=http://localhost:5001
```

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check connection string in backend/.env
```

### Module Not Found Error
```bash
# Reinstall dependencies
npm run clean
npm install
```

## Next Steps

1. ✅ Read the [README.md](README.md) for full documentation
2. ✅ Review [technical-architecture.md](docs/technical-architecture.md) for system design
3. ✅ Check [prd.txt](docs/prd.txt) for feature requirements
4. ✅ Start implementing database models
5. ✅ Build authentication system
6. ✅ Integrate AI service

## Development Workflow

```bash
# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

## Need Help?

- Check the main [README.md](README.md)
- Review troubleshooting section
- Check console logs for errors
