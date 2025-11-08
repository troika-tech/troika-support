# Sales Captain - Technical Architecture Document
## WhatsApp Chat Roleplay Training System (Web Version)

**Stack:** MERN + TypeScript
**Last Updated:** 2025-11-06

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [AI Integration](#ai-integration)
8. [Real-time Communication](#real-time-communication)
9. [Authentication & Authorization](#authentication--authorization)
10. [Deployment Architecture](#deployment-architecture)
11. [Security Considerations](#security-considerations)
12. [Folder Structure](#folder-structure)

---

## 1. System Overview

### Core Features
- **Admin Portal**: Manage teams, groups, training schedules, scenarios
- **Sales Rep Interface**: Interactive chat-based roleplay training
- **AI Coach (Troika Sales Captain)**: Real-time conversation simulation and coaching
- **Analytics Dashboard**: Track performance, progress, completion rates
- **Session Management**: Schedule and track daily training sessions
- **Voice Recording**: Optional voice practice and playback

### User Roles
1. **Super Admin** - System configuration, company management
2. **Manager/Team Lead** - Team management, assign reps to groups
3. **Sales Representative** - Training participant
4. **AI Coach** - Automated persona (Troika Sales Captain)

---

## 2. Tech Stack

### Backend
```typescript
- Runtime: Node.js 20.x
- Framework: Express.js
- Language: TypeScript 5.x
- Database: MongoDB (Mongoose ODM)
- Streaming: Server-Sent Events (SSE)
- Authentication: JWT + bcrypt
- AI Integration: OpenAI SDK / Anthropic SDK
- File Storage: AWS S3 / Cloudinary (for voice recordings)
- Validation: Zod
- API Documentation: Swagger/OpenAPI
```

### Frontend
```typescript
- Framework: React 18.x
- Language: TypeScript 5.x
- State Management: Redux Toolkit + RTK Query
- Routing: React Router v6
- UI Library: Material-UI (MUI) / Tailwind CSS + shadcn/ui
- Streaming: Fetch + EventSource helpers
- Forms: React Hook Form + Zod
- Charts: Recharts / Chart.js
- Date Handling: date-fns
- Voice Recording: react-mic / Web Audio API
```

### DevOps & Tools
```typescript
- Package Manager: pnpm
- Build Tool: Vite
- Linting: ESLint + Prettier
- Testing: Jest + React Testing Library
- CI/CD: GitHub Actions
- Containerization: Docker + Docker Compose
- Hosting: AWS / DigitalOcean / Vercel + Railway
- Monitoring: Sentry + LogRocket
```

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Admin Portal │  │  Sales Rep   │  │   Manager    │         │
│  │   (React)    │  │  Interface   │  │  Dashboard   │         │
│  │              │  │   (React)    │  │   (React)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │   API Gateway Layer   │
                │   (Express Router)    │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│ Authentication │  │  Streaming  │  │   REST API      │
│   Middleware   │  │   Gateway   │  │   Endpoints     │
└───────┬────────┘  └──────┬──────┘  └────────┬────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │   Business Logic      │
                │      Services         │
                ├───────────────────────┤
                │ - User Service        │
                │ - Training Service    │
                │ - AI Service          │
                │ - Analytics Service   │
                │ - Session Service     │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│   MongoDB      │  │  AI API     │  │  Cloud Storage  │
│   Database     │  │  (OpenAI/   │  │  (S3/Cloudinary)│
│                │  │  Anthropic) │  │                 │
└────────────────┘  └─────────────┘  └─────────────────┘
```

---

## 4. Database Schema

### 4.1 Users Collection
```typescript
interface IUser {
  _id: ObjectId;
  email: string; // unique, indexed
  password: string; // hashed with bcrypt
  role: 'super_admin' | 'manager' | 'sales_rep';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string; // S3 URL
  };
  companyId: ObjectId; // Reference to Company
  groupId?: ObjectId; // Reference to Group (for sales reps)
  teamId?: ObjectId; // Reference to Team
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 Companies Collection
```typescript
interface ICompany {
  _id: ObjectId;
  name: string;
  domain?: string;
  logo?: string;
  settings: {
    maxUsers: number;
    trainingDuration: number; // days (default 10)
    sessionDuration: number; // minutes (default 5)
  };
  subscription: {
    plan: 'trial' | 'basic' | 'premium' | 'enterprise';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 Teams Collection
```typescript
interface ITeam {
  _id: ObjectId;
  name: string;
  companyId: ObjectId;
  managerId: ObjectId; // Reference to User (manager)
  members: ObjectId[]; // Array of User IDs (sales reps)
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.4 Groups Collection
```typescript
interface IGroup {
  _id: ObjectId;
  name: string; // "Group A", "Group B", "Group C"
  companyId: ObjectId;
  teamId: ObjectId;
  members: ObjectId[]; // Array of User IDs (4-5 sales reps)
  sessionTime: string; // "11:00 AM", "3:00 PM", "6:30 PM"
  schedule: {
    days: number[]; // [1,2,3,4,5] for Mon-Fri
    timezone: string; // "Asia/Kolkata"
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.5 TrainingScenarios Collection
```typescript
interface ITrainingScenario {
  _id: ObjectId;
  day: number; // 1-10
  theme: string; // "I Want Small Pack/Trial First"
  description: string;
  category: string; // "objection_handling", "closing", "follow_up"
  scenarios: Array<{
    scenarioId: string; // "scenario_1", "scenario_2"
    title: string;
    customerMessage: string;
    idealResponse: string;
    coachingNotes: string[];
    toneGuidelines: string[];
    commonMistakes: string[];
  }>;
  voiceDrill?: {
    text: string;
    instructions: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.6 TrainingSessions Collection
```typescript
interface ITrainingSession {
  _id: ObjectId;
  userId: ObjectId; // Sales rep
  groupId: ObjectId;
  scenarioId: ObjectId;
  day: number; // 1-10
  sessionDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // seconds
  conversationLog: Array<{
    _id: ObjectId;
    role: 'customer' | 'salesperson' | 'coach';
    message: string;
    timestamp: Date;
    metadata?: {
      corrections?: string[];
      improvedVersion?: string;
      scoreChange?: number;
    };
  }>;
  performance: {
    initialResponse: string;
    correctedResponse: string;
    finalResponse: string; // After rep repeats
    score: number; // 0-100
    metrics: {
      confidence: number;
      clarity: number;
      structure: number;
      objectionHandling: number;
      closing: number;
    };
  };
  voiceRecording?: {
    url: string; // S3/Cloudinary URL
    duration: number;
  };
  feedback: {
    aiCoachNotes: string;
    managerNotes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.7 ChatConversations Collection (Real-time chat state)
```typescript
interface IChatConversation {
  _id: ObjectId;
  sessionId: ObjectId; // Reference to TrainingSession
  userId: ObjectId;
  isActive: boolean;
  currentStep: 'customer_objection' | 'salesperson_response' | 'coach_correction' | 'salesperson_repeat' | 'completed';
  messages: Array<{
    _id: ObjectId;
    role: 'customer' | 'salesperson' | 'coach';
    content: string;
    timestamp: Date;
    isTyping: boolean;
  }>;
  aiContext: {
    conversationHistory: string;
    currentScenario: string;
    userTone: string;
    corrections: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.8 Analytics Collection
```typescript
interface IAnalytics {
  _id: ObjectId;
  userId: ObjectId;
  companyId: ObjectId;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalSessions: number;
    completedSessions: number;
    missedSessions: number;
    avgSessionDuration: number;
    avgScore: number;
    improvement: {
      confidence: number;
      clarity: number;
      closing: number;
    };
    scenarioPerformance: Array<{
      scenarioId: ObjectId;
      attempts: number;
      avgScore: number;
    }>;
  };
  progressByDay: Array<{
    day: number;
    completionRate: number;
    avgScore: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.9 ToneGuidelines Collection
```typescript
interface IToneGuideline {
  _id: ObjectId;
  category: 'phrases_to_use' | 'phrases_to_avoid' | 'tone_rules';
  items: Array<{
    text: string;
    explanation?: string;
    examples?: string[];
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. API Architecture

### 5.1 API Endpoint Structure

#### Authentication (`/api/auth`)
```typescript
POST   /api/auth/register          // Register new user
POST   /api/auth/login             // Login
POST   /api/auth/logout            // Logout
POST   /api/auth/refresh-token     // Refresh JWT
POST   /api/auth/forgot-password   // Request password reset
POST   /api/auth/reset-password    // Reset password
GET    /api/auth/me                // Get current user
```

#### Users (`/api/users`)
```typescript
GET    /api/users                  // List all users (admin/manager)
GET    /api/users/:id              // Get user by ID
POST   /api/users                  // Create new user (admin)
PUT    /api/users/:id              // Update user
DELETE /api/users/:id              // Delete user
PATCH  /api/users/:id/activate     // Activate/deactivate user
GET    /api/users/team/:teamId     // Get users by team
```

#### Teams (`/api/teams`)
```typescript
GET    /api/teams                  // List all teams
GET    /api/teams/:id              // Get team by ID
POST   /api/teams                  // Create team
PUT    /api/teams/:id              // Update team
DELETE /api/teams/:id              // Delete team
POST   /api/teams/:id/members      // Add members to team
DELETE /api/teams/:id/members/:userId // Remove member
```

#### Groups (`/api/groups`)
```typescript
GET    /api/groups                 // List all groups
GET    /api/groups/:id             // Get group by ID
POST   /api/groups                 // Create group
PUT    /api/groups/:id             // Update group
DELETE /api/groups/:id             // Delete group
GET    /api/groups/team/:teamId    // Get groups by team
```

#### Training Scenarios (`/api/scenarios`)
```typescript
GET    /api/scenarios              // List all scenarios
GET    /api/scenarios/:id          // Get scenario by ID
GET    /api/scenarios/day/:day     // Get scenarios for specific day
POST   /api/scenarios              // Create scenario (admin)
PUT    /api/scenarios/:id          // Update scenario
DELETE /api/scenarios/:id          // Delete scenario
GET    /api/scenarios/search       // Search scenarios
```

#### Training Sessions (`/api/sessions`)
```typescript
GET    /api/sessions               // List sessions (filtered by user/date)
GET    /api/sessions/:id           // Get session by ID
POST   /api/sessions               // Create/schedule session
PUT    /api/sessions/:id           // Update session
DELETE /api/sessions/:id           // Delete session
POST   /api/sessions/:id/start     // Start session
POST   /api/sessions/:id/complete  // Complete session
GET    /api/sessions/user/:userId  // Get sessions for user
GET    /api/sessions/upcoming      // Get upcoming sessions
GET    /api/sessions/today         // Get today's sessions
```

#### Chat/Roleplay (`/api/chat`)
```typescript
POST   /api/chat/start             // Start chat session
POST   /api/chat/:sessionId/message // Send message
GET    /api/chat/:sessionId/history // Get chat history
POST   /api/chat/:sessionId/correction // Request AI correction
POST   /api/chat/:sessionId/end    // End chat session
```

#### AI Coach (`/api/ai`)
```typescript
POST   /api/ai/generate-response   // Generate AI response
POST   /api/ai/evaluate-response   // Evaluate user response
POST   /api/ai/provide-correction  // Provide correction
POST   /api/ai/generate-scenario   // Generate custom scenario
```

#### Voice (`/api/voice`)
```typescript
POST   /api/voice/upload           // Upload voice recording
GET    /api/voice/:id              // Get voice recording
DELETE /api/voice/:id              // Delete voice recording
```

#### Analytics (`/api/analytics`)
```typescript
GET    /api/analytics/user/:userId          // User analytics
GET    /api/analytics/team/:teamId          // Team analytics
GET    /api/analytics/company/:companyId    // Company analytics
GET    /api/analytics/dashboard             // Dashboard summary
GET    /api/analytics/leaderboard           // Performance leaderboard
GET    /api/analytics/progress/:userId      // User progress (10 days)
GET    /api/analytics/export                // Export analytics (CSV)
```

#### Companies (`/api/companies`)
```typescript
GET    /api/companies              // List companies (super admin)
GET    /api/companies/:id          // Get company
POST   /api/companies              // Create company
PUT    /api/companies/:id          // Update company
DELETE /api/companies/:id          // Delete company
```

---

## 6. Frontend Architecture

### 6.1 Component Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Dropdown/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Loader/
│   │   └── Toast/
│   ├── layout/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── DashboardLayout/
│   │   └── AuthLayout/
│   ├── auth/
│   │   ├── LoginForm/
│   │   ├── RegisterForm/
│   │   ├── ForgotPasswordForm/
│   │   └── ProtectedRoute/
│   ├── chat/
│   │   ├── ChatInterface/
│   │   ├── MessageBubble/
│   │   ├── TypingIndicator/
│   │   ├── VoiceRecorder/
│   │   ├── CoachingPanel/
│   │   └── ScenarioCard/
│   ├── dashboard/
│   │   ├── DashboardStats/
│   │   ├── ProgressChart/
│   │   ├── UpcomingSessions/
│   │   ├── Leaderboard/
│   │   └── ActivityFeed/
│   ├── training/
│   │   ├── SessionsList/
│   │   ├── SessionCard/
│   │   ├── ScenarioLibrary/
│   │   ├── TrainingCalendar/
│   │   └── PerformanceMetrics/
│   ├── admin/
│   │   ├── UserManagement/
│   │   ├── TeamManagement/
│   │   ├── GroupManagement/
│   │   ├── ScenarioEditor/
│   │   └── CompanySettings/
│   └── analytics/
│       ├── AnalyticsDashboard/
│       ├── TeamPerformance/
│       ├── IndividualProgress/
│       └── ExportReports/
```

### 6.2 Pages Structure

```
src/
├── pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ForgotPassword.tsx
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   └── RepDashboard.tsx
│   ├── training/
│   │   ├── TrainingHome.tsx
│   │   ├── ActiveSession.tsx
│   │   ├── SessionHistory.tsx
│   │   └── ScenarioLibrary.tsx
│   ├── profile/
│   │   ├── Profile.tsx
│   │   └── Settings.tsx
│   ├── admin/
│   │   ├── Users.tsx
│   │   ├── Teams.tsx
│   │   ├── Groups.tsx
│   │   ├── Scenarios.tsx
│   │   └── Companies.tsx
│   ├── analytics/
│   │   ├── Analytics.tsx
│   │   ├── Reports.tsx
│   │   └── Leaderboard.tsx
│   └── NotFound.tsx
```

### 6.3 State Management (Redux Toolkit)

```typescript
src/
├── store/
│   ├── index.ts                 // Store configuration
│   ├── slices/
│   │   ├── authSlice.ts         // Authentication state
│   │   ├── userSlice.ts         // User data
│   │   ├── chatSlice.ts         // Chat/session state
│   │   ├── trainingSlice.ts     // Training data
│   │   ├── analyticsSlice.ts    // Analytics data
│   │   └── uiSlice.ts           // UI state (modals, toasts)
│   └── api/
│       ├── authApi.ts           // RTK Query - Auth endpoints
│       ├── usersApi.ts          // RTK Query - Users
│       ├── teamsApi.ts          // RTK Query - Teams
│       ├── sessionsApi.ts       // RTK Query - Sessions
│       ├── chatApi.ts           // RTK Query - Chat
│       └── analyticsApi.ts      // RTK Query - Analytics
```

### 6.4 Key Frontend Features

#### Real-time Chat Interface
```typescript
// Features:
- Streaming connection for real-time messaging
- Typing indicators
- Message status (sent, delivered, read)
- Auto-scroll to latest message
- Voice recording and playback
- Inline coaching feedback display
- Progress indicator (Step 1/4)
```

#### Progress Tracking Dashboard
```typescript
// Metrics displayed:
- Days completed (X/10)
- Sessions completed today
- Average score trend
- Improvement graph (confidence, clarity, closing)
- Upcoming session countdown
- Recent session highlights
```

---

## 7. AI Integration

### 7.1 AI Service Architecture

```typescript
// src/services/ai/AIService.ts

interface AIProvider {
  generateResponse(prompt: string, context: any): Promise<string>;
  evaluateResponse(userResponse: string, idealResponse: string): Promise<Evaluation>;
  provideCorrectionn(userResponse: string, scenario: Scenario): Promise<Correction>;
}

class OpenAIService implements AIProvider {
  // Implementation using OpenAI GPT-4
}

class AnthropicService implements AIProvider {
  // Implementation using Claude API
}
```

### 7.2 AI Prompt Engineering

#### System Prompt for Troika Sales Captain
```typescript
const TROIKA_SALES_CAPTAIN_SYSTEM_PROMPT = `
You are Troika Sales Captain, a seasoned sales leader who has closed thousands of deals.

Your personality:
- Calm, steady, respectful, and confident
- Never rush, never sound unsure
- Guide customers with clarity and logic, not pressure
- Always explain *why* before saying *what*
- Make 1 lakh the natural and sensible starting point
- Always end with a forward-moving question
- Use 70% English + 30% conversational Hindi (Hinglish)

Your tone:
- Polite, steady, confident, advisory
- Avoid: Slang, filler words ("basically", "actually"), excitement tone
- Use: Calm pauses, clear reasoning, guiding questions

Goal: Make the customer feel "This person knows what they're talking about."

Context: You are training sales representatives for Troika Tech's WhatsApp Marketing services.
Product: Bulk WhatsApp Marketing with targeted database and CTA buttons.
Minimum starter pack: 1 lakh messages.
`;
```

#### Prompt Templates
```typescript
// Customer Objection Response
const generateCustomerMessage = (scenario: Scenario) => `
Act as a customer with the following objection:
${scenario.customerMessage}

Respond naturally as this customer would, staying in character.
Keep the response conversational and realistic.
`;

// Evaluation Prompt
const evaluateResponse = (userResponse: string, idealResponse: string) => `
Evaluate this sales representative's response:

User Response: "${userResponse}"

Ideal Response: "${idealResponse}"

Provide:
1. Score (0-100)
2. What they did well
3. What needs improvement
4. Corrected version of their response
5. Coaching notes

Format as JSON.
`;
```

### 7.3 AI Response Flow

```
User sends message
      ↓
Extract context from conversation history
      ↓
Determine current step (objection/response/correction)
      ↓
Generate appropriate AI response based on step
      ↓
If user response → Evaluate against ideal response
      ↓
Generate coaching feedback + corrected version
      ↓
Calculate performance metrics
      ↓
Save to database + Stream response to client (SSE)
```

---

## 8. Live Streaming

### 8.1 Server-Sent Events (SSE) Channels

```typescript
// AI correction stream
POST /api/ai/corrections/stream

// Objection generation stream
POST /api/ai/objections/stream

// General assistant stream
POST /api/ai/assistant/stream
```

Each endpoint keeps the HTTP connection open and flushes incremental payloads using the SSE format:

```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.write('data: {"type":"connected"}\n\n');

// For each content chunk
res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);

// When finished
res.write('data: {"type":"done"}\n\n');
res.end();
```

### 8.2 Frontend Streaming Helpers

```typescript
async function streamContent(
  endpoint: string,
  body: Record<string, unknown>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    text.split('\n\n')
      .filter(Boolean)
      .forEach((line) => {
        if (!line.startsWith('data:')) return;
        const payload = JSON.parse(line.replace('data:', '').trim());
        if (payload.type === 'content') onChunk(payload.content);
        if (payload.type === 'done') onDone();
      });
  }
}
```

### 8.3 UX Considerations

- Show typing indicators while streaming (based on `isStreaming` state)
- Disable form controls until the stream finishes or errors
- Provide retry affordances if the connection drops
- Gracefully stop streams when navigating away or ending a session

---

## 9. Authentication & Authorization

### 9.1 JWT Authentication Flow

```
1. User submits login credentials
        ↓
2. Server validates credentials
        ↓
3. Generate JWT access token (15min) + refresh token (7days)
        ↓
4. Send tokens to client
        ↓
5. Client stores tokens (access in memory, refresh in httpOnly cookie)
        ↓
6. Client includes access token in Authorization header
        ↓
7. Server validates token on protected routes
        ↓
8. When access token expires → use refresh token to get new access token
```

### 9.2 Middleware

```typescript
// src/middleware/auth.middleware.ts

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Role-based authorization
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

### 9.3 Protected Routes Example

```typescript
// Admin only
router.post('/scenarios', authenticate, authorize('super_admin', 'manager'), createScenario);

// Manager + Admin
router.get('/teams', authenticate, authorize('super_admin', 'manager'), getTeams);

// All authenticated users
router.get('/profile', authenticate, getProfile);
```

---

## 10. Deployment Architecture

### 10.1 Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                          │
│                    (DNS + DDoS Protection)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Load Balancer (nginx)                     │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
┌────────────▼──────────┐   ┌───────────▼────────────┐
│   Frontend (Vercel)   │   │  Backend (Railway/AWS) │
│   - React Build       │   │  - Express + SSE       │
│   - Static Assets     │   │  - PM2 Process Manager │
└───────────────────────┘   └───────────┬────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
         ┌──────────▼─────────┐  ┌─────▼──────┐  ┌────────▼────────┐
         │ MongoDB Atlas      │  │ Redis      │  │ AWS S3/         │
         │ (Database)         │  │ (Cache)    │  │ Cloudinary      │
         │ - Replica Set      │  │            │  │ (File Storage)  │
         └────────────────────┘  └────────────┘  └─────────────────┘
```

### 10.2 Docker Configuration

```yaml
# docker-compose.yml

version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/sales-captain
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongodb
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:5000
    depends_on:
      - backend

volumes:
  mongo-data:
```

### 10.3 Environment Variables

```bash
# Backend .env
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales-captain
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai # or 'anthropic'

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=sales-captain-uploads

# or Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=https://salescaptain.com

# Monitoring
SENTRY_DSN=https://...
```

```bash
# Frontend .env
VITE_API_URL=https://api.salescaptain.com
VITE_ENV=production
```

---

## 11. Security Considerations

### 11.1 Security Measures

```typescript
// Backend Security
1. Helmet.js - Security headers
2. CORS - Restricted origins
3. Rate limiting - Express rate limit
4. Input validation - Zod schemas
5. SQL/NoSQL injection prevention - Mongoose sanitization
6. XSS protection - DOMPurify on frontend
7. CSRF tokens - For state-changing operations
8. Password hashing - bcrypt (rounds: 12)
9. JWT with short expiration - 15 minutes
10. HTTPS only - Enforce SSL
11. File upload validation - File type, size limits
12. Environment variables - Never commit secrets
13. Logging & monitoring - Winston + Sentry
14. Database encryption - MongoDB encryption at rest
```

### 11.2 Rate Limiting

```typescript
// src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts',
});
```

---

## 12. Folder Structure

### 12.1 Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          // MongoDB connection
│   │   ├── redis.ts             // Redis connection
│   │   └── constants.ts         // App constants
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Company.model.ts
│   │   ├── Team.model.ts
│   │   ├── Group.model.ts
│   │   ├── TrainingScenario.model.ts
│   │   ├── TrainingSession.model.ts
│   │   ├── ChatConversation.model.ts
│   │   └── Analytics.model.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── teams.controller.ts
│   │   ├── groups.controller.ts
│   │   ├── scenarios.controller.ts
│   │   ├── sessions.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── voice.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── training.service.ts
│   │   ├── ai/
│   │   │   ├── AIService.ts
│   │   │   ├── OpenAIService.ts
│   │   │   ├── AnthropicService.ts
│   │   │   └── prompts.ts
│   │   ├── email.service.ts
│   │   ├── upload.service.ts
│   │   └── analytics.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimiter.ts
│   │   └── upload.middleware.ts
│   ├── routes/
│   │   ├── index.ts             // Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── teams.routes.ts
│   │   ├── groups.routes.ts
│   │   ├── scenarios.routes.ts
│   │   ├── sessions.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── voice.routes.ts
│   │   └── analytics.routes.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── logger.ts            // Winston logger
│   │   ├── jwt.ts               // JWT utilities
│   │   ├── errors.ts            // Custom error classes
│   │   ├── validators.ts        // Zod schemas
│   │   └── helpers.ts           // Helper functions
│   ├── types/
│   │   ├── express.d.ts         // Express type extensions
│   │   ├── user.types.ts
│   │   ├── session.types.ts
│   │   └── ai.types.ts
│   ├── scripts/
│   │   ├── seed.ts              // Database seeding
│   │   └── migrate.ts           // Database migrations
│   ├── app.ts                   // Express app setup
│   └── server.ts                // Server entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
└── Dockerfile
```

### 12.2 Frontend Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   └── assets/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── dashboard/
│   │   ├── training/
│   │   ├── admin/
│   │   └── analytics/
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── training/
│   │   ├── profile/
│   │   ├── admin/
│   │   └── analytics/
│   ├── store/
│   │   ├── slices/
│   │   ├── api/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useAIStreaming.ts
│   │   └── useVoiceRecorder.ts
│   ├── services/
│   │   ├── api.service.ts
│   │   └── storage.service.ts
│   ├── utils/
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── formatters.ts
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── session.types.ts
│   │   ├── chat.types.ts
│   │   └── api.types.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── themes.ts
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleBasedRoute.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── Dockerfile
```

---

## Additional Technical Specifications

### Performance Optimization
```typescript
1. Frontend
   - Code splitting (React.lazy)
   - Image optimization (WebP format)
   - Virtual scrolling for long lists
   - Debouncing/throttling for search
   - Service Workers for caching
   - Memoization (React.memo, useMemo)

2. Backend
   - Database indexing (email, userId, sessionDate)
   - Redis caching for frequent queries
   - Pagination for large datasets
   - Compression middleware (gzip)
   - Connection pooling for MongoDB
   - Query optimization (projection, lean)
```

### Monitoring & Logging
```typescript
1. Application Monitoring
   - Sentry for error tracking
   - LogRocket for session replay
   - Winston for structured logging
   - Morgan for HTTP request logging

2. Infrastructure Monitoring
   - PM2 monitoring dashboard
   - MongoDB Atlas metrics
   - Server health checks
   - Uptime monitoring (UptimeRobot)

3. Analytics
   - Google Analytics (optional)
   - Custom event tracking
   - User behavior analytics
```

### Testing Strategy
```typescript
1. Unit Tests
   - Services and utilities
   - Redux reducers
   - Custom hooks
   - Coverage target: 80%

2. Integration Tests
   - API endpoints
   - Database operations
   - Streaming pipelines

3. E2E Tests
   - Critical user flows
   - Authentication
   - Training session completion
   - Tools: Cypress / Playwright
```

---

## Development Workflow

### Phase 1: Setup & Infrastructure (Week 1-2)
- Initialize repositories (monorepo with pnpm workspaces)
- Setup backend with Express + TypeScript
- Setup frontend with React + Vite
- Configure MongoDB + Redis
- Setup Docker development environment
- Configure ESLint + Prettier

### Phase 2: Core Backend (Week 3-4)
- Implement authentication system
- Create database models
- Build REST API endpoints
- Implement streaming endpoints (SSE)
- Implement AI service integration
- Write unit tests

### Phase 3: Core Frontend (Week 5-6)
- Setup routing and layouts
- Build authentication UI
- Implement state management
- Create reusable components
- Build chat interface
- Connect to backend APIs

### Phase 4: AI & Training Logic (Week 7-8)
- Implement AI prompt engineering
- Build training session flow
- Create scenario management
- Implement live chat streaming experience
- Add voice recording feature
- Test AI responses

### Phase 5: Admin & Analytics (Week 9-10)
- Build admin portal
- Implement user/team management
- Create analytics dashboard
- Build reporting features
- Add export functionality

### Phase 6: Testing & Polish (Week 11-12)
- End-to-end testing
- Performance optimization
- UI/UX refinement
- Bug fixes
- Documentation
- Deployment

---

## Estimated Costs (Monthly)

```
Infrastructure:
- MongoDB Atlas (M10): $57
- Redis Cloud: $0 (free tier) or $7 (paid)
- AWS S3: ~$5-10
- Backend Hosting (Railway/AWS): $20-50
- Frontend Hosting (Vercel): $0 (free tier)
- Domain + SSL: $2

AI APIs:
- OpenAI GPT-4: ~$50-200 (depends on usage)
- Anthropic Claude: ~$50-200 (alternative)

Monitoring:
- Sentry: $0 (free tier)
- LogRocket: $0 (free tier) or $99

Total: ~$140-500/month (depending on scale)
```

---

## Scalability Considerations

```typescript
1. Horizontal Scaling
   - Load balancer for multiple backend instances
   - MongoDB replica sets
   - Redis clustering
   - Stateless server design

2. Caching Strategy
   - Redis for session data
   - CDN for static assets
   - Browser caching
   - API response caching

3. Database Optimization
   - Compound indexes
   - Data archival strategy
   - Read replicas for analytics
   - Sharding for large datasets

4. Rate Limiting
   - Per-user limits
   - IP-based limits
   - AI API quota management
```

---

## Future Enhancements

```typescript
1. Mobile App (React Native)
2. Advanced voice analysis (pronunciation, tone)
3. Video roleplay training
4. Multi-language support
5. Gamification (badges, streaks)
6. Manager live session monitoring
7. Custom scenario AI generation
8. Integration with CRM systems
9. Advanced reporting (PDF exports)
10. Webhooks for external integrations
```

---

**End of Technical Architecture Document**

For implementation questions or clarifications, refer to individual component documentation or contact the development team.
