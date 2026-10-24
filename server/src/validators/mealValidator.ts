import { z } from 'zod';

const micronutrientInputSchema = z.object({
  name: z.string().min(1, 'Micronutrient name is required').trim(),
  amount: z.coerce.number().min(0, 'Micronutrient amount cannot be negative'),
  unit: z.enum(['g', 'mg', 'mcg', 'IU']),
});

const quantityInputSchema = z.object({
  amount: z.coerce.number().positive('Quantity amount must be greater than zero'),
  unit: z.string().min(1, 'Quantity unit is required').trim().default('portion'),
});

const nutritionInputSchema = z.object({
  caloriesKcal: z.coerce
    .number()
    .min(0, 'Calories cannot be negative')
    .max(10000, 'Calories cannot exceed 10,000 kcal'),
  proteinG: z.coerce
    .number()
    .min(0, 'Protein cannot be negative')
    .max(1000, 'Protein cannot exceed 1,000 grams'),
  carbsG: z.coerce
    .number()
    .min(0, 'Carbohydrates cannot be negative')
    .max(1000, 'Carbohydrates cannot exceed 1,000 grams'),
  fatG: z.coerce
    .number()
    .min(0, 'Fat cannot be negative')
    .max(1000, 'Fat cannot exceed 1,000 grams'),
});

export const createMealSchema = z.object({
  foodName: z
    .string()
    .min(1, 'Food name is required')
    .max(120, 'Food name cannot exceed 120 characters')
    .trim(),
  mealType: z.enum([
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snacks',
    'Brunch',
    'Intermediate',
  ]),
  eatenAt: z.coerce.date().default(() => new Date()),
  quantity: quantityInputSchema,
  nutrition: nutritionInputSchema,
  micronutrients: z.array(micronutrientInputSchema).optional(),
  source: z.enum(['manual', 'ai']).default('manual'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').trim().optional(),
  aiMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMealSchema = createMealSchema.partial();

export const mealQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  mealType: z
    .enum(['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Brunch', 'Intermediate'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type MealQueryParams = z.infer<typeof mealQuerySchema>;
