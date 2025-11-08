import { Router } from 'express';
import multer from 'multer';
import {
  getDashboardStats,
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
  uploadKnowledgeBaseFile,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { USER_ROLES } from '../config/constants';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

/**
 * Admin Routes
 * All routes require authentication and super_admin role
 */

// Dashboard stats
router.get('/dashboard/stats', authenticate, authorize(USER_ROLES.SUPER_ADMIN), getDashboardStats);

// Knowledge base management
router.post(
  '/knowledge-base/upload',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  upload.single('file'),
  uploadKnowledgeBaseFile
);
router.get('/knowledge-base', authenticate, authorize(USER_ROLES.SUPER_ADMIN), getKnowledgeBaseArticles);
router.get('/knowledge-base/:id', authenticate, authorize(USER_ROLES.SUPER_ADMIN), getKnowledgeBaseArticle);
router.put('/knowledge-base/:id', authenticate, authorize(USER_ROLES.SUPER_ADMIN), updateKnowledgeBaseArticle);
router.delete('/knowledge-base/:id', authenticate, authorize(USER_ROLES.SUPER_ADMIN), deleteKnowledgeBaseArticle);

export default router;

