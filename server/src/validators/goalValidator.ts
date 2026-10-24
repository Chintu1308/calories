import { z } from 'zod';

export const goalInputSchema = z.object({
  dailyCaloriesKcal: z.coerce
    .number()
    .int('Daily calories must be an integer')
    .min(500, 'Daily calories cannot be below 500 kcal')
    .max(10000, 'Daily calories cannot exceed 10,000 kcal'),

  proteinGrams: z.coerce
    .number()
    .min(0, 'Protein cannot be negative')
    .max(600, 'Protein target cannot exceed 600 grams'),

  carbohydrateGrams: z.coerce
    .number()
    .min(0, 'Carbohydrates cannot be negative')
    .max(1000, 'Carbohydrates target cannot exceed 1,000 grams'),

  fatGrams: z.coerce
    .number()
    .min(0, 'Fat cannot be negative')
    .max(500, 'Fat target cannot exceed 500 grams'),

  targetWeight: z.coerce
    .number()
    .min(20, 'Target weight must be at least 20')
    .max(500, 'Target weight cannot exceed 500')
    .optional(),

  weightUnit: z.enum(['kg', 'lbs']).default('kg').optional(),

  title: z
    .string()
    .trim()
    .max(120, 'Goal title cannot exceed 120 characters')
    .optional(),

  targetWeeks: z.coerce
    .number()
    .int('Target weeks must be an integer')
    .min(1, 'Target weeks must be at least 1')
    .max(104, 'Target weeks cannot exceed 104')
    .optional(),

  targetDate: z.string().trim().optional(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
