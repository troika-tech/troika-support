import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  teamId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  sessionTime: string;
  schedule: {
    days: number[];
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getMemberCount(): number;
  addMember(userId: mongoose.Types.ObjectId): Promise<IGroup>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<IGroup>;
  isSessionDay(date: Date): boolean;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sessionTime: {
      type: String,
      required: [true, 'Session time is required'],
      match: [/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format. Use format: "11:00 AM"'],
    },
    schedule: {
      days: {
        type: [Number],
        required: true,
        validate: {
          validator: function (days: number[]) {
            return days.length > 0 && days.every((day) => day >= 0 && day <= 6);
          },
          message: 'Days must be between 0 (Sunday) and 6 (Saturday)',
        },
      },
      timezone: {
        type: String,
        required: true,
        default: 'Asia/Kolkata',
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
groupSchema.index({ teamId: 1, name: 1 });

// Validation: members should not exceed 5
groupSchema.path('members').validate(function (members: mongoose.Types.ObjectId[]) {
  return members.length <= 5;
}, 'A group can have a maximum of 5 members');

// Virtual for member count
groupSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Instance method to get member count
groupSchema.methods.getMemberCount = function (): number {
  return this.members.length;
};

// Instance method to add a member (max 5)
groupSchema.methods.addMember = async function (
  userId: mongoose.Types.ObjectId
) {
  if (this.members.length >= 5) {
    throw new Error('Group is full. Maximum 5 members allowed.');
  }

  if (!this.members.includes(userId)) {
    this.members.push(userId);
    await this.save();
  }
  return this;
};

// Instance method to remove a member
groupSchema.methods.removeMember = async function (
  userId: mongoose.Types.ObjectId
) {
  this.members = this.members.filter(
    (memberId: mongoose.Types.ObjectId) => memberId.toString() !== userId.toString()
  );
  await this.save();
  return this;
};

// Instance method to check if today is a session day
groupSchema.methods.isSessionDay = function (date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  return this.schedule.days.includes(dayOfWeek);
};

const Group: Model<IGroup> = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
