import { Request, Response } from 'express';
import RAGService, { DocumentInput, SearchOptions } from '../services/ai/RAGService';
import logger from '../utils/logger';

/**
 * Knowledge Management Controller
 * Handles endpoints for managing the knowledge base
 */

/**
 * Ingest a new document into the knowledge base
 * POST /api/knowledge/ingest
 */
export const ingestDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const documentInput: DocumentInput = req.body;

    // Validate required fields
    if (!documentInput.title || !documentInput.content || !documentInput.metadata?.source) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: title, content, and metadata.source are required',
      });
      return;
    }

    logger.info('Ingesting document', { title: documentInput.title });

    const { knowledgeBase, chunks } = await RAGService.ingestDocument(documentInput);

    res.json({
      success: true,
      message: 'Document ingested successfully',
      data: {
        knowledgeBase: {
          id: knowledgeBase._id,
          title: knowledgeBase.fileName,
          status: knowledgeBase.status,
          totalChunks: knowledgeBase.totalChunks,
          totalCharacters: knowledgeBase.totalCharacters,
          source: knowledgeBase.source,
          category: knowledgeBase.category,
        },
        documentsCreated: chunks.length,
        documents: chunks.map(doc => ({
          id: doc._id,
          title: doc.title,
          chunkIndex: doc.chunkIndex,
        })),
      },
    });
  } catch (error) {
    logger.error('Ingest document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Search for similar documents
 * POST /api/knowledge/search
 */
export const searchDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, options } = req.body as { query: string; options?: SearchOptions };

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Query is required',
      });
      return;
    }

    logger.info('Searching documents', { query: query.substring(0, 100) });

    const results = await RAGService.searchSimilar(query, options);

    res.json({
      success: true,
      data: {
        resultsCount: results.length,
        results: results.map(result => ({
          id: result.document._id,
          title: result.document.title,
          text: result.document.text.substring(0, 200) + '...',
          score: result.score,
          source: result.document.source,
          metadata: result.document.metadata,
        })),
      },
    });
  } catch (error) {
    logger.error('Search documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search documents',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get a specific document by ID
 * GET /api/knowledge/:id
 */
export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await RAGService.getDocument(id);

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document._id,
          title: document.title,
          text: document.text,
          source: document.source,
          metadata: document.metadata,
          chunkIndex: document.chunkIndex,
          documentId: document.documentId,
          isActive: document.isActive,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all documents with optional filtering
 * GET /api/knowledge
 */
export const getAllDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { source, category, companyId, tags } = req.query;

    const filters: SearchOptions['filters'] = {};

    if (source) {
      filters.source = Array.isArray(source) ? source as string[] : String(source);
    }

    if (category) {
      filters.category = String(category);
    }

    if (companyId) {
      filters.companyId = String(companyId);
    }

    if (tags) {
      filters.tags = Array.isArray(tags) ? tags as string[] : [String(tags)];
    }

    const documents = await RAGService.getAllDocuments(filters);

    res.json({
      success: true,
      data: {
        count: documents.length,
        documents: documents.map(doc => ({
          id: doc._id,
          title: doc.title,
          textPreview: doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : ''),
          source: doc.source,
          metadata: doc.metadata,
          chunkIndex: doc.chunkIndex,
          createdAt: doc.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update a document
 * PUT /api/knowledge/:id
 */
export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const document = await RAGService.updateDocument(id, updates);

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: {
        document: {
          id: document._id,
          title: document.title,
          text: document.text,
          source: document.source,
          metadata: document.metadata,
          updatedAt: document.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete (deactivate) a document
 * DELETE /api/knowledge/:id
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await RAGService.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get knowledge base statistics
 * GET /api/knowledge/stats
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await RAGService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
