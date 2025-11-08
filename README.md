# Sales Captain - AI Sales Training Platform

WhatsApp Chat Roleplay Training System built with MERN Stack + TypeScript

## 🚀 Features

- **AI-Powered Roleplay Training** - Troika Sales Captain persona for realistic customer interactions
- **Live AI Feedback** - Streaming responses for in-the-moment coaching
- **Performance Analytics** - Track progress, scores, and improvement metrics
- **Role-Based Access** - Admin, Manager, and Sales Rep dashboards
- **10-Day Training Program** - Structured curriculum with daily scenarios
- **Voice Recording** - Practice and review vocal tone and confidence

## 📋 Prerequisites

- Node.js 20.x or higher
- MongoDB 7.x or higher
- Redis 7.x (optional, for caching)
- npm or pnpm package manager

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Streaming**: Server-Sent Events (SSE)
- **Authentication**: JWT + bcrypt
- **AI Integration**: OpenAI GPT-4 / Anthropic Claude
- **Validation**: Zod

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI)
- **Streaming**: EventSource helpers + fetch
- **Forms**: React Hook Form + Zod

## 📁 Project Structure

```
sales-captain/
├── backend/                # Backend API server
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   ├── app.ts         # Express app setup
│   │   └── server.ts      # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store & slices
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   ├── styles/        # Global styles & theme
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── docs/                  # Documentation
│   ├── prd.txt
│   └── technical-architecture.md
├── package.json           # Root package.json (workspace)
└── README.md
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd "Sales Captain"
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Setup

#### Backend Environment Variables

Create `backend/.env` file:

```bash
# Copy example file
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/sales-captain

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this
REFRESH_TOKEN_EXPIRES_IN=7d

# AI API (choose one or both)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
AI_PROVIDER=openai

# CORS
CORS_ORIGINS=http://localhost:3000
```

#### Frontend Environment Variables

Create `frontend/.env` file:

```bash
# Copy example file
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_ENV=development
```

### 4. Start MongoDB

Make sure MongoDB is running:

```bash
# Windows (if installed as service)
net start MongoDB

# macOS (via Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 5. Start Redis (Optional)

```bash
# Windows (if installed)
redis-server

# macOS (via Homebrew)
brew services start redis

# Linux
sudo systemctl start redis
```

### 6. Run the Application

#### Option A: Run Both Backend and Frontend Together

From the root directory:

```bash
npm run dev
```

This will start:
- Backend API on http://localhost:5000
- Frontend on http://localhost:3000

#### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 📝 Default Credentials (After Seeding)

```
Email: admin@salescaptain.com
Password: admin123
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🏗️ Build for Production

### Build Backend
```bash
cd backend
npm run build
```

### Build Frontend
```bash
cd frontend
npm run build
```

## 📚 API Documentation

Once the backend is running, API documentation is available at:
- http://localhost:5000/api-docs (Swagger UI - Coming soon)

## 🗂️ Database Seeding

To populate the database with initial data:

```bash
cd backend
npm run seed
```

This will create:
- Sample users (admin, manager, sales reps)
- Training scenarios (Days 1-10)
- Groups and teams
- Tone guidelines

## 🔧 Development Scripts

### Root Level
```bash
npm run dev              # Run both backend and frontend
npm run build            # Build both projects
npm run lint             # Lint all code
npm run clean            # Clean node_modules and build files
```

### Backend
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm test                 # Run tests
npm run seed             # Seed database
```

### Frontend
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm test                 # Run tests
```

## 🌐 Environment Modes

- **Development**: Full logging, hot reload, debug mode
- **Production**: Optimized build, minimal logging, error tracking

## 📖 Key Concepts

### Training Flow

1. **Sales Rep** joins scheduled training session
2. **AI Coach (Customer)** presents objection/scenario
3. **Sales Rep** responds naturally
4. **AI Coach** evaluates response and provides:
   - Corrections
   - Improved version
   - Coaching notes
   - Performance score
5. **Sales Rep** repeats the corrected response
6. Session completes with final score and summary

### Roles & Permissions

- **Super Admin**: Full system access, company management
- **Manager**: Team management, assign reps, view analytics
- **Sales Rep**: Training sessions, personal dashboard

## 🤝 Contributing

This is a private project. For questions or suggestions, contact the development team.

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/sales-captain
```

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### TypeScript Errors
```bash
# Clear TypeScript cache
cd backend
rm -rf node_modules dist
npm install

cd ../frontend
rm -rf node_modules dist
npm install
```

## 📞 Support

For technical support or questions:
- Check [technical-architecture.md](docs/technical-architecture.md)
- Review [prd.txt](docs/prd.txt) for feature details

---

**Built with ❤️ for Sales Excellence**
