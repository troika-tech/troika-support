# Service-Specific Knowledge Base Implementation Summary

## Overview
Implemented service-specific knowledge base filtering to allow knowledge base files to be assigned to either "WhatsApp Marketing" or "AI Chat & Calling Agent" services (or both). Sales reps now have separate Sales Captain pages for each service that only show relevant knowledge.

---

## Changes Made

### 1. Database Schema Updates

#### Backend Models
- **[KnowledgeBase.model.ts](backend/src/models/KnowledgeBase.model.ts)**
  - Added `services: ('whatsapp' | 'ai_agent')[]` field (required, at least one must be selected)
  - Added index on `services` field
  - Added validation to ensure at least one service is selected

- **[KnowledgeDocument.model.ts](backend/src/models/KnowledgeDocument.model.ts)**
  - Added `services: ('whatsapp' | 'ai_agent')[]` field to chunks
  - Added index on `services` field
  - Updated vector search index documentation to include `services` filter

### 2. Backend API Changes

#### RAG Service
- **[RAGService.ts](backend/src/services/ai/RAGService.ts)**
  - Updated `DocumentInput` interface to include `services` field
  - Updated `SearchOptions` interface to include `services` filter
  - Modified `ingestDocument()` to store services in both KnowledgeBase and KnowledgeChunk
  - Modified `searchSimilar()` to filter by services
  - Updated `fallbackTextSearch()` to support services filtering
  - Updated `getAllDocuments()` to support services filtering

#### Admin Controller
- **[admin.controller.ts](backend/src/controllers/admin.controller.ts)**
  - Updated `uploadKnowledgeBaseFile()` to accept and validate `services` parameter
  - Added parsing logic to handle both JSON array and comma-separated string formats
  - Added validation to ensure at least one service is selected
  - Updated response to include services field

#### AI Controller
- **[ai.controller.ts](backend/src/controllers/ai.controller.ts)**
  - Updated `salesCaptainStream()` to accept `service` parameter (required)
  - Added validation to ensure service is either "whatsapp" or "ai_agent"
  - Added service filter to RAG search options
  - Updated logging to include service parameter

### 3. Frontend Changes

#### Admin KB Upload UI
- **[KnowledgeBase.tsx](frontend/src/pages/admin/KnowledgeBase.tsx)**
  - Added `uploadServices` state (defaults to both services)
  - Added multi-select dropdown for services with checkboxes
  - Added visual chips to show selected services
  - Updated form submission to include services in FormData
  - Added validation to ensure at least one service is selected
  - Reset services to both after successful upload

#### New Sales Captain Pages
- **[SalesCaptainWhatsApp.tsx](frontend/src/pages/sales/SalesCaptainWhatsApp.tsx)** (NEW)
  - Clone of SalesCaptain with WhatsApp branding (green theme)
  - Passes `service: 'whatsapp'` in API calls
  - Shows WhatsApp-specific welcome message and chips
  - Uses WhatsApp icon and colors

- **[SalesCaptainAIAgent.tsx](frontend/src/pages/sales/SalesCaptainAIAgent.tsx)** (NEW)
  - Clone of SalesCaptain with AI Agent branding (purple theme)
  - Passes `service: 'ai_agent'` in API calls
  - Shows AI Agent-specific welcome message and chips
  - Uses AI icon and colors

#### Routing
- **[App.tsx](frontend/src/App.tsx)**
  - Added imports for `SalesCaptainWhatsApp` and `SalesCaptainAIAgent`
  - Added routes:
    - `/sales-captain/whatsapp`
    - `/sales-captain/ai-agent`

#### Navigation
- **[DashboardLayout.tsx](frontend/src/components/layout/DashboardLayout.tsx)**
  - Added WhatsApp and AI icons import
  - Added menu items for both new pages:
    - "SC - WhatsApp" → `/sales-captain/whatsapp`
    - "SC - AI Agent" → `/sales-captain/ai-agent`
  - Updated `isSalesCaptainPage` logic to include new routes

### 4. Data Migration

#### Migration Script
- **[migrateServicesField.ts](backend/src/scripts/migrateServicesField.ts)** (NEW)
  - Connects to MongoDB
  - Updates all existing KnowledgeBase documents to have both services
  - Updates all existing KnowledgeChunk documents to have both services
  - Only updates documents that don't have services field
  - Provides detailed logging and summary

#### Migration Documentation
- **[README_MIGRATION.md](backend/src/scripts/README_MIGRATION.md)** (NEW)
  - Instructions on how to run the migration
  - Expected output examples
  - Instructions for updating MongoDB Atlas Vector Search Index
  - Rollback instructions
  - Important notes

