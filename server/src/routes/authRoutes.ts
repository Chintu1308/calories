import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { User, type IUserDocument } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseUserById,
  updateSupabaseUserTerms,
} from '../config/supabase.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/security.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

/**
 * Finds user document in MongoDB by Supabase ID, MongoDB ObjectId, or email.
 */
async function findUserByAuthId(userId: string, email?: string): Promise<IUserDocument | null> {
  // 1. Query by supabaseId
  let user = await User.findOne({ supabaseId: userId });
  if (user) return user;

  // 2. Query by MongoDB _id if it's a valid 24-hex ObjectId
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId);
    if (user) return user;
  }

  // 3. Fallback to email mapping
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

/**
 * POST /api/v1/auth/register
 * Registers user with Supabase Auth as the primary identity provider,
 * and maps physical biometrics / dietary preferences in MongoDB under the Supabase ID.
 * If termsAccepted is provided, persists status and timestamp directly in Supabase user_metadata.
 */
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = registerSchema.parse(req.body);
    const nowIso = new Date().toISOString();

    let supabaseUserId: string | null = null;
    let termsAccepted = !!validated.termsAccepted;
    let termsAcceptedAt: string | undefined = termsAccepted ? nowIso : undefined;

    // 1. Create or sync to Supabase Auth if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        if (env.SUPABASE_SERVICE_ROLE_KEY) {
          const { data: supaCreate, error: supaErr } = await supabase.auth.admin.createUser({
            email: validated.email,
            password: validated.password,
            email_confirm: true,
            user_metadata: {
              name: validated.name,
              termsAccepted,
              termsAcceptedAt,
            },
          });

          if (supaErr) {
            // If already registered in Supabase, sign in to retrieve ID
            const { data: supaLogin } = await supabase.auth.signInWithPassword({
              email: validated.email,
              password: validated.password,
            });
            if (supaLogin?.user) {
              supabaseUserId = supaLogin.user.id;
            } else {
              throw AppError.conflict(supaErr.message || 'An account with this email already exists in Supabase');
            }
          } else if (supaCreate.user) {
            supabaseUserId = supaCreate.user.id;
          }
        } else {
          const { data: supaSign, error: signErr } = await supabase.auth.signUp({
            email: validated.email,
            password: validated.password,
            options: {
              data: {
                name: validated.name,
                termsAccepted,
                termsAcceptedAt,
              },
            },
          });
          if (signErr) {
            throw AppError.conflict(signErr.message || 'Registration error');
          }
          if (supaSign.user) {
            supabaseUserId = supaSign.user.id;
          }
        }
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        console.warn('[Supabase Auth Register] Notice during user creation:', err);
      }
    }

    // Check existing MongoDB profile
    const existing = await User.findOne({ email: validated.email });
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    // Only hash password if running in offline mode without Supabase
    const passwordHash = !isSupabaseConfigured() ? await hashPassword(validated.password) : undefined;

    const user = await User.create({
      supabaseId: supabaseUserId || undefined,
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
      termsAccepted,
      termsAcceptedAt: termsAccepted ? new Date(nowIso) : undefined,
    });

    const effectiveUserId = supabaseUserId || user._id.toString();

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
        userId: effectiveUserId,
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
      userId: effectiveUserId,
      email: user.email,
    });

    const userObj: any = user.toJSON();
    userObj._id = effectiveUserId;
    (userObj as any).id = effectiveUserId;
    (userObj as any).termsAccepted = termsAccepted;
    (userObj as any).termsAcceptedAt = termsAcceptedAt;

    res.status(201).json({
      token,
      user: userObj,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials via Supabase Auth when configured,
 * retrieves user details and terms status from Supabase, and maps to MongoDB biometrics.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = loginSchema.parse(req.body);

    let supabaseUserId: string | null = null;
    let supabaseUserMeta: any = null;

    // 1. Authenticate via Supabase Auth if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: supaAuth, error: supaErr } = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });

        if (supaErr) {
          throw AppError.unauthorized('Invalid email or password credentials');
        }

        if (supaAuth?.user) {
          supabaseUserId = supaAuth.user.id;
          supabaseUserMeta = supaAuth.user.user_metadata || {};
        }
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        console.warn('[Supabase Login] Notice during authentication:', err);
      }
    }

    // 2. Lookup or create corresponding profile in MongoDB
    let user = await User.findOne({
      $or: [
        ...(supabaseUserId ? [{ supabaseId: supabaseUserId }] : []),
        { email: validated.email },
      ],
    }).select('+passwordHash');

    // If offline mode without Supabase, verify password hash in MongoDB
    if (!supabaseUserId) {
      if (!user || !user.passwordHash) {
        throw AppError.unauthorized('Invalid email or password credentials');
      }
      const isMatch = await verifyPassword(validated.password, user.passwordHash);
      if (!isMatch) {
        throw AppError.unauthorized('Invalid email or password credentials');
      }
    } else if (!user) {
      // User authenticated in Supabase but no biometric profile exists yet in MongoDB: create baseline
      user = await User.create({
        supabaseId: supabaseUserId || undefined,
        email: validated.email,
        name: supabaseUserMeta?.name || validated.email.split('@')[0],
        heightCm: 175,
        currentWeightKg: 75,
        targetWeightKg: 70,
        targetWeeks: 8,
        allergies: [],
        supplements: [],
        primaryGoal: 'fat_loss',
        termsAccepted: !!supabaseUserMeta?.termsAccepted,
        termsAcceptedAt: supabaseUserMeta?.termsAcceptedAt ? new Date(supabaseUserMeta.termsAcceptedAt) : undefined,
      });
    } else if (supabaseUserId && !user.supabaseId) {
      user.supabaseId = supabaseUserId;
      await user.save();
    }

    const effectiveUserId = supabaseUserId || user!._id.toString();

    const termsAccepted = supabaseUserMeta?.termsAccepted ?? user?.termsAccepted ?? false;
    const termsAcceptedAt = supabaseUserMeta?.termsAcceptedAt || user?.termsAcceptedAt?.toISOString() || null;

    const token = generateToken({
      userId: effectiveUserId,
      email: validated.email,
    });

    const userObj: any = user!.toJSON();
    userObj._id = effectiveUserId;
    (userObj as any).id = effectiveUserId;
    (userObj as any).name = supabaseUserMeta?.name || userObj.name;
    (userObj as any).termsAccepted = termsAccepted;
    (userObj as any).termsAcceptedAt = termsAcceptedAt;

    res.status(200).json({
      token,
      user: userObj,
    });
  })
);

