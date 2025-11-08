import mongoose from 'mongoose';
import KnowledgeChunk, { IKnowledgeChunk } from '../../models/KnowledgeDocument.model';
import KnowledgeBase, { IKnowledgeBase } from '../../models/KnowledgeBase.model';
import OpenAIService from './OpenAIService';
import logger from '../../utils/logger';

/**
 * Input for document ingestion
 */
export interface DocumentInput {
  title: string;
  content: string;
  fileType?: 'pdf' | 'docx' | 'txt' | 'manual';
  description?: string;
  services: ('whatsapp' | 'ai_agent')[];
  metadata: {
    source: 'scenario' | 'guideline' | 'company' | 'manual' | 'session';
    category?: string;
    companyId?: string;
    scenarioId?: string;
    tags?: string[];
    userId?: string;
  };
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  document: IKnowledgeChunk;
  score: number;
}

/**
 * Search options for vector search
 */
export interface SearchOptions {
  limit?: number;
  minScore?: number;
  filters?: {
    source?: string | string[];
    category?: string;
    companyId?: string;
    tags?: string[];
    services?: string | string[];
  };
}

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles document ingestion, vector search, and context generation
 */
class RAGService {
  private readonly CHUNK_SIZE = 500; // ~500 tokens per chunk
  private readonly CHUNK_OVERLAP = 50; // 50 token overlap between chunks

  /**
   * Chunk text into smaller pieces for better retrieval
   * @param text - Text to chunk
   * @returns Array of text chunks
   */
  private chunkText(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
      const chunk = words.slice(i, i + this.CHUNK_SIZE).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Ingest a document into the knowledge base
   * Chunks the content, generates embeddings, and stores in MongoDB
   * @param input - Document to ingest
   * @returns Array of created knowledge chunks
   */
  async ingestDocument(input: DocumentInput): Promise<{
    knowledgeBase: IKnowledgeBase;
    chunks: IKnowledgeChunk[];
  }> {
    try {
      logger.info('Ingesting document', { title: input.title, source: input.metadata.source });

      // Chunk the content
      const chunks = this.chunkText(input.content);
      logger.info(`Split into ${chunks.length} chunks`);

      // Generate embeddings for all chunks in batch
      const embeddings = await OpenAIService.generateEmbeddings(chunks);

      // Create parent document in KnowledgeBase
      const knowledgeBase = new KnowledgeBase({
        companyId: input.metadata.companyId ? new mongoose.Types.ObjectId(input.metadata.companyId) : undefined,
        userId: input.metadata.userId ? new mongoose.Types.ObjectId(input.metadata.userId) : undefined,
        fileName: input.title,
        fileType: input.fileType ?? 'manual',
        status: 'processing',
        source: input.metadata.source,
        category: input.metadata.category,
        scenarioId: input.metadata.scenarioId ? new mongoose.Types.ObjectId(input.metadata.scenarioId) : undefined,
        totalChunks: chunks.length,
        totalTokens: 0,
        totalCharacters: input.content.length,
        tags: input.metadata.tags,
        services: input.services,
        isActive: true,
        description: input.description,
      });

      await knowledgeBase.save();
      const documentId = knowledgeBase._id as mongoose.Types.ObjectId;
      logger.info('Created knowledge base document', { documentId });

      // Create knowledge chunks for each chunk
      const documents: IKnowledgeChunk[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const doc = new KnowledgeChunk({
          documentId: documentId,
          companyId: input.metadata.companyId ? new mongoose.Types.ObjectId(input.metadata.companyId) : undefined,
          title: chunks.length > 1 ? `${input.title} (Part ${i + 1}/${chunks.length})` : input.title,
          source: input.metadata.source,
          text: chunks[i],
          embedding: embeddings[i],
          chunkIndex: i,
          metadata: {
            category: input.metadata.category,
            scenarioId: input.metadata.scenarioId ? new mongoose.Types.ObjectId(input.metadata.scenarioId) : undefined,
            tags: input.metadata.tags,
          },
          services: input.services,
          isActive: true,
        });

        await doc.save();
        documents.push(doc);
      }

      // Mark knowledge base as ready
      const updatedKnowledgeBase = await knowledgeBase.markAsReady();

      logger.info('Document ingestion completed', {
        title: input.title,
        chunks: chunks.length,
        documentsCreated: documents.length,
      });

      return {
        knowledgeBase: updatedKnowledgeBase,
        chunks: documents,
      };
    } catch (error) {
      logger.error('Document ingestion error:', error);
      throw new Error('Failed to ingest document');
    }
  }

  /**
   * Search for similar documents using vector similarity
   * Uses MongoDB Atlas Vector Search via static method
   * @param query - Search query text
   * @param options - Search options (limit, filters, etc.)
   * @returns Array of search results with similarity scores
   */
  async searchSimilar(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const {
        limit = 10,
        minScore = 0.7,
        filters = {},
      } = options;

      logger.info('Searching for similar documents', { query: query.substring(0, 100), limit });

      // Generate embedding for the query
      const queryEmbedding = await OpenAIService.generateEmbedding(query);

      // Build search filters
      const searchFilters: any = {};

      if (filters.source) {
        searchFilters.source = Array.isArray(filters.source) ? { $in: filters.source } : filters.source;
      }

      if (filters.category) {
        searchFilters['metadata.category'] = filters.category;
      }

      if (filters.tags && filters.tags.length > 0) {
        searchFilters['metadata.tags'] = { $in: filters.tags };
      }

      if (filters.services) {
        searchFilters.services = Array.isArray(filters.services) ? { $in: filters.services } : filters.services;
      }

      // Use the static vectorSearch method from the model
      const results = await KnowledgeChunk.vectorSearch(queryEmbedding, {
        limit,
        minScore,
        companyId: filters.companyId,
        filters: searchFilters,
      });

      logger.info('Vector search completed', {
        resultsFound: results.length,
        topScore: results[0]?.score || 0,
      });

      return results.map((doc: any) => ({
        document: doc as IKnowledgeChunk,
        score: doc.score,
      }));
    } catch (error) {
      logger.error('Vector search error:', error);

      // Fallback to text search if vector search fails (index might not exist yet)
      logger.warn('Falling back to text search');
      return this.fallbackTextSearch(query, options);
    }
  }

