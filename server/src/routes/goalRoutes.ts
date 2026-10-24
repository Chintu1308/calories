import { Router, type Request, type Response } from 'express';
import { Goal } from '../models/Goal.js';
import { User } from '../models/User.js';
import { goalInputSchema } from '../validators/goalValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const goalRouter = Router();

// Protect all goal routes with verified JWT authentication
goalRouter.use(authenticate);

/**
 * GET /api/v1/goals
 * Retrieves the currently active nutrition goal for the authenticated user.
 * Looks up the latest document matching `{ userId, isActive: true }`.
 * If an authenticated user does not have a goal yet, automatically computes and seeds
 * their initial clinical goal from their profile biometrics so they are immediately set up.
 *
 * @returns HTTP 200 with active goal JSON
 * @throws 401 Unauthorized if request is unauthenticated
 * @throws 404 Not Found if user is unknown and no active goal exists
 */
goalRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    let goal = await Goal.findOne({
      userId: req.user.userId,
      isActive: true,
    }).sort({ updatedAt: -1 });

    if (!goal) {
      // Auto-heal: If user exists in DB, calculate and seed active goal based on their profile
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
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

          goal = await Goal.create({
            userId: user._id,
            title: `${(user.primaryGoal || 'fat_loss').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Target`,
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
      } catch (seedErr: unknown) {
        console.warn('[Goal Auto-Seed] Notice generating goal:', seedErr);
      }
    }

    if (!goal) {
      throw AppError.notFound('No active nutrition goal found. Create or update your goal to get started.');
    }

    res.status(200).json({
      goal: goal.toJSON(),
    });
  })
);

/**
 * PUT /api/v1/goals
 * Atomic upsert for the user's active nutrition targets.
 * If an active goal exists, updates it in place; otherwise inserts a new active goal.
 * Validates daily calories, protein, carb, fat, and weight targets via `goalInputSchema`.
 *
 * @returns HTTP 200 with upserted goal JSON
 * @throws 400 Bad Request on invalid macro or calorie values
 * @throws 401 Unauthorized if request is unauthenticated
 */
goalRouter.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const validated = goalInputSchema.parse(req.body);

    const goal = await Goal.findOneAndUpdate(
      { userId: req.user.userId, isActive: true },
      {
        ...validated,
        userId: req.user.userId,
        isActive: true,
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      goal: goal.toJSON(),
    });
  })
);

/**
 * POST /api/v1/goals
 * Creates a new active nutrition goal milestone, automatically deactivating prior goals.
 * Preserves a full historical audit trail of past goals for longitudinal reporting.
 *
 * @returns HTTP 201 with newly created active goal JSON
 * @throws 400 Bad Request on validation failure
 * @throws 401 Unauthorized if request is unauthenticated
 */
goalRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const validated = goalInputSchema.parse(req.body);

    // Deactivate prior active goals for this user
    await Goal.updateMany(
      { userId: req.user.userId, isActive: true },
      { $set: { isActive: false } }
    );

    // Insert new active goal
    const goal = await Goal.create({
      ...validated,
      userId: req.user.userId,
      isActive: true,
    });

    res.status(201).json({
      goal: goal.toJSON(),
    });
  })
);

/**
 * GET /api/v1/goals/history
 * Returns the timeline of all historical nutrition goals set by the user.
 */
goalRouter.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const goals = await Goal.find({ userId: req.user.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      goals: goals.map((g) => g.toJSON()),
      total: goals.length,
    });
  })
);
