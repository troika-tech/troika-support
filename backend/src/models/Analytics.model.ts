import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IImprovement {
  confidence: number;
  clarity: number;
  closing: number;
}

export interface IScenarioPerformance {
  scenarioId: mongoose.Types.ObjectId;
  attempts: number;
  avgScore: number;
}

export interface IMetrics {
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  avgSessionDuration: number;
  avgScore: number;
  improvement: IImprovement;
  scenarioPerformance: IScenarioPerformance[];
}

export interface IProgressByDay {
  day: number;
  completionRate: number;
  avgScore: number;
}

export interface IAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: IMetrics;
  progressByDay: IProgressByDay[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateCompletionRate(): number;
  getAverageScore(): number;
  getBestPerformingDay(): IProgressByDay | undefined;
  getWorstPerformingDay(): IProgressByDay | undefined;
}

const improvementSchema = new Schema<IImprovement>(
  {
    confidence: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    closing: { type: Number, default: 0 },
  },
  { _id: false }
);

const scenarioPerformanceSchema = new Schema<IScenarioPerformance>(
  {
    scenarioId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingScenario',
      required: true,
    },
    attempts: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const metricsSchema = new Schema<IMetrics>(
  {
    totalSessions: { type: Number, default: 0 },
    completedSessions: { type: Number, default: 0 },
    missedSessions: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    improvement: { type: improvementSchema, default: () => ({}) },
    scenarioPerformance: [scenarioPerformanceSchema],
  },
  { _id: false }
);

const progressByDaySchema = new Schema<IProgressByDay>(
  {
    day: { type: Number, required: true, min: 1, max: 10 },
    completionRate: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const analyticsSchema = new Schema<IAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    progressByDay: [progressByDaySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index for user and period
analyticsSchema.index(
  { userId: 1, 'period.startDate': 1, 'period.endDate': 1 },
  { unique: true }
);

// Virtual for total days
analyticsSchema.virtual('totalDays').get(function () {
  return this.progressByDay.length;
});

// Virtual for completion percentage
analyticsSchema.virtual('completionPercentage').get(function () {
  return this.calculateCompletionRate();
});

// Instance method to calculate overall completion rate
analyticsSchema.methods.calculateCompletionRate = function (): number {
  if (this.metrics.totalSessions === 0) return 0;
  return Math.round((this.metrics.completedSessions / this.metrics.totalSessions) * 100);
};

// Instance method to get average score
analyticsSchema.methods.getAverageScore = function (): number {
  return Math.round(this.metrics.avgScore);
};

// Instance method to get best performing day
analyticsSchema.methods.getBestPerformingDay = function (): IProgressByDay | undefined {
  if (this.progressByDay.length === 0) return undefined;
  return this.progressByDay.reduce((best: IProgressByDay, current: IProgressByDay) =>
    current.avgScore > best.avgScore ? current : best
  );
};

// Instance method to get worst performing day
analyticsSchema.methods.getWorstPerformingDay = function (): IProgressByDay | undefined {
  if (this.progressByDay.length === 0) return undefined;
  return this.progressByDay.reduce((worst: IProgressByDay, current: IProgressByDay) =>
    current.avgScore < worst.avgScore ? current : worst
  );
};

// Static method to get analytics by user and date range
analyticsSchema.statics.getByUserAndPeriod = function (
  userId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  return this.findOne({
    userId,
    'period.startDate': { $lte: startDate },
    'period.endDate': { $gte: endDate },
  });
};

const Analytics: Model<IAnalytics> = mongoose.model<IAnalytics>('Analytics', analyticsSchema);

export default Analytics;
