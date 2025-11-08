import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeBase extends Document {
  companyId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'manual';
  fileSize?: number; // In bytes
  uploadedAt: Date;

  // Processing status
  status: 'processing' | 'ready' | 'failed';
  processingError?: string;
  error?: string; // For backward compatibility
  processedAt?: Date;
  processingMetadata?: {
    duration: number;
    cost: number;
    chunkingMethod: string;
    embeddingModel: string;
  };

  // Stats (chunks are now in separate collection: KnowledgeChunk)
  totalChunks: number;
  totalTokens: number;
  totalCharacters: number;

  // Source metadata
  source: 'scenario' | 'guideline' | 'company' | 'manual' | 'session';
  category?: string;
  scenarioId?: mongoose.Types.ObjectId;

  // Metadata
  description?: string;
  tags?: string[];
  services: ('whatsapp' | 'ai_agent')[];
  isActive: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsReady(): Promise<this>;
  markAsFailed(error: string): Promise<this>;
}

// Model interface with statics
const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
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
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'docx', 'txt', 'manual'],
    },
    fileSize: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true,
    },
    processingError: String,
    error: String, // For backward compatibility
    processedAt: Date,
    processingMetadata: {
      duration: Number,
      cost: Number,
      chunkingMethod: String,
      embeddingModel: String,
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    totalCharacters: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      required: true,
      enum: ['scenario', 'guideline', 'company', 'manual', 'session'],
      index: true,
    },
    category: {
      type: String,
      index: true,
    },
    scenarioId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingScenario',
    },
    description: String,
    tags: [String],
    services: [{
      type: String,
      enum: ['whatsapp', 'ai_agent'],
      required: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
knowledgeBaseSchema.index({ companyId: 1, isActive: 1, status: 1 });
knowledgeBaseSchema.index({ userId: 1, createdAt: -1 });
knowledgeBaseSchema.index({ fileName: 'text', description: 'text' });
knowledgeBaseSchema.index({ source: 1, isActive: 1 });
knowledgeBaseSchema.index({ services: 1, isActive: 1 });

// NOTE: Vector search is now handled by KnowledgeChunk model
// Each chunk is a separate document with its own embedding
// See KnowledgeDocument.model.ts for vector search implementation

// Virtual for file size in MB
knowledgeBaseSchema.virtual('fileSizeMB').get(function (this: IKnowledgeBase) {
  if (!this.fileSize) return '0.00';
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Method to mark as processed
knowledgeBaseSchema.methods.markAsReady = async function () {
  this.status = 'ready';
  this.processedAt = new Date();
  // Note: totalChunks and totalCharacters are set by the processing function
  return await this.save();
};

// Method to mark as failed
knowledgeBaseSchema.methods.markAsFailed = async function (error: string) {
  this.status = 'failed';
  this.processingError = error;
  this.error = error; // For backward compatibility
  return await this.save();
};

export const KnowledgeBase = mongoose.model<IKnowledgeBase>(
  'KnowledgeBase',
  knowledgeBaseSchema
);

export default KnowledgeBase;
