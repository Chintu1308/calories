import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type MealType =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snacks'
  | 'Brunch'
  | 'Intermediate';

export type MealSource = 'manual' | 'ai';

export interface IMicronutrientSubdoc {
  name: string;
  amount: number;
  unit: 'g' | 'mg' | 'mcg' | 'IU';
}

export interface IQuantitySubdoc {
  amount: number;
  unit: string;
}

export interface INutritionSubdoc {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface IAiMetadataSubdoc {
  confidence?: number;
  rawExtraction?: Record<string, unknown>;
}

export interface IMealDocument extends Document {
  userId: Types.ObjectId | string;
  foodName: string;
  mealType: MealType;
  eatenAt: Date;
  quantity: IQuantitySubdoc;
  nutrition: INutritionSubdoc;
  micronutrients?: IMicronutrientSubdoc[];
  source: MealSource;
  notes?: string;
  aiMetadata?: IAiMetadataSubdoc;
  createdAt: Date;
  updatedAt: Date;
}

const micronutrientSchema = new Schema<IMicronutrientSubdoc>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ['g', 'mg', 'mcg', 'IU'] },
  },
  { _id: false }
);

const quantitySchema = new Schema<IQuantitySubdoc>(
  {
    amount: { type: Number, required: true, min: [0.01, 'Quantity amount must be positive'] },
    unit: { type: String, required: true, trim: true, default: 'portion' },
  },
  { _id: false }
);

const nutritionSchema = new Schema<INutritionSubdoc>(
  {
    caloriesKcal: { type: Number, required: true, min: 0, max: 10000 },
    proteinG: { type: Number, required: true, min: 0, max: 1000 },
    carbsG: { type: Number, required: true, min: 0, max: 1000 },
    fatG: { type: Number, required: true, min: 0, max: 1000 },
  },
  { _id: false }
);

const mealSchema = new Schema<IMealDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    foodName: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      minlength: [1, 'Food name cannot be empty'],
      maxlength: [120, 'Food name cannot exceed 120 characters'],
    },
    mealType: {
      type: String,
      required: true,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Brunch', 'Intermediate'],
      default: 'Breakfast',
    },
    eatenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    quantity: {
      type: quantitySchema,
      required: true,
    },
    nutrition: {
      type: nutritionSchema,
      required: true,
    },
    micronutrients: {
      type: [micronutrientSchema],
      default: undefined, // Omitted when unknown; never default to empty array with zeroes
    },
    source: {
      type: String,
      required: true,
      enum: ['manual', 'ai'],
      default: 'manual',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    aiMetadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { __v: _v, ...safe } = ret;
        return {
          ...safe,
          id: ret._id ? ret._id.toString() : '',
        };
      },
    },
  }
);

// Indexes specified in docs/DATA_MODEL.md
mealSchema.index({ userId: 1, eatenAt: -1 });
mealSchema.index({ userId: 1, mealType: 1, eatenAt: -1 });

export const Meal: Model<IMealDocument> =
  mongoose.models.Meal || mongoose.model<IMealDocument>('Meal', mealSchema);
