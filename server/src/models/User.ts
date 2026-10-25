import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISupplementSubdoc {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  notes?: string;
}

export interface IUserDocument extends Document {
  supabaseId?: string;
  email: string;
  passwordHash?: string;
  name: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  targetWeeks: number;
  allergies: string[];
  supplements: ISupplementSubdoc[];
  primaryGoal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'athletic';
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
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
    supabaseId: {
      type: String,
      sparse: true,
      index: true,
    },
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
      required: false, // Optional when Supabase Auth manages credentials
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
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
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

/**
 * Finds user profile in MongoDB by Supabase UUID string, MongoDB ObjectId, or email.
 */
export async function findUserByAuthId(userId: string, email?: string): Promise<IUserDocument | null> {
  let user = await User.findOne({ supabaseId: userId });
  if (user) return user;

  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId);
    if (user) return user;
  }

  if (email) {
    user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      if (!user.supabaseId && userId) {
        user.supabaseId = userId;
        await user.save();
      }
      return user;
    }
  }

  return null;
}
