import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IGoalDocument extends Document {
  userId: Types.ObjectId | string;
  dailyCaloriesKcal: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  targetWeight?: number;
  weightUnit: 'kg' | 'lbs';
  title?: string;
  targetWeeks?: number;
  targetDate?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    dailyCaloriesKcal: {
      type: Number,
      required: true,
      min: [500, 'Daily calories cannot be below 500 kcal'],
      max: [10000, 'Daily calories cannot exceed 10,000 kcal'],
    },
    proteinGrams: {
      type: Number,
      required: true,
      min: [0, 'Protein cannot be negative'],
      max: [600, 'Protein cannot exceed 600 grams'],
    },
    carbohydrateGrams: {
      type: Number,
      required: true,
      min: [0, 'Carbohydrates cannot be negative'],
      max: [1000, 'Carbohydrates cannot exceed 1,000 grams'],
    },
    fatGrams: {
      type: Number,
      required: true,
      min: [0, 'Fat cannot be negative'],
      max: [500, 'Fat cannot exceed 500 grams'],
    },
    targetWeight: {
      type: Number,
      min: [20, 'Target weight must be at least 20'],
      max: [500, 'Target weight cannot exceed 500'],
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg',
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Goal title cannot exceed 120 characters'],
      default: 'Personal Nutrition Baseline',
    },
    targetWeeks: {
      type: Number,
      min: [1, 'Target timeframe must be at least 1 week'],
      max: [104, 'Target timeframe cannot exceed 104 weeks'],
      default: 8,
    },
    targetDate: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const { __v: _v, ...safe } = ret;
        return safe;
      },
    },
  }
);

// Compound index for fast lookup of a user's active goal
goalSchema.index({ userId: 1, isActive: 1 });

export const Goal: Model<IGoalDocument> =
  mongoose.models.Goal || mongoose.model<IGoalDocument>('Goal', goalSchema);
