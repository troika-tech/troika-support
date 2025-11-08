# Database Models Documentation

This directory contains all Mongoose models for the Sales Captain application.

## 📋 Models Overview

### 1. User Model ([User.model.ts](User.model.ts))

**Purpose**: Manages user accounts and authentication

**Key Fields**:
- `email` - Unique, indexed email address
- `password` - Bcrypt hashed password (selected: false)
- `role` - super_admin | manager | sales_rep
- `profile` - firstName, lastName, phone, avatar
- `companyId` - Reference to Company
- `groupId` - Reference to Group (optional)
- `teamId` - Reference to Team (optional)
- `isActive` - Account status
- `lastLogin` - Last login timestamp

**Methods**:
- `comparePassword(candidatePassword)` - Compare plain password with hashed
- `getFullName()` - Returns concatenated full name

**Hooks**:
- Pre-save: Automatically hashes password if modified

**Indexes**:
- `email` (unique)
- `companyId`
- `email + companyId` (compound)
- `teamId + role`
- `groupId`

---

### 2. Company Model ([Company.model.ts](Company.model.ts))

**Purpose**: Manages company/organization data and subscriptions

**Key Fields**:
- `name` - Company name
- `domain` - Company domain (optional)
- `logo` - Logo URL
- `settings`
  - `maxUsers` - Maximum allowed users (default: 50)
  - `trainingDuration` - Training program duration in days (default: 10)
  - `sessionDuration` - Session duration in minutes (default: 5)
- `subscription`
  - `plan` - trial | basic | premium | enterprise
  - `startDate` - Subscription start date
  - `endDate` - Subscription expiry date
  - `isActive` - Subscription status

**Methods**:
- `isSubscriptionActive()` - Check if subscription is valid
- `daysUntilExpiry()` - Calculate days remaining

**Virtuals**:
- `usersCount` - Count of users in company

**Indexes**:
- `subscription.isActive`
- `subscription.endDate`

---

### 3. Team Model ([Team.model.ts](Team.model.ts))

**Purpose**: Groups sales reps under a manager

**Key Fields**:
- `name` - Team name
- `companyId` - Reference to Company
- `managerId` - Reference to User (manager)
- `members[]` - Array of User IDs (sales reps)

**Methods**:
- `getMemberCount()` - Get number of members
- `addMember(userId)` - Add member to team
- `removeMember(userId)` - Remove member from team

**Hooks**:
- Pre-save: Ensures manager is not in members array

**Virtuals**:
- `memberCount` - Number of team members

**Indexes**:
- `companyId + name`
- `managerId`

---

### 4. Group Model ([Group.model.ts](Group.model.ts))

**Purpose**: Training groups with scheduled session times (max 5 members)

**Key Fields**:
- `name` - Group name (e.g., "Group A", "Group B")
- `companyId` - Reference to Company
- `teamId` - Reference to Team
- `members[]` - Array of User IDs (max 5)
- `sessionTime` - Time in "HH:MM AM/PM" format
- `schedule`
  - `days[]` - Array of weekdays (0-6, 0=Sunday)
  - `timezone` - Timezone string (default: "Asia/Kolkata")

**Methods**:
- `getMemberCount()` - Get number of members
- `addMember(userId)` - Add member (max 5)
- `removeMember(userId)` - Remove member
- `isSessionDay(date)` - Check if date is a training day

**Validation**:
- Maximum 5 members per group
- Days must be 0-6
- Time must match format

**Virtuals**:
- `memberCount` - Number of group members

**Indexes**:
- `companyId + teamId`
- `teamId + name`

---

### 5. TrainingScenario Model ([TrainingScenario.model.ts](TrainingScenario.model.ts))

**Purpose**: Stores training scenarios for the 10-day program

**Key Fields**:
- `day` - Day number (1-10)
- `theme` - Theme/title for the day
- `description` - Description of the day's focus
- `category` - objection_handling | closing | follow_up | intro | pricing
- `scenarios[]` - Array of scenario objects
  - `scenarioId` - Unique scenario ID
  - `title` - Scenario title
  - `customerMessage` - What customer says
  - `idealResponse` - Perfect response
  - `coachingNotes[]` - Array of coaching points
  - `toneGuidelines[]` - Tone tips
  - `commonMistakes[]` - Common errors
- `voiceDrill` (optional)
  - `text` - Text to practice
  - `instructions` - Practice instructions
- `isActive` - Whether scenario is active

**Methods**:
- `getScenarioById(scenarioId)` - Find specific scenario
- `getScenarioCount()` - Count scenarios

