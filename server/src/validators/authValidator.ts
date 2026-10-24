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
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
