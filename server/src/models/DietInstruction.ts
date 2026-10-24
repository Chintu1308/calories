import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IDietInstructionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  summary: string;
  dietaryRules: string[];
  forbiddenFoods: string[];
  recommendedFoods: string[];
  targetCaloriesKcal?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  mealTimingNotes: string[];
  clinicalObservations?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dietInstructionSchema = new Schema<IDietInstructionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    dietaryRules: {
      type: [String],
      default: [],
    },
    forbiddenFoods: {
      type: [String],
      default: [],
    },
    recommendedFoods: {
      type: [String],
      default: [],
    },
    targetCaloriesKcal: {
      type: Number,
      min: 500,
      max: 10000,
    },
    targetProteinGrams: {
      type: Number,
      min: 10,
      max: 1000,
    },
    targetCarbsGrams: {
      type: Number,
      min: 0,
      max: 1500,
    },
    targetFatGrams: {
      type: Number,
      min: 0,
      max: 500,
    },
    mealTimingNotes: {
      type: [String],
      default: [],
    },
    clinicalObservations: {
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

dietInstructionSchema.index({ userId: 1, isActive: 1, createdAt: -1 });

export const DietInstruction: Model<IDietInstructionDocument> =
  mongoose.models.DietInstruction ||
  mongoose.model<IDietInstructionDocument>('DietInstruction', dietInstructionSchema);