  /**
   * Fallback text search when vector search is unavailable
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  private async fallbackTextSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      limit = 10,
      filters = {},
    } = options;

    const matchFilters: any = {
      isActive: true,
      $text: { $search: query },
    };

    if (filters.source) {
      matchFilters.source = Array.isArray(filters.source) ? { $in: filters.source } : filters.source;
    }

    if (filters.category) {
      matchFilters['metadata.category'] = filters.category;
    }

    if (filters.companyId) {
      matchFilters.companyId = new mongoose.Types.ObjectId(filters.companyId);
    }

    if (filters.services) {
      matchFilters.services = Array.isArray(filters.services) ? { $in: filters.services } : filters.services;
    }

    const results = await KnowledgeChunk.find(matchFilters)
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .lean();

    return results.map((doc: any) => ({
      document: doc as IKnowledgeChunk,
      score: 0.5, // Default score for text search
    }));
  }

  /**
   * Format search results into context string for AI
   * @param results - Search results
   * @returns Formatted context string
   */
  formatContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }

    const contextParts = results.map((result, index) => {
      return `[Source ${index + 1}] (Relevance: ${(result.score * 100).toFixed(1)}%)
Title: ${result.document.title}
Content: ${result.document.text}
Source: ${result.document.source}
${result.document.metadata.category ? `Category: ${result.document.metadata.category}` : ''}
`;
    });

    return `RELEVANT KNOWLEDGE BASE CONTEXT:\n\n${contextParts.join('\n---\n\n')}`;
  }

  /**
   * Delete a knowledge chunk by ID
   * @param documentId - ID of chunk to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await KnowledgeChunk.findByIdAndUpdate(documentId, { isActive: false });
      logger.info('Chunk deactivated', { documentId });
    } catch (error) {
      logger.error('Chunk deletion error:', error);
      throw new Error('Failed to delete chunk');
    }
  }

  /**
   * Get chunk by ID
   * @param documentId - ID of chunk to retrieve
   * @returns Knowledge chunk
   */
  async getDocument(documentId: string): Promise<IKnowledgeChunk | null> {
    try {
      return await KnowledgeChunk.findById(documentId);
    } catch (error) {
      logger.error('Get chunk error:', error);
      throw new Error('Failed to retrieve chunk');
    }
  }

  /**
   * Get all chunks with optional filtering
   * @param filters - Optional filters
   * @returns Array of knowledge chunks
   */
  async getAllDocuments(filters: SearchOptions['filters'] = {}): Promise<IKnowledgeChunk[]> {
    try {
      const query: any = { isActive: true };

      if (filters.source) {
        query.source = Array.isArray(filters.source) ? { $in: filters.source } : filters.source;
      }

      if (filters.category) {
        query['metadata.category'] = filters.category;
      }

      if (filters.companyId) {
        query.companyId = new mongoose.Types.ObjectId(filters.companyId);
      }

      if (filters.services) {
        query.services = Array.isArray(filters.services) ? { $in: filters.services } : filters.services;
      }

      return await KnowledgeChunk.find(query).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Get all chunks error:', error);
      throw new Error('Failed to retrieve chunks');
    }
  }

  /**
   * Update a chunk (regenerates embeddings if text changed)
   * @param documentId - ID of chunk to update
   * @param updates - Fields to update
   * @returns Updated chunk
   */
  async updateDocument(
    documentId: string,
    updates: Partial<DocumentInput>
  ): Promise<IKnowledgeChunk | null> {
    try {
      const doc = await KnowledgeChunk.findById(documentId);

      if (!doc) {
        throw new Error('Chunk not found');
      }

      // If content changed, regenerate embedding
      if (updates.content && updates.content !== doc.text) {
        const embedding = await OpenAIService.generateEmbedding(updates.content);
        doc.embedding = embedding;
        doc.text = updates.content;
      }

      if (updates.title) {
        doc.title = updates.title;
      }

      if (updates.metadata) {
        doc.metadata = { ...doc.metadata, ...updates.metadata } as any;
      }

      await doc.save();
      logger.info('Chunk updated', { documentId });

      return doc;
    } catch (error) {
      logger.error('Chunk update error:', error);
      throw new Error('Failed to update chunk');
    }
  }

  /**
   * Get statistics about the knowledge base
   * @returns Statistics object
   */
  async getStats(): Promise<{
    totalDocuments: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const pipeline = [
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sources: { $push: '$source' },
            categories: { $push: '$metadata.category' },
          },
        },
      ];

      const result = await KnowledgeChunk.aggregate(pipeline);

      if (!result || result.length === 0) {
        return { totalDocuments: 0, bySource: {}, byCategory: {} };
      }

      const data = result[0];

      // Count by source
      const bySource: Record<string, number> = {};
      data.sources.forEach((source: string) => {
        bySource[source] = (bySource[source] || 0) + 1;
      });

      // Count by category
      const byCategory: Record<string, number> = {};
      data.categories.forEach((category: string) => {
        if (category) {
          byCategory[category] = (byCategory[category] || 0) + 1;
        }
      });

      return {
        totalDocuments: data.total,
        bySource,
        byCategory,
      };
    } catch (error) {
      logger.error('Get stats error:', error);
      throw new Error('Failed to retrieve statistics');
    }
  }
}

export default new RAGService();
