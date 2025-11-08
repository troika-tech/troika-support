import path from 'path';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model';
import Team from '../models/Team.model';
import Company from '../models/Company.model';
import KnowledgeBase from '../models/KnowledgeBase.model';
import KnowledgeChunk from '../models/KnowledgeDocument.model';
import TrainingSession from '../models/TrainingSession.model';
import RAGService from '../services/ai/RAGService';
import { sendSuccess } from '../utils/helpers';
import logger from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import { extractTextFromFile, isSupportedKnowledgeFile } from '../utils/fileParser';

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

/**
 * Admin Controller
 * Handles admin-specific endpoints for dashboard and management
 */

/**
 * Get admin dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get active users count
    const activeUsersCount = await User.countDocuments({ isActive: true });
    
    // Get teams count
    const teamsCount = await Team.countDocuments();
    
    // Get knowledge base articles count (unique parent documents from KnowledgeBase collection)
    const knowledgeArticlesCount = await KnowledgeBase.countDocuments({ isActive: true });
    
    // Get pending reviews (knowledge base documents with status 'processing')
    const pendingReviewsCount = await KnowledgeBase.countDocuments({ status: 'processing' });
    
    // Get total users (including inactive)
    const totalUsersCount = await User.countDocuments();
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    
    const recentTeams = await Team.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    
    const recentKnowledge = await KnowledgeBase.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    
    // Get companies count
    const companiesCount = await Company.countDocuments();
    
    // Get active training sessions
    const activeSessionsCount = await TrainingSession.countDocuments({
      status: 'in_progress',
    });
    
    // Get completed sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const completedSessionsCount = await TrainingSession.countDocuments({
      status: 'completed',
      updatedAt: { $gte: thirtyDaysAgo },
    });

    const stats = {
      activeUsers: {
        value: activeUsersCount,
        trend: recentUsers > 0 ? `+${recentUsers} this week` : 'No new users',
      },
      teams: {
        value: teamsCount,
        trend: recentTeams > 0 ? `+${recentTeams} this week` : 'No new teams',
      },
      knowledgeArticles: {
        value: knowledgeArticlesCount,
        trend: recentKnowledge > 0 ? `+${recentKnowledge} new` : 'No new articles',
      },
      pendingReviews: {
        value: pendingReviewsCount,
        trend: pendingReviewsCount > 0 ? 'Needs attention' : 'All clear',
      },
      totalUsers: totalUsersCount,
      companies: companiesCount,
      activeSessions: activeSessionsCount,
      completedSessions: completedSessionsCount,
    };

    sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

/**
 * Get all knowledge base articles for admin
 * GET /api/admin/knowledge-base
 */
export const getKnowledgeBaseArticles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    
    const query: any = {};
    
    // Build query filters
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get total count
    const total = await KnowledgeBase.countDocuments(query);
    
    // Get paginated results
    const skip = (Number(page) - 1) * Number(limit);
    const articles = await KnowledgeBase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('companyId', 'name')
      .populate('userId', 'profile.firstName profile.lastName email')
      .lean();
    
    // Format response
    const formattedArticles = articles.map((article) => ({
      id: article._id,
      title: article.fileName,
      summary: article.description || `Uploaded on ${new Date(article.uploadedAt).toLocaleDateString()}`,
      updatedAt: article.updatedAt 
        ? `Updated ${getTimeAgo(article.updatedAt)}`
        : `Created ${getTimeAgo(article.createdAt)}`,
      status: article.status,
      totalChunks: article.totalChunks || 0,
      companyName: (article.companyId as any)?.name,
      uploaderName: (article.userId as any)
        ? `${(article.userId as any).profile?.firstName || ''} ${(article.userId as any).profile?.lastName || ''}`.trim() || (article.userId as any).email
        : 'Unknown',
    }));

    sendSuccess(res, {
      articles: formattedArticles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Knowledge base articles retrieved successfully');
  } catch (error) {
    logger.error('Get knowledge base articles error:', error);
    next(error);
  }
};

/**
 * Get knowledge base article by ID
 * GET /api/admin/knowledge-base/:id
 */
