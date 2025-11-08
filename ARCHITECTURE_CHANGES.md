# Architecture Changes - Single Company App

## Overview
The Sales Captain application has been simplified to support a single company architecture, removing the multi-tenant Company and Subscription models.

## Changes Made

### 1. **User Model** (`backend/src/models/User.model.ts`)
**Removed:**
- `companyId` field and reference
- Company-related index

**Added:**
- `isEmailVerified` boolean field

**Result:** Users no longer require a company association.

---

### 2. **Team Model** (`backend/src/models/Team.model.ts`)
**Removed:**
- `companyId` field and reference
- Company-related indexes

**Result:** Teams are now global to the application.

---

### 3. **Group Model** (`backend/src/models/Group.model.ts`)
**Removed:**
- `companyId` field and reference
- Company-related indexes

**Result:** Groups are scoped only by Team, not by Company.

---

### 4. **Analytics Model** (`backend/src/models/Analytics.model.ts`)
**Removed:**
- `companyId` field and reference
- Company-related indexes
- `getCompanyAnalytics()` static method

**Result:** Analytics are user-specific only.

---

### 5. **Company Model** (Still exists but unused)
The `Company.model.ts` file still exists in the codebase but is not referenced or required by any other models.

**Recommendation:** This file can be deleted in the future if company features are never needed.

---

## Database Schema Updates

### Before (Multi-tenant):
```
User -> Company
Team -> Company
Group -> Company + Team
Analytics -> Company + User
```

### After (Single Company):
```
User (standalone)
Team (standalone)
Group -> Team
Analytics -> User
```

---

## Migration Notes

### Existing User Recreated:
- **Email:** pratik.yesare68@gmail.com
- **Password:** Pratik@2001
- **User ID:** 690d7101f6e52095684c384f
- **Status:** Active, Email Verified
- **Role:** sales_rep

### Scripts Updated:
1. **`createUser.ts`** - Updated to create users without company
2. **`cleanAndRecreateUser.ts`** - New script to clean old data and recreate user

---

## Benefits of Single Company Architecture

1. **Simplified Data Model:** No need to manage company subscriptions, limits, or settings
2. **Easier Queries:** No company filtering required in database queries
3. **Reduced Complexity:** Fewer relationships and indexes to maintain
4. **Better Performance:** Simpler queries with fewer joins
5. **Easier Deployment:** No need for multi-tenant isolation logic

---

## What Still Works

- User authentication and authorization
- Team management
- Group creation and management (5 members max)
- Training sessions
- AI-powered feedback
- Analytics per user
- Role-based access (super_admin, manager, sales_rep)

---

## Future Considerations

If multi-company support is needed in the future:
1. Add back `companyId` to all models
2. Update all queries to filter by company
3. Implement tenant isolation middleware
4. Add company registration/subscription flow
5. Update frontend to show company switcher for super_admins

---

## Index Optimizations

Fixed duplicate index warnings by removing redundant `schema.index()` calls where `index: true` was already set on fields:
- `email` field in User model
- `groupId` field in User model

---

## Commands to Run

```bash
# Create a new user
npm run create-user

# Clean and recreate user (removes old company data)
npx tsx src/scripts/cleanAndRecreateUser.ts
```

---

## Date: 2025-11-07
## Author: Claude (AI Assistant)
