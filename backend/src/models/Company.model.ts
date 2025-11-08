import mongoose, { Document, Schema, Model } from 'mongoose';
import { SUBSCRIPTION_PLANS, TRAINING_DURATION_DAYS, DEFAULT_SESSION_DURATION_MINUTES } from '../config/constants';

export interface ICompany extends Document {
  name: string;
  domain?: string;
  logo?: string;
  settings: {
    maxUsers: number;
    trainingDuration: number;
    sessionDuration: number;
  };
  subscription: {
    plan: 'trial' | 'basic' | 'premium' | 'enterprise';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isSubscriptionActive(): boolean;
  daysUntilExpiry(): number;
}

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    settings: {
      maxUsers: {
        type: Number,
        default: 50,
        min: [1, 'Max users must be at least 1'],
      },
      trainingDuration: {
        type: Number,
        default: TRAINING_DURATION_DAYS,
        min: [1, 'Training duration must be at least 1 day'],
      },
      sessionDuration: {
        type: Number,
        default: DEFAULT_SESSION_DURATION_MINUTES,
        min: [1, 'Session duration must be at least 1 minute'],
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLANS),
        default: SUBSCRIPTION_PLANS.TRIAL,
        required: true,
      },
      startDate: {
        type: Date,
        default: Date.now,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
companySchema.index({ 'subscription.isActive': 1 });
companySchema.index({ 'subscription.endDate': 1 });

// Instance method to check if subscription is active
companySchema.methods.isSubscriptionActive = function (): boolean {
  return this.subscription.isActive && new Date() <= this.subscription.endDate;
};

// Instance method to get days until subscription expiry
companySchema.methods.daysUntilExpiry = function (): number {
  const now = new Date();
  const expiry = new Date(this.subscription.endDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Virtual for active users count
companySchema.virtual('usersCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'companyId',
  count: true,
});

const Company: Model<ICompany> = mongoose.model<ICompany>('Company', companySchema);

export default Company;
