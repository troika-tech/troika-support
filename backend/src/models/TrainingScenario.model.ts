import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IScenario {
  scenarioId: string;
  title: string;
  customerMessage: string;
  idealResponse: string;
  coachingNotes: string[];
  toneGuidelines: string[];
  commonMistakes: string[];
}

export interface IVoiceDrill {
  text: string;
  instructions: string;
}

export interface ITrainingScenario extends Document {
  day: number;
  theme: string;
  description: string;
  category: 'objection_handling' | 'closing' | 'follow_up' | 'intro' | 'pricing';
  scenarios: IScenario[];
  voiceDrill?: IVoiceDrill;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getScenarioById(scenarioId: string): IScenario | undefined;
  getScenarioCount(): number;
}

const scenarioSubSchema = new Schema<IScenario>(
  {
    scenarioId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    customerMessage: {
      type: String,
      required: true,
    },
    idealResponse: {
      type: String,
      required: true,
    },
    coachingNotes: [
      {
        type: String,
        trim: true,
      },
    ],
    toneGuidelines: [
      {
        type: String,
        trim: true,
      },
    ],
    commonMistakes: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const voiceDrillSchema = new Schema<IVoiceDrill>(
  {
    text: {
      type: String,
      required: true,
    },
    instructions: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const trainingScenarioSchema = new Schema<ITrainingScenario>(
  {
    day: {
      type: Number,
      required: [true, 'Day is required'],
      min: [1, 'Day must be between 1 and 10'],
      max: [10, 'Day must be between 1 and 10'],
    },
    theme: {
      type: String,
      required: [true, 'Theme is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['objection_handling', 'closing', 'follow_up', 'intro', 'pricing'],
      required: [true, 'Category is required'],
      index: true,
    },
    scenarios: {
      type: [scenarioSubSchema],
      required: true,
      validate: {
        validator: function (scenarios: IScenario[]) {
          return scenarios.length > 0;
        },
        message: 'At least one scenario is required',
      },
    },
    voiceDrill: {
      type: voiceDrillSchema,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
trainingScenarioSchema.index({ category: 1, isActive: 1 });

// Unique compound index: only one active scenario per day
trainingScenarioSchema.index({ day: 1, isActive: 1 }, { unique: true, sparse: true });

// Virtual for scenario count
trainingScenarioSchema.virtual('scenarioCount').get(function () {
  return this.scenarios.length;
});

// Instance method to get a specific scenario by ID
trainingScenarioSchema.methods.getScenarioById = function (
  scenarioId: string
): IScenario | undefined {
  return this.scenarios.find((s: IScenario) => s.scenarioId === scenarioId);
};

// Instance method to get scenario count
trainingScenarioSchema.methods.getScenarioCount = function (): number {
  return this.scenarios.length;
};

// Static method to get scenarios by day
trainingScenarioSchema.statics.getByDay = function (day: number) {
  return this.findOne({ day, isActive: true });
};

// Static method to get all active scenarios
trainingScenarioSchema.statics.getAllActive = function () {
  return this.find({ isActive: true }).sort({ day: 1 });
};

const TrainingScenario: Model<ITrainingScenario> = mongoose.model<ITrainingScenario>(
  'TrainingScenario',
  trainingScenarioSchema
);

export default TrainingScenario;