**Static Methods**:
- `getByDay(day)` - Get scenario for specific day
- `getAllActive()` - Get all active scenarios

**Virtuals**:
- `scenarioCount` - Number of scenarios

**Indexes**:
- `day + isActive` (unique for active)
- `category + isActive`

---

### 6. TrainingSession Model ([TrainingSession.model.ts](TrainingSession.model.ts))

**Purpose**: Individual training session records with conversation logs

**Key Fields**:
- `userId` - Reference to User (sales rep)
- `groupId` - Reference to Group
- `scenarioId` - Reference to TrainingScenario
- `day` - Training day (1-10)
- `sessionDate` - Scheduled date
- `status` - scheduled | in_progress | completed | missed
- `startTime` - Session start timestamp
- `endTime` - Session end timestamp
- `duration` - Duration in seconds
- `conversationLog[]` - Array of messages
  - `role` - customer | salesperson | coach
  - `message` - Message content
  - `timestamp` - Message time
  - `metadata` - Corrections, improved version, score change
- `performance`
  - `initialResponse` - First attempt
  - `correctedResponse` - AI corrected version
  - `finalResponse` - Rep's final attempt
  - `score` - Overall score (0-100)
  - `metrics` - Confidence, clarity, structure, objectionHandling, closing
- `voiceRecording` (optional)
  - `url` - Recording URL
  - `duration` - Recording duration
- `feedback`
  - `aiCoachNotes` - AI feedback
  - `managerNotes` - Manager comments (optional)

**Methods**:
- `startSession()` - Mark as in_progress
- `completeSession()` - Mark as completed, calculate duration
- `addMessage(role, message, metadata)` - Add to conversation log
- `calculateDuration()` - Calculate session duration
- `updatePerformanceScore(score, metrics)` - Update scores

**Virtuals**:
- `messageCount` - Number of messages
- `formattedDuration` - "Xm Ys" format

**Indexes**:
- `userId + day`
- `userId + sessionDate`
- `status + sessionDate`
- `groupId + sessionDate`

---

### 7. ChatConversation Model ([ChatConversation.model.ts](ChatConversation.model.ts))

**Purpose**: Real-time chat state for active sessions

**Key Fields**:
- `sessionId` - Reference to TrainingSession (unique)
- `userId` - Reference to User
- `isActive` - Whether chat is active
- `currentStep` - customer_objection | salesperson_response | coach_correction | salesperson_repeat | completed
- `messages[]` - Array of chat messages
  - `role` - customer | salesperson | coach
  - `content` - Message content
  - `timestamp` - Message time
  - `isTyping` - Typing indicator
- `aiContext`
  - `conversationHistory` - Full conversation text
  - `currentScenario` - Current scenario context
  - `userTone` - Detected user tone
  - `corrections[]` - Applied corrections

**Methods**:
- `addMessage(role, content)` - Add new message
- `updateStep(step)` - Move to next step
- `closeConversation()` - Mark as inactive and completed
- `getLastMessage()` - Get last message
- `getMessagesByRole(role)` - Filter by role

**Static Methods**:
- `getActiveBySession(sessionId)` - Get active chat for session
- `getActiveByUser(userId)` - Get user's active chats

**Virtuals**:
- `messageCount` - Number of messages

**Indexes**:
- `sessionId` (unique)
- `sessionId + isActive`
- `userId + isActive`

---

### 8. Analytics Model ([Analytics.model.ts](Analytics.model.ts))

**Purpose**: Aggregated performance analytics per user

**Key Fields**:
- `userId` - Reference to User
- `companyId` - Reference to Company
- `period`
  - `startDate` - Period start
  - `endDate` - Period end
- `metrics`
  - `totalSessions` - Total scheduled
  - `completedSessions` - Successfully completed
  - `missedSessions` - Missed sessions
  - `avgSessionDuration` - Average duration in seconds
  - `avgScore` - Average performance score
  - `improvement` - Confidence, clarity, closing improvements
  - `scenarioPerformance[]` - Per-scenario stats
- `progressByDay[]` - Array of daily progress
  - `day` - Day number (1-10)
  - `completionRate` - Percentage completed
  - `avgScore` - Average score for day

**Methods**:
- `calculateCompletionRate()` - Overall completion percentage
- `getAverageScore()` - Rounded average score
- `getBestPerformingDay()` - Day with highest score
- `getWorstPerformingDay()` - Day with lowest score

