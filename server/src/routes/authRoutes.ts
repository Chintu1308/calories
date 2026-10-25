import { Router, type Request, type Response } from 'express';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/security.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Registers a new user account with bcrypt password hashing (10 salt rounds).
 * Validates registration schema, prevents duplicate emails, and returns a signed session JWT.
 * Also synchronizes account to Supabase Auth if cloud credentials are provided,
 * and automatically seeds an initial personalized nutrition Goal in MongoDB.
 *
 * @returns HTTP 201 with `{ token, user }`
 * @throws 400 Bad Request if validation fails
 * @throws 409 Conflict if email is already registered
 */
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: validated.email });
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    // 1. Sync to Supabase Auth if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        if (env.SUPABASE_SERVICE_ROLE_KEY) {
          await supabase.auth.admin.createUser({
            email: validated.email,
            password: validated.password,
            email_confirm: true,
            user_metadata: { name: validated.name },
          });
        } else {
          await supabase.auth.signUp({
            email: validated.email,
            password: validated.password,
            options: {
              data: { name: validated.name },
            },
          });
        }
      } catch (supaErr: unknown) {
        console.warn('[Supabase Auth Sync] Notice during user creation:', supaErr);
      }
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await User.create({
      email: validated.email,
      passwordHash,
      name: validated.name,
      heightCm: validated.heightCm,
      currentWeightKg: validated.currentWeightKg,
      targetWeightKg: validated.targetWeightKg,
      targetWeeks: validated.targetWeeks,
      allergies: validated.allergies,
      supplements: validated.supplements,
      primaryGoal: validated.primaryGoal,
    });

    // 2. Automatically compute and persist initial active Goal from biometrics
    try {
      const weightKg = validated.currentWeightKg || 70;
      const heightCm = validated.heightCm || 175;
      const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 28 + 5;
      const tdee = Math.round(bmr * 1.4);

      let calorieTarget = tdee;
      let proteinTarget = Math.round(weightKg * 2.0);
      let fatTarget = Math.round(weightKg * 0.8);

      if (validated.primaryGoal === 'fat_loss') {
        calorieTarget = Math.max(1400, tdee - 500);
        proteinTarget = Math.round(weightKg * 2.2);
      } else if (validated.primaryGoal === 'muscle_gain') {
        calorieTarget = tdee + 350;
        proteinTarget = Math.round(weightKg * 2.2);
        fatTarget = Math.round(weightKg * 0.9);
      } else if (validated.primaryGoal === 'athletic') {
        calorieTarget = tdee + 200;
        proteinTarget = Math.round(weightKg * 1.8);
      }

      const remainingCals = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
      const carbsTarget = Math.max(50, Math.round(remainingCals / 4));

      const goalDate = new Date();
      goalDate.setDate(goalDate.getDate() + (validated.targetWeeks || 8) * 7);

      await Goal.create({
        userId: user._id,
        title: `${(validated.primaryGoal || 'fat_loss').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Target`,
        dailyCaloriesKcal: calorieTarget,
        proteinGrams: proteinTarget,
        carbohydrateGrams: carbsTarget,
        fatGrams: fatTarget,
        targetWeight: validated.targetWeightKg,
        weightUnit: 'kg',
        targetWeeks: validated.targetWeeks || 8,
        targetDate: goalDate.toISOString().split('T')[0],
        isActive: true,
      });
    } catch (goalErr: unknown) {
      console.warn('[Initial Goal Seed] Notice creating initial goal:', goalErr);
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    res.status(201).json({
      token,
      user: user.toJSON(),
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials using constant-time bcrypt verification.
 * Issues a signed HMAC-SHA256 JWT access token upon successful authentication.
 *
 * @returns HTTP 200 with `{ token, user }`
 * @throws 401 Unauthorized on invalid email or password
 */
authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validated.email }).select('+passwordHash');
    if (!user) {
      throw AppError.unauthorized('Invalid email or password credentials');
    }

    const isMatch = await verifyPassword(validated.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password credentials');
    }

    // Sync user to Supabase Auth if not already registered in Supabase
    if (isSupabaseConfigured() && supabase && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabase.auth.admin.createUser({
          email: user.email,
          password: validated.password,
          email_confirm: true,
          user_metadata: { name: user.name },
        });
      } catch {
        // User already in Supabase or harmless notice - ignore
      }
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    res.status(200).json({
      token,
      user: user.toJSON(),
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user profile using token from Authorization header.
 *
 * @returns HTTP 200 with user profile JSON
 * @throws 401 Unauthorized if token is missing, invalid, or expired
 * @throws 404 Not Found if user record no longer exists
 */
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    res.status(200).json({
      user: user.toJSON(),
    });
  })
);