/**
 * POST /api/v1/auth/accept-terms
 * Records acceptance of Terms & Conditions and Privacy Policy.
 * Stores acceptance status and exact date/time in Supabase Auth user_metadata,
 * and updates the mapped profile in MongoDB.
 */
authRouter.post(
  '/accept-terms',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const nowIso = new Date().toISOString();
    let supabaseSuccess = false;

    // 1. Update status and timestamp in Supabase Auth user_metadata
    if (isSupabaseConfigured()) {
      supabaseSuccess = await updateSupabaseUserTerms(req.user.userId, true, nowIso);
    }

    // 2. Synchronize mapped MongoDB profile
    const user = await findUserByAuthId(req.user.userId, req.user.email);
    if (user) {
      user.termsAccepted = true;
      user.termsAcceptedAt = new Date(nowIso);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Terms & Conditions and Privacy Policy accepted successfully',
      termsAccepted: true,
      termsAcceptedAt: nowIso,
      storedInSupabase: supabaseSuccess,
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user profile.
 * Reads master identity details and terms acceptance from Supabase Auth,
 * and merges with physical biometrics stored in MongoDB.
 */
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    let supaUser = null;
    if (isSupabaseConfigured()) {
      supaUser = await getSupabaseUserById(req.user.userId);
    }

    let user = await findUserByAuthId(req.user.userId, req.user.email);

    // If user exists in Supabase but not yet in MongoDB, create baseline profile mapped to Supabase ID
    if (!user) {
      user = await User.create({
        supabaseId: req.user.userId,
        email: req.user.email || supaUser?.email || 'user@calories.app',
        name: supaUser?.user_metadata?.name || 'Calories User',
        heightCm: 175,
        currentWeightKg: 75,
        targetWeightKg: 70,
        targetWeeks: 8,
        allergies: [],
        supplements: [],
        primaryGoal: 'fat_loss',
        termsAccepted: !!supaUser?.user_metadata?.termsAccepted,
        termsAcceptedAt: supaUser?.user_metadata?.termsAcceptedAt ? new Date(supaUser.user_metadata.termsAcceptedAt) : undefined,
      });
    }

    const userObj: any = user.toJSON();
    userObj._id = req.user.userId;
    (userObj as any).id = req.user.userId;

    if (supaUser) {
      userObj.email = supaUser.email || userObj.email;
      if (supaUser.user_metadata?.name) {
        userObj.name = supaUser.user_metadata.name;
      }
      (userObj as any).termsAccepted = !!supaUser.user_metadata?.termsAccepted;
      (userObj as any).termsAcceptedAt = supaUser.user_metadata?.termsAcceptedAt || null;
    }

    res.status(200).json({
      user: userObj,
    });
  })
);

/**
 * PUT /api/v1/auth/profile
 * Updates authenticated user profile biometrics in MongoDB.
 * If name changes, updates Supabase Auth user_metadata as well.
 */
authRouter.put(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const validated = updateProfileSchema.parse(req.body);

    let user = await findUserByAuthId(req.user.userId, req.user.email);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    // 1. If name changed, synchronize to Supabase
    if (validated.name && isSupabaseConfigured() && supabase && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supaUser = await getSupabaseUserById(req.user.userId);
        const existingMeta = supaUser?.user_metadata || {};
        await supabase.auth.admin.updateUserById(req.user.userId, {
          user_metadata: {
            ...existingMeta,
            name: validated.name,
          },
        });
      } catch (supaErr) {
        console.warn('[Supabase Profile Sync] Failed to update user_metadata:', supaErr);
      }
    }

    // 2. Update user fields in MongoDB
    if (validated.name !== undefined) user.name = validated.name;
    if (validated.heightCm !== undefined) user.heightCm = validated.heightCm;
    if (validated.currentWeightKg !== undefined) user.currentWeightKg = validated.currentWeightKg;
    if (validated.targetWeightKg !== undefined) user.targetWeightKg = validated.targetWeightKg;
    if (validated.targetWeeks !== undefined) user.targetWeeks = validated.targetWeeks;
    if (validated.allergies !== undefined) user.allergies = validated.allergies;
    if (validated.supplements !== undefined) user.supplements = validated.supplements as any;
    if (validated.primaryGoal !== undefined) user.primaryGoal = validated.primaryGoal;

    await user.save();

    // 3. Synchronize active Goal in MongoDB
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
      const shouldRecalculateMacros =
        validated.primaryGoal !== undefined ||
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
        userId: req.user.userId,
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

    const userObj: any = user.toJSON();
    userObj._id = req.user.userId;
    (userObj as any).id = req.user.userId;

    res.status(200).json({
      message: 'Profile and goals synchronized successfully',
      user: userObj,
      goal: activeGoal ? activeGoal.toJSON() : null,
    });
  })
);