---

## How to Use

### For Admins - Uploading Knowledge Base

1. Go to Admin → Knowledge Base
2. Select a file (PDF, DOCX, or TXT)
3. Fill in Source, Category, Tags (optional)
4. **Select Services** (required):
   - ✅ WhatsApp Marketing
   - ✅ AI Chat & Calling Agent
   - Or choose only one
5. Click "Select File" to upload

### For Sales Reps - Using Sales Captain

#### WhatsApp Marketing
- Navigate to "SC - WhatsApp" in sidebar
- Ask questions about WhatsApp Marketing
- Only sees knowledge base articles tagged with "whatsapp" service

#### AI Chat & Calling Agent
- Navigate to "SC - AI Agent" in sidebar
- Ask questions about AI Agents
- Only sees knowledge base articles tagged with "ai_agent" service

#### General (Original)
- Navigate to "Sales Captain" in sidebar
- Original page still works (no service filter)
- Shows all knowledge base articles

---

## MongoDB Atlas Setup Required

⚠️ **IMPORTANT**: After running the migration, you must update the MongoDB Atlas Vector Search Index:

1. Go to MongoDB Atlas Dashboard
2. Navigate to your cluster → Search tab
3. Find `vector_index` on `knowledgechunks` collection
4. Edit and add the `services` filter field:

```json
{
  "type": "filter",
  "path": "services"
}
```

See [README_MIGRATION.md](backend/src/scripts/README_MIGRATION.md) for full index configuration.

---

## Running the Migration

```bash
# From project root
cd backend
npx tsx src/scripts/migrateServicesField.ts
```

Expected output:
- ✅ All existing KnowledgeBase documents updated
- ✅ All existing KnowledgeChunk documents updated
- ✅ Both services assigned by default (backward compatibility)

---

## Testing Checklist

### Backend
- [ ] Upload new KB file with only "whatsapp" service
- [ ] Upload new KB file with only "ai_agent" service
- [ ] Upload new KB file with both services
- [ ] Verify validation error when no service is selected
- [ ] Check that services are stored correctly in database

### Frontend - Admin
- [ ] Services dropdown shows both options
- [ ] Can select one service
- [ ] Can select both services
- [ ] Cannot submit without selecting at least one service
- [ ] Services are reset after successful upload

### Frontend - Sales Captain Pages
- [ ] WhatsApp page only retrieves whatsapp KB articles
- [ ] AI Agent page only retrieves ai_agent KB articles
- [ ] Original page still works (no filter)
- [ ] Navigation links work correctly
- [ ] Styling and branding is correct for each page

### Migration
- [ ] Migration script runs successfully
- [ ] Existing documents have both services assigned
- [ ] Running migration twice doesn't cause issues (idempotent)

---

## File Changes Summary

### Modified Files (13)
1. `backend/src/models/KnowledgeBase.model.ts`
2. `backend/src/models/KnowledgeDocument.model.ts`
3. `backend/src/services/ai/RAGService.ts`
4. `backend/src/controllers/admin.controller.ts`
5. `backend/src/controllers/ai.controller.ts`
6. `frontend/src/pages/admin/KnowledgeBase.tsx`
7. `frontend/src/App.tsx`
8. `frontend/src/components/layout/DashboardLayout.tsx`

### New Files (4)
1. `frontend/src/pages/sales/SalesCaptainWhatsApp.tsx`
2. `frontend/src/pages/sales/SalesCaptainAIAgent.tsx`
3. `backend/src/scripts/migrateServicesField.ts`
4. `backend/src/scripts/README_MIGRATION.md`

---

## Architecture Decisions

1. **Both services by default for existing data**: Ensures backward compatibility and doesn't break existing functionality

2. **Cannot reassign services after upload**: Implemented via required field at creation - no update endpoint provided

3. **One KB can belong to both services**: Reduces duplication and allows shared knowledge

4. **Separate pages instead of dropdown**: Better UX - sales reps can have both pages open simultaneously

5. **Array filter using $in operator**: Allows efficient filtering for documents with multiple services

6. **Service validation at multiple layers**:
   - Database schema validation
   - Backend controller validation
   - Frontend form validation

---

## Future Enhancements

- Add ability to filter KB list in admin by service
- Add service badges/tags in KB list view
- Add analytics per service
- Add bulk service reassignment tool for admins
- Add service filter to existing Sales Captain page
