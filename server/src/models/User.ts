import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISupplementSubdoc {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  notes?: string;
}

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  targetWeeks: number;
  allergies: string[];
  supplements: ISupplementSubdoc[];
  primaryGoal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'athletic';
  createdAt: Date;
  updatedAt: Date;
}

const supplementSchema = new Schema<ISupplementSubdoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    timing: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password hash in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    heightCm: {
      type: Number,
      required: true,
      min: 50,
      max: 300,
    },
    currentWeightKg: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    targetWeightKg: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    targetWeeks: {
      type: Number,
      default: 8,
      min: 1,
      max: 104,
    },
    allergies: {
      type: [String],
      default: [],
    },
    supplements: {
      type: [supplementSchema],
      default: [],
    },
    primaryGoal: {
      type: String,
      enum: ['fat_loss', 'muscle_gain', 'maintenance', 'athletic'],
      default: 'fat_loss',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Strip private fields from JSON serializations
        const { passwordHash: _pwd, __v: _v, ...safe } = ret;
        return safe;
      },
    },
  }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);
