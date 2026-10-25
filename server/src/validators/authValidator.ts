import { z } from 'zod';

const supplementInputSchema = z.object({
  id: z.string().default(() => `supp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
  name: z.string().min(1, 'Supplement name is required').trim(),
  dosage: z.string().min(1, 'Dosage is required').trim(),
  timing: z.string().min(1, 'Timing is required').trim(),
  notes: z.string().trim().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Full name is required').trim(),
  heightCm: z.coerce.number().min(50, 'Height must be at least 50 cm').max(300, 'Height must be under 300 cm'),
  currentWeightKg: z.coerce.number().min(20, 'Current weight must be at least 20 kg').max(500, 'Current weight must be under 500 kg'),
  targetWeightKg: z.coerce.number().min(20, 'Target weight must be at least 20 kg').max(500, 'Target weight must be under 500 kg'),
  targetWeeks: z.coerce.number().min(1).max(104).default(8),
  allergies: z.array(z.string().trim()).default([]),
  supplements: z.array(supplementInputSchema).default([]),
  primaryGoal: z.enum(['fat_loss', 'muscle_gain', 'maintenance', 'athletic']).default('fat_loss'),
  termsAccepted: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Full name cannot be empty').trim().optional(),
  heightCm: z.coerce.number().min(50).max(300).optional(),
  currentWeightKg: z.coerce.number().min(20).max(500).optional(),
  targetWeightKg: z.coerce.number().min(20).max(500).optional(),
  targetWeeks: z.coerce.number().min(1).max(104).optional(),
  allergies: z.array(z.string().trim()).optional(),
  supplements: z.array(supplementInputSchema).optional(),
  primaryGoal: z.enum(['fat_loss', 'muscle_gain', 'maintenance', 'athletic']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