export const getKnowledgeBaseArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const article = await KnowledgeBase.findById(id)
      .populate('companyId', 'name')
      .populate('userId', 'profile.firstName profile.lastName email')
      .lean();
    
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article not found',
      });
      return;
    }
    
    // Get all chunks for this article
    const chunks = await KnowledgeChunk.find({
      parentDocumentId: id,
    }).sort({ chunkIndex: 1 }).lean();
    
    sendSuccess(res, {
      article: {
        id: article._id,
        title: article.fileName,
        description: article.description,
        status: article.status,
        totalChunks: article.totalChunks || 0,
        totalTokens: article.totalTokens || 0,
        totalCharacters: article.totalCharacters || 0,
        companyName: (article.companyId as any)?.name,
        uploaderName: (article.userId as any)
          ? `${(article.userId as any).profile?.firstName || ''} ${(article.userId as any).profile?.lastName || ''}`.trim() || (article.userId as any).email
          : 'Unknown',
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        chunks: chunks.map((chunk) => ({
          id: chunk._id,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text.substring(0, 500),
          textLength: chunk.text.length,
        })),
      },
    }, 'Article retrieved successfully');
  } catch (error) {
    logger.error('Get knowledge base article error:', error);
    next(error);
  }
};

/**
 * Update knowledge base article
 * PUT /api/admin/knowledge-base/:id
 */
export const updateKnowledgeBaseArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, isActive } = req.body;
    
    const article = await KnowledgeBase.findById(id);
    
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article not found',
      });
      return;
    }
    
    if (description !== undefined) article.description = description;
    if (isActive !== undefined) article.isActive = isActive;
    
    await article.save();
    
    sendSuccess(res, {
      article: {
        id: article._id,
        title: article.fileName,
        description: article.description,
        isActive: article.isActive,
      },
    }, 'Article updated successfully');
  } catch (error) {
    logger.error('Update knowledge base article error:', error);
    next(error);
  }
};

/**
 * Delete knowledge base article
 * DELETE /api/admin/knowledge-base/:id
 */
export const deleteKnowledgeBaseArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const article = await KnowledgeBase.findById(id);
    
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Article not found',
      });
      return;
    }
    
    // Soft delete: mark as deleted and inactive
    article.isActive = false;
    article.deletedAt = new Date();
    await article.save();
    
    // Also mark chunks as inactive
    await KnowledgeChunk.updateMany(
      { parentDocumentId: id },
      { isActive: false }
    );
    
    sendSuccess(res, null, 'Article deleted successfully');
  } catch (error) {
    logger.error('Delete knowledge base article error:', error);
    next(error);
  }
};

/**
 * Upload knowledge base file and ingest into embeddings store
 * POST /api/admin/knowledge-base/upload
 */
export const uploadKnowledgeBaseFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file uploaded. Please select a PDF, TXT, or DOCX file.');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestError('File is too large. Maximum upload size is 100MB.');
    }

    if (!isSupportedKnowledgeFile(file.originalname)) {
      throw new BadRequestError('Unsupported file type. Only PDF, TXT, and DOCX files are allowed.');
    }

    const { text, fileType } = await extractTextFromFile(file);

    if (!text || !text.trim()) {
      throw new BadRequestError('Unable to extract text from the uploaded file. Please verify the document content.');
    }

    const extension = path.extname(file.originalname);
    const defaultTitle = path.basename(file.originalname, extension);
    const title = (req.body.title || defaultTitle || 'Untitled Document').trim();

    const description = typeof req.body.description === 'string' && req.body.description.trim().length > 0
      ? req.body.description.trim()
      : undefined;

    // Parse services field
    let services: ('whatsapp' | 'ai_agent')[] = [];
    if (typeof req.body.services === 'string') {
      try {
        const parsedServices = JSON.parse(req.body.services);
        services = Array.isArray(parsedServices) ? parsedServices : [];
      } catch {
        // If parsing fails, treat as comma-separated string
        services = req.body.services.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(req.body.services)) {
      services = req.body.services;
    }

    // Validate services
    const validServices: ('whatsapp' | 'ai_agent')[] = services.filter(
      (s: string) => s === 'whatsapp' || s === 'ai_agent'
    );

    if (validServices.length === 0) {
      throw new BadRequestError('At least one service (whatsapp or ai_agent) must be selected.');
    }

    const { knowledgeBase, chunks } = await RAGService.ingestDocument({
      title,
      content: text,
      fileType,
      description,
      services: validServices,
      metadata: {
        source: 'manual',
        companyId: req.user?.companyId,
        userId: req.user?.userId,
      },
    });

    sendSuccess(
      res,
      {
        knowledgeBase: {
          id: knowledgeBase._id,
          title: knowledgeBase.fileName,
          status: knowledgeBase.status,
          services: knowledgeBase.services,
          totalChunks: knowledgeBase.totalChunks,
          totalCharacters: knowledgeBase.totalCharacters,
          fileType: knowledgeBase.fileType,
          createdAt: knowledgeBase.createdAt,
        },
        chunksCreated: chunks.length,
        originalFileName: file.originalname,
      },
      'Knowledge base file uploaded successfully',
      201
    );
  } catch (error) {
    logger.error('Upload knowledge base file error:', error);
    next(error);
  }
};

/**
 * Helper function to get time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

