import mongoose, { Document, Schema, Model } from 'mongoose';
import { SESSION_STATUS, CHAT_ROLES } from '../config/constants';

export interface IMessageMetadata {
  corrections?: string[];
  improvedVersion?: string;
  scoreChange?: number;
}

export interface IConversationMessage {
  _id: mongoose.Types.ObjectId;
  role: 'customer' | 'salesperson' | 'coach';
  message: string;
  timestamp: Date;
  metadata?: IMessageMetadata;
}

export interface IPerformanceMetrics {
  confidence: number;
  clarity: number;
  structure: number;
  objectionHandling: number;
  closing: number;
}

export interface IPerformance {
  initialResponse: string;
  correctedResponse: string;
  finalResponse: string;
  score: number;
  metrics: IPerformanceMetrics;
}

export interface IVoiceRecording {
  url: string;
  duration: number;
}

export interface IFeedback {
  aiCoachNotes: string;
  managerNotes?: string;
}

export interface ITrainingSession extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  scenarioId: mongoose.Types.ObjectId;
  day: number;
  sessionDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  conversationLog: IConversationMessage[];
  performance: IPerformance;
  voiceRecording?: IVoiceRecording;
  feedback: IFeedback;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  startSession(): Promise<ITrainingSession>;
  completeSession(): Promise<ITrainingSession>;
  addMessage(role: string, message: string, metadata?: IMessageMetadata): Promise<ITrainingSession>;
  calculateDuration(): number;
  updatePerformanceScore(score: number, metrics: IPerformanceMetrics): Promise<ITrainingSession>;
}

const messageMetadataSchema = new Schema<IMessageMetadata>(
  {
    corrections: [String],
    improvedVersion: String,
    scoreChange: Number,
  },
  { _id: false }
);

const conversationMessageSchema = new Schema<IConversationMessage>({
  role: {
    type: String,
    enum: Object.values(CHAT_ROLES),
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: messageMetadataSchema,
});

const performanceMetricsSchema = new Schema<IPerformanceMetrics>(
  {
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    clarity: { type: Number, min: 0, max: 100, default: 0 },
    structure: { type: Number, min: 0, max: 100, default: 0 },
    objectionHandling: { type: Number, min: 0, max: 100, default: 0 },
    closing: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const performanceSchema = new Schema<IPerformance>(
  {
    initialResponse: { type: String, default: '' },
    correctedResponse: { type: String, default: '' },
    finalResponse: { type: String, default: '' },
    score: { type: Number, min: 0, max: 100, default: 0 },
    metrics: { type: performanceMetricsSchema, default: () => ({}) },
  },
  { _id: false }
);

const voiceRecordingSchema = new Schema<IVoiceRecording>(
  {
    url: { type: String, required: true },
    duration: { type: Number, required: true },
  },
  { _id: false }
);

const feedbackSchema = new Schema<IFeedback>(
  {
    aiCoachNotes: { type: String, default: '' },
    managerNotes: { type: String },
  },
  { _id: false }
);

const trainingSessionSchema = new Schema<ITrainingSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true,
    },
    scenarioId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingScenario',
      required: [true, 'Scenario ID is required'],
      index: true,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    sessionDate: {
      type: Date,
      required: [true, 'Session date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
      index: true,
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    conversationLog: [conversationMessageSchema],
    performance: {
      type: performanceSchema,
      default: () => ({}),
    },
    voiceRecording: voiceRecordingSchema,
    feedback: {
      type: feedbackSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
trainingSessionSchema.index({ userId: 1, day: 1 });
trainingSessionSchema.index({ userId: 1, sessionDate: 1 });
trainingSessionSchema.index({ status: 1, sessionDate: 1 });
trainingSessionSchema.index({ groupId: 1, sessionDate: 1 });

// Instance method to start session
trainingSessionSchema.methods.startSession = async function () {
  this.status = SESSION_STATUS.IN_PROGRESS;
  this.startTime = new Date();
  await this.save();
  return this;
};

// Instance method to complete session
trainingSessionSchema.methods.completeSession = async function () {
  this.status = SESSION_STATUS.COMPLETED;
  this.endTime = new Date();
  this.duration = this.calculateDuration();
  await this.save();
  return this;
};

// Instance method to add a message to conversation log
trainingSessionSchema.methods.addMessage = async function (
  role: string,
  message: string,
  metadata?: IMessageMetadata
) {
  this.conversationLog.push({
    _id: new mongoose.Types.ObjectId(),
    role,
    message,
    timestamp: new Date(),
    metadata,
  } as IConversationMessage);
  await this.save();
  return this;
};

// Instance method to calculate session duration
trainingSessionSchema.methods.calculateDuration = function (): number {
  if (!this.startTime || !this.endTime) return 0;
  return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
};

// Instance method to update performance score
trainingSessionSchema.methods.updatePerformanceScore = async function (
  score: number,
  metrics: IPerformanceMetrics
) {
  this.performance.score = score;
  this.performance.metrics = metrics;
  await this.save();
  return this;
};

// Virtual for message count
trainingSessionSchema.virtual('messageCount').get(function () {
  return this.conversationLog.length;
});

// Virtual for formatted duration
trainingSessionSchema.virtual('formattedDuration').get(function () {
  if (!this.duration) return '0m 0s';
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}m ${seconds}s`;
});

const TrainingSession: Model<ITrainingSession> = mongoose.model<ITrainingSession>(
  'TrainingSession',
  trainingSessionSchema
);

export default TrainingSession;
