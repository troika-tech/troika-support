import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * KnowledgeChunk - Individual chunk with embedding
 * Each chunk is a separate document to support MongoDB Atlas Vector Search
 * (Vector fields can only appear once per document)
 */
export interface IKnowledgeChunk extends Document {
  // Reference to parent document
  documentId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;

  // Document info
  title: string;
  source: 'scenario' | 'guideline' | 'company' | 'manual' | 'session';

  // Chunk data
  text: string;
  embedding: number[]; // 1536 dimensions for text-embedding-3-small
  chunkIndex: number;

  // Metadata
  metadata: {
    category?: string;
    scenarioId?: mongoose.Types.ObjectId;
    tags?: string[];
    pageNumber?: number;
    section?: string;
  };

  // Service assignment
  services: ('whatsapp' | 'ai_agent')[];

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// Model interface with statics
export interface IKnowledgeChunkModel extends Model<IKnowledgeChunk> {
  vectorSearch(
    queryEmbedding: number[],
    options?: {
      limit?: number;
      minScore?: number;
      companyId?: string;
      filters?: any;
    }
  ): Promise<any[]>;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['scenario', 'guideline', 'company', 'manual', 'session'],
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return v.length === 1536;
        },
        message: 'Embedding must have exactly 1536 dimensions',
      },
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    metadata: {
      category: String,
      scenarioId: {
        type: Schema.Types.ObjectId,
        ref: 'TrainingScenario',
      },
      tags: {
        type: [String],
        default: [],
      },
      pageNumber: Number,
      section: String,
    },
    services: {
      type: [String],
      required: true,
      enum: ['whatsapp', 'ai_agent'],
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one service must be selected'
      },
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 });
knowledgeChunkSchema.index({ companyId: 1, isActive: 1 });
knowledgeChunkSchema.index({ userId: 1, createdAt: -1 });
knowledgeChunkSchema.index({ source: 1, isActive: 1 });
knowledgeChunkSchema.index({ services: 1, isActive: 1 });

// Text index for fallback search
knowledgeChunkSchema.index({ title: 'text', text: 'text' });

// CRITICAL: Vector Search Index
// This must be created in MongoDB Atlas UI (Search tab)
// Index name: 'vector_index'
// Collection: 'knowledgechunks'
//
// MongoDB Atlas Vector Search Index Configuration:
// {
//   "fields": [{
//     "type": "vector",
//     "path": "embedding",
//     "numDimensions": 1536,
//     "similarity": "cosine"
//   }, {
//     "type": "filter",
//     "path": "companyId"
//   }, {
//     "type": "filter",
//     "path": "source"
//   }, {
//     "type": "filter",
//     "path": "services"
//   }, {
//     "type": "filter",
//     "path": "isActive"
//   }]
// }

// Static method for vector search
knowledgeChunkSchema.statics.vectorSearch = async function (
  queryEmbedding: number[],
  options?: {
    limit?: number;
    minScore?: number;
    companyId?: string;
    filters?: any;
  }
) {
  const limit = options?.limit || 5;
  const minScore = options?.minScore || 0.7;

  // Build filter
  const filter: any = {
    isActive: true,
  };

  if (options?.companyId) {
    filter.companyId = new mongoose.Types.ObjectId(options.companyId);
  }

  if (options?.filters) {
    Object.assign(filter, options.filters);
  }

  // MongoDB Atlas Vector Search aggregation pipeline
  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: 'vector_index', // Must match index name in Atlas
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 10,
        limit: limit,
        filter: filter,
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $match: {
        score: { $gte: minScore },
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        title: 1,
        source: 1,
        text: 1,
        chunkIndex: 1,
        metadata: 1,
        score: 1,
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $limit: limit },
  ];

  return await this.aggregate(pipeline);
};

export const KnowledgeChunk = mongoose.model<IKnowledgeChunk, IKnowledgeChunkModel>(
  'KnowledgeChunk',
  knowledgeChunkSchema
);

// Default export for backward compatibility
export default KnowledgeChunk;
