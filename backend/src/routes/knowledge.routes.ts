import { Router } from 'express';
import {
  ingestDocument,
  searchDocuments,
  getDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  getStats,
} from '../controllers/knowledge.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Knowledge Management Routes
 * All routes require authentication
 */

// Get statistics (placed before :id to avoid conflict)
router.get('/stats', authenticate, getStats);

// Ingest a new document
router.post('/ingest', authenticate, ingestDocument);

// Search for similar documents
router.post('/search', authenticate, searchDocuments);

// Get all documents with optional filtering
router.get('/', authenticate, getAllDocuments);

// Get specific document by ID
router.get('/:id', authenticate, getDocument);

// Update a document
router.put('/:id', authenticate, updateDocument);

// Delete (deactivate) a document
router.delete('/:id', authenticate, deleteDocument);

export default router;