**Static Methods**:
- `getByUserAndPeriod(userId, start, end)` - Get analytics for period
- `getCompanyAnalytics(companyId, start, end)` - Company-wide analytics

**Virtuals**:
- `totalDays` - Number of days tracked
- `completionPercentage` - Completion rate

**Indexes**:
- `userId + period.startDate + period.endDate` (unique)
- `companyId + period.startDate`

---

### 9. ToneGuidelines Model ([ToneGuidelines.model.ts](ToneGuidelines.model.ts))

**Purpose**: Stores tone guidelines for AI coaching

**Key Fields**:
- `category` - phrases_to_use | phrases_to_avoid | tone_rules
- `items[]` - Array of guideline items
  - `text` - The phrase or rule
  - `explanation` - Why it matters (optional)
  - `examples[]` - Usage examples (optional)
- `isActive` - Whether guideline set is active

**Methods**:
- `getItemCount()` - Count items
- `addItem(item)` - Add new guideline
- `removeItem(text)` - Remove guideline

**Static Methods**:
- `getByCategory(category)` - Get by category
- `getAllActive()` - Get all active guidelines
- `getPhrasesToUse()` - Get approved phrases
- `getPhrasesToAvoid()` - Get phrases to avoid
- `getToneRules()` - Get tone rules

**Virtuals**:
- `itemCount` - Number of items

**Indexes**:
- `category + isActive`

---

## 🔗 Model Relationships

```
Company
  ├── Users (one-to-many)
  ├── Teams (one-to-many)
  └── Analytics (one-to-many)

Team
  ├── Manager (User) (many-to-one)
  ├── Members[] (Users) (many-to-many)
  └── Groups (one-to-many)

Group
  ├── Team (many-to-one)
  ├── Members[] (Users) (many-to-many, max 5)
  └── TrainingSessions (one-to-many)

User
  ├── Company (many-to-one)
  ├── Team (many-to-one, optional)
  ├── Group (many-to-one, optional)
  ├── TrainingSessions (one-to-many)
  ├── ChatConversations (one-to-many)
  └── Analytics (one-to-many)

TrainingScenario
  └── TrainingSessions (one-to-many)

TrainingSession
  ├── User (many-to-one)
  ├── Group (many-to-one)
  ├── Scenario (many-to-one)
  └── ChatConversation (one-to-one)

ChatConversation
  ├── Session (one-to-one)
  └── User (many-to-one)

Analytics
  ├── User (many-to-one)
  └── Company (many-to-one)

ToneGuidelines
  └── (Standalone, referenced by AI service)
```

---

## 🚀 Usage Examples

### Creating a User
```typescript
import { User } from './models';

const user = await User.create({
  email: 'rep@example.com',
  password: 'password123',
  role: 'sales_rep',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
  },
  companyId: companyId,
});

// Password is automatically hashed via pre-save hook
```

### Authenticating a User
```typescript
const user = await User.findOne({ email: 'rep@example.com' }).select('+password');
const isMatch = await user.comparePassword('password123');
```

### Starting a Training Session
```typescript
const session = await TrainingSession.findById(sessionId);
await session.startSession();

// Add messages
await session.addMessage('customer', 'I want a small trial pack');
await session.addMessage('salesperson', 'I understand...');

// Update performance
await session.updatePerformanceScore(85, {
  confidence: 90,
  clarity: 85,
  structure: 80,
  objectionHandling: 88,
  closing: 82,
});

// Complete session
await session.completeSession();
```

### Querying Analytics
```typescript
const analytics = await Analytics.findOne({ userId });
const completionRate = analytics.calculateCompletionRate();
const bestDay = analytics.getBestPerformingDay();
```

---

## 📊 Index Summary

Total Indexes: 30+

**Performance Considerations**:
- All foreign keys are indexed
- Common query patterns are covered
- Compound indexes for frequently combined queries
- Unique indexes prevent duplicates

---

## ✅ Best Practices

1. **Always use `.select('+password')` when you need password**
   - Password is excluded by default for security

2. **Populate references for detailed data**
   ```typescript
   const session = await TrainingSession.findById(id)
     .populate('userId')
     .populate('scenarioId')
     .populate('groupId');
   ```

3. **Use instance methods for business logic**
   - Keeps logic close to data
   - Easier to test and maintain

4. **Leverage virtuals for computed fields**
   - No database storage needed
   - Automatically included in JSON

5. **Use static methods for common queries**
   - Encapsulates query logic
   - More readable code

---

**All models are production-ready with validation, indexes, and methods!** ✅
