import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IGuidelineItem {
  text: string;
  explanation?: string;
  examples?: string[];
}

export interface IToneGuidelines extends Document {
  category: 'phrases_to_use' | 'phrases_to_avoid' | 'tone_rules';
  items: IGuidelineItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getItemCount(): number;
  addItem(item: IGuidelineItem): Promise<IToneGuidelines>;
  removeItem(text: string): Promise<IToneGuidelines>;
}

const guidelineItemSchema = new Schema<IGuidelineItem>(
  {
    text: {
      type: String,
      required: [true, 'Guideline text is required'],
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
    examples: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const toneGuidelinesSchema = new Schema<IToneGuidelines>(
  {
    category: {
      type: String,
      enum: ['phrases_to_use', 'phrases_to_avoid', 'tone_rules'],
      required: [true, 'Category is required'],
      index: true,
    },
    items: {
      type: [guidelineItemSchema],
      required: true,
      validate: {
        validator: function (items: IGuidelineItem[]) {
          return items.length > 0;
        },
        message: 'At least one guideline item is required',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
toneGuidelinesSchema.index({ category: 1, isActive: 1 });

// Virtual for item count
toneGuidelinesSchema.virtual('itemCount').get(function () {
  return this.items.length;
});

// Instance method to get item count
toneGuidelinesSchema.methods.getItemCount = function (): number {
  return this.items.length;
};

// Instance method to add an item
toneGuidelinesSchema.methods.addItem = async function (
  item: IGuidelineItem
) {
  // Check if item already exists
  const exists = this.items.some((i: IGuidelineItem) => i.text === item.text);
  if (!exists) {
    this.items.push(item);
    await this.save();
  }
  return this;
};

// Instance method to remove an item
toneGuidelinesSchema.methods.removeItem = async function (text: string) {
  this.items = this.items.filter((item: IGuidelineItem) => item.text !== text);
  await this.save();
  return this;
};

// Static method to get guidelines by category
toneGuidelinesSchema.statics.getByCategory = function (category: string) {
  return this.findOne({ category, isActive: true });
};

// Static method to get all active guidelines
toneGuidelinesSchema.statics.getAllActive = function () {
  return this.find({ isActive: true });
};

// Static method to get phrases to use
toneGuidelinesSchema.statics.getPhrasesToUse = function () {
  return this.findOne({ category: 'phrases_to_use', isActive: true });
};

// Static method to get phrases to avoid
toneGuidelinesSchema.statics.getPhrasesToAvoid = function () {
  return this.findOne({ category: 'phrases_to_avoid', isActive: true });
};

// Static method to get tone rules
toneGuidelinesSchema.statics.getToneRules = function () {
  return this.findOne({ category: 'tone_rules', isActive: true });
};

const ToneGuidelines: Model<IToneGuidelines> = mongoose.model<IToneGuidelines>(
  'ToneGuidelines',
  toneGuidelinesSchema
);

export default ToneGuidelines;
