import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  managerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getMemberCount(): number;
  addMember(userId: mongoose.Types.ObjectId): Promise<ITeam>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<ITeam>;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager ID is required'],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ managerId: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Instance method to get member count
teamSchema.methods.getMemberCount = function (): number {
  return this.members.length;
};

// Instance method to add a member
teamSchema.methods.addMember = async function (
  userId: mongoose.Types.ObjectId
) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    await this.save();
  }
  return this;
};

// Instance method to remove a member
teamSchema.methods.removeMember = async function (
  userId: mongoose.Types.ObjectId
) {
  this.members = this.members.filter(
    (memberId: mongoose.Types.ObjectId) => memberId.toString() !== userId.toString()
  );
  await this.save();
  return this;
};

// Pre-save validation: manager should not be in members array
teamSchema.pre('save', function (next) {
  const managerInMembers = this.members.some(
    (memberId) => memberId.toString() === this.managerId.toString()
  );

  if (managerInMembers) {
    this.members = this.members.filter(
      (memberId) => memberId.toString() !== this.managerId.toString()
    );
  }

  next();
});

const Team: Model<ITeam> = mongoose.model<ITeam>('Team', teamSchema);

export default Team;
