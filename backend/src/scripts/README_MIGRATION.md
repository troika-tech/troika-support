# Services Field Migration

This migration script adds the `services` field to existing KnowledgeBase and KnowledgeChunk documents in the database.

## What it does

- Updates all existing `KnowledgeBase` documents to have `services: ['whatsapp', 'ai_agent']`
- Updates all existing `KnowledgeChunk` documents to have `services: ['whatsapp', 'ai_agent']`
- Only updates documents that don't already have the `services` field

## How to run

1. Make sure your `.env` file has the correct `MONGODB_URI`

2. Run the migration script:

```bash
cd backend
npx tsx src/scripts/migrateServicesField.ts
```

## Expected output

```
[INFO] Connecting to MongoDB...
[INFO] Connected to MongoDB successfully
[INFO] Starting KnowledgeBase migration...
[INFO] KnowledgeBase migration completed: X documents updated
[INFO] Starting KnowledgeChunk migration...
[INFO] KnowledgeChunk migration completed: Y documents updated
[INFO] === Migration Summary ===
[INFO] Total KnowledgeBase documents updated: X
[INFO] Total KnowledgeChunk documents updated: Y
[INFO] =========================
[INFO] Migration completed successfully!
[INFO] Disconnected from MongoDB
```

## MongoDB Atlas Vector Search Index Update

After running this migration, you need to update your MongoDB Atlas Vector Search Index to include the `services` filter field:

1. Go to MongoDB Atlas Dashboard
2. Navigate to your cluster
3. Click on "Search" tab
4. Find the `vector_index` index on the `knowledgechunks` collection
5. Edit the index and update the configuration to include the `services` filter:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "companyId"
    },
    {
      "type": "filter",
      "path": "source"
    },
    {
      "type": "filter",
      "path": "services"
    },
    {
      "type": "filter",
      "path": "isActive"
    }
  ]
}
```

## Rollback

If you need to rollback this migration, you can run:

```javascript
// In MongoDB shell or using MongoDB Compass
db.knowledgebases.updateMany({}, { $unset: { services: "" } });
db.knowledgechunks.updateMany({}, { $unset: { services: "" } });
```

## Notes

- This migration is idempotent - running it multiple times won't cause issues
- All existing KB documents will be accessible from both WhatsApp and AI Agent Sales Captain pages
- New KB uploads will require explicit service selection