/**
 * PUT /api/v1/auth/profile
 * Updates authenticated user profile details (height, weight, targetWeightKg, targetWeeks,
 * primaryGoal, allergies, supplements) in MongoDB and synchronizes the active Goal.
 *
 * @returns HTTP 200 with `{ user, goal }`
 * @throws 401 Unauthorized if unauthenticated
 * @throws 404 Not Found if user record does not exist
 */
authRouter.put(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const validated = updateProfileSchema.parse(req.body);

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    // 1. Update user fields
    if (validated.name !== undefined) user.name = validated.name;
    if (validated.heightCm !== undefined) user.heightCm = validated.heightCm;
    if (validated.currentWeightKg !== undefined) user.currentWeightKg = validated.currentWeightKg;
    if (validated.targetWeightKg !== undefined) user.targetWeightKg = validated.targetWeightKg;
    if (validated.targetWeeks !== undefined) user.targetWeeks = validated.targetWeeks;
    if (validated.allergies !== undefined) user.allergies = validated.allergies;
    if (validated.supplements !== undefined) user.supplements = validated.supplements as any;
    if (validated.primaryGoal !== undefined) user.primaryGoal = validated.primaryGoal;

    await user.save();

    // 2. Synchronize active Goal in MongoDB
    let activeGoal = await Goal.findOne({ userId: req.user.userId, isActive: true });

    const weightKg = user.currentWeightKg || 70;
    const heightCm = user.heightCm || 175;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 28 + 5;
    const tdee = Math.round(bmr * 1.4);

    let calorieTarget = tdee;
    let proteinTarget = Math.round(weightKg * 2.0);
    let fatTarget = Math.round(weightKg * 0.8);

    if (user.primaryGoal === 'fat_loss') {
      calorieTarget = Math.max(1400, tdee - 500);
      proteinTarget = Math.round(weightKg * 2.2);
    } else if (user.primaryGoal === 'muscle_gain') {
      calorieTarget = tdee + 350;
      proteinTarget = Math.round(weightKg * 2.2);
      fatTarget = Math.round(weightKg * 0.9);
    } else if (user.primaryGoal === 'athletic') {
      calorieTarget = tdee + 200;
      proteinTarget = Math.round(weightKg * 1.8);
    }

    const remainingCals = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbsTarget = Math.max(50, Math.round(remainingCals / 4));

    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + (user.targetWeeks || 8) * 7);

    const goalTitle = `${(user.primaryGoal || 'fat_loss').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Target`;

    if (activeGoal) {
      const shouldRecalculateMacros = validated.primaryGoal !== undefined ||
        validated.currentWeightKg !== undefined ||
        validated.heightCm !== undefined;

      activeGoal.targetWeight = user.targetWeightKg;
      activeGoal.targetWeeks = user.targetWeeks;
      activeGoal.targetDate = goalDate.toISOString().split('T')[0];

      if (shouldRecalculateMacros) {
        activeGoal.dailyCaloriesKcal = calorieTarget;
        activeGoal.proteinGrams = proteinTarget;
        activeGoal.carbohydrateGrams = carbsTarget;
        activeGoal.fatGrams = fatTarget;
        activeGoal.title = goalTitle;
      }

      await activeGoal.save();
    } else {
      activeGoal = await Goal.create({
        userId: user._id,
        title: goalTitle,
        dailyCaloriesKcal: calorieTarget,
        proteinGrams: proteinTarget,
        carbohydrateGrams: carbsTarget,
        fatGrams: fatTarget,
        targetWeight: user.targetWeightKg,
        weightUnit: 'kg',
        targetWeeks: user.targetWeeks || 8,
        targetDate: goalDate.toISOString().split('T')[0],
        isActive: true,
      });
    }

    res.status(200).json({
      message: 'Profile and goals synchronized successfully in MongoDB',
      user: user.toJSON(),
      goal: activeGoal ? activeGoal.toJSON() : null,
    });
  })
);
