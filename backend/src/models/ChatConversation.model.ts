import mongoose, { Document, Schema, Model } from 'mongoose';
import { CHAT_STEPS, CHAT_ROLES } from '../config/constants';

export interface IChatMessage {
  _id: mongoose.Types.ObjectId;
  role: 'customer' | 'salesperson' | 'coach';
  content: string;
  timestamp: Date;
  isTyping: boolean;
}

export interface IAIContext {
  conversationHistory: string;
  currentScenario: string;
  userTone: string;
  corrections: string[];
}

export interface IChatConversation extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  currentStep: 'customer_objection' | 'salesperson_response' | 'coach_correction' | 'salesperson_repeat' | 'completed';
  messages: IChatMessage[];
  aiContext: IAIContext;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addMessage(role: string, content: string): Promise<IChatConversation>;
  updateStep(step: string): Promise<IChatConversation>;
  closeConversation(): Promise<IChatConversation>;
  getLastMessage(): IChatMessage | undefined;
  getMessagesByRole(role: string): IChatMessage[];
}

const chatMessageSchema = new Schema<IChatMessage>({
  role: {
    type: String,
    enum: Object.values(CHAT_ROLES),
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isTyping: {
    type: Boolean,
    default: false,
  },
});

const aiContextSchema = new Schema<IAIContext>(
  {
    conversationHistory: {
      type: String,
      default: '',
    },
    currentScenario: {
      type: String,
      default: '',
    },
    userTone: {
      type: String,
      default: '',
    },
    corrections: [String],
  },
  { _id: false }
);

const chatConversationSchema = new Schema<IChatConversation>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingSession',
      required: [true, 'Session ID is required'],
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentStep: {
      type: String,
      enum: Object.values(CHAT_STEPS),
      default: CHAT_STEPS.CUSTOMER_OBJECTION,
    },
    messages: [chatMessageSchema],
    aiContext: {
      type: aiContextSchema,
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
chatConversationSchema.index({ sessionId: 1, isActive: 1 });
chatConversationSchema.index({ userId: 1, isActive: 1 });

// Virtual for message count
chatConversationSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

// Instance method to add a message
chatConversationSchema.methods.addMessage = async function (
  role: string,
  content: string
) {
  this.messages.push({
    _id: new mongoose.Types.ObjectId(),
    role,
    content,
    timestamp: new Date(),
    isTyping: false,
  } as IChatMessage);
  await this.save();
  return this;
};

// Instance method to update current step
chatConversationSchema.methods.updateStep = async function (
  step: string
) {
  this.currentStep = step as any;
  await this.save();
  return this;
};

// Instance method to close conversation
chatConversationSchema.methods.closeConversation = async function () {
  this.isActive = false;
  this.currentStep = CHAT_STEPS.COMPLETED;
  await this.save();
  return this;
};

// Instance method to get last message
chatConversationSchema.methods.getLastMessage = function (): IChatMessage | undefined {
  return this.messages[this.messages.length - 1];
};

// Instance method to get messages by role
chatConversationSchema.methods.getMessagesByRole = function (role: string): IChatMessage[] {
  return this.messages.filter((msg: IChatMessage) => msg.role === role);
};

// Static method to get active conversation by session ID
chatConversationSchema.statics.getActiveBySession = function (sessionId: mongoose.Types.ObjectId) {
  return this.findOne({ sessionId, isActive: true });
};

// Static method to get active conversations by user
chatConversationSchema.statics.getActiveByUser = function (userId: mongoose.Types.ObjectId) {
  return this.find({ userId, isActive: true }).sort({ updatedAt: -1 });
};

const ChatConversation: Model<IChatConversation> = mongoose.model<IChatConversation>(
  'ChatConversation',
  chatConversationSchema
);

export default ChatConversation;
