import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Goal } from '../models/Goal.js';
import { User } from '../models/User.js';
import { Meal } from '../models/Meal.js';
import { DietInstruction } from '../models/DietInstruction.js';
import { generateSmartRecommendations } from '../services/recommendationEngine.js';
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

    // Keep user profile in sync with updated goal targets in MongoDB
    let updatedUser;
    if (validated.targetWeight !== undefined || validated.targetWeeks !== undefined) {
      updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set: {
            ...(validated.targetWeight !== undefined ? { targetWeightKg: validated.targetWeight } : {}),
            ...(validated.targetWeeks !== undefined ? { targetWeeks: validated.targetWeeks } : {}),
          },
        },
        { returnDocument: 'after' }
      );
    }

    res.status(200).json({
      goal: goal.toJSON(),
      user: updatedUser ? updatedUser.toJSON() : undefined,
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

    // Keep user profile in sync with updated goal targets in MongoDB
    let updatedUser;
    if (validated.targetWeight !== undefined || validated.targetWeeks !== undefined) {
      updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set: {
            ...(validated.targetWeight !== undefined ? { targetWeightKg: validated.targetWeight } : {}),
            ...(validated.targetWeeks !== undefined ? { targetWeeks: validated.targetWeeks } : {}),
          },
        },
        { returnDocument: 'after' }
      );
    }

    res.status(201).json({
      goal: goal.toJSON(),
      user: updatedUser ? updatedUser.toJSON() : undefined,
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

/**
 * GET /api/v1/goals/recommendations
 * Runs the custom ML Recommendation Engine on the user's live daily macro deficit,
 * strict allergen restrictions, Holt satiety index, and active PDF diet plan instructions.
 */
goalRouter.get(
  '/recommendations',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const user = await User.findById(req.user.userId);

    // 1. Fetch active nutrition goal (or auto-seed if none)
    let goal = await Goal.findOne({
      userId: req.user.userId,
      isActive: true,
    }).sort({ updatedAt: -1 });

    if (!goal) {
      const weightKg = user?.currentWeightKg || 70;
      const heightCm = user?.heightCm || 175;
      const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 28 + 5;
      const tdee = Math.round(bmr * 1.4);

      let cal = tdee;
      let p = Math.round(weightKg * 2.0);
      let f = Math.round(weightKg * 0.8);
      if (user?.primaryGoal === 'fat_loss') {
        cal = Math.max(1400, tdee - 500);
        p = Math.round(weightKg * 2.2);
      } else if (user?.primaryGoal === 'muscle_gain') {
        cal = tdee + 350;
        p = Math.round(weightKg * 2.2);
        f = Math.round(weightKg * 0.9);
      }
      const c = Math.max(50, Math.round((cal - (p * 4 + f * 9)) / 4));

      goal = await Goal.create({
        userId: req.user.userId,
        title: `${user?.primaryGoal ? user.primaryGoal.replace('_', ' ') : 'Balanced'} Plan`,
        dailyCaloriesKcal: cal,
        proteinGrams: p,
        carbohydrateGrams: c,
        fatGrams: f,
        isActive: true,
      });
    }

    // 2. Compute today's consumed nutrients
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const todayMeals = await Meal.aggregate([
      {
        $match: {
          userId: userObjectId,
          eatenAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          consumedCalories: { $sum: '$nutrition.caloriesKcal' },
          consumedProtein: { $sum: '$nutrition.proteinG' },
          consumedCarbs: { $sum: '$nutrition.carbsG' },
          consumedFat: { $sum: '$nutrition.fatG' },
        },
      },
    ]);

    const consumed = todayMeals[0] || {
      consumedCalories: 0,
      consumedProtein: 0,
      consumedCarbs: 0,
      consumedFat: 0,
    };

    const remainingBudget = {
      caloriesKcal: Math.max(0, goal.dailyCaloriesKcal - consumed.consumedCalories),
      proteinG: Math.max(0, goal.proteinGrams - consumed.consumedProtein),
      carbsG: Math.max(0, goal.carbohydrateGrams - consumed.consumedCarbs),
      fatG: Math.max(0, goal.fatGrams - consumed.consumedFat),
    };

    // 3. Query active PDF instructions stored in MongoDB
    const activeInstructions = await DietInstruction.find({
      userId: req.user.userId,
      isActive: true,
    });
    const forbiddenFoods = activeInstructions.flatMap((i) => i.forbiddenFoods);
    const recommendedFoods = activeInstructions.flatMap((i) => i.recommendedFoods);

    // 4. Run ML recommendation model (delegates to external ML microservice if configured, else local engine)
    const mlServiceUrl = process.env.ML_SERVICE_URL || process.env.AI_SERVICE_URL;
    let recommendations: any[] = [];
    let engineSource = 'embedded_knapsack_engine';

    if (mlServiceUrl && !mlServiceUrl.includes('localhost:5001')) {
      const cleanUrl = mlServiceUrl.replace(/\/$/, '');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const externalRes = await fetch(`${cleanUrl}/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primaryGoal: user?.primaryGoal || 'fat_loss',
            userAllergies: user?.allergies || [],
            remainingBudget,
            activeGoalTargets: {
              dailyCaloriesKcal: goal.dailyCaloriesKcal,
              proteinGrams: goal.proteinGrams,
              carbohydrateGrams: goal.carbohydrateGrams,
              fatGrams: goal.fatGrams,
            },
            forbiddenFoods,
            recommendedFoods,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (externalRes.ok) {
          const externalData = (await externalRes.json()) as any;
          if (Array.isArray(externalData.recommendations) && externalData.recommendations.length > 0) {
            recommendations = externalData.recommendations;
            engineSource = `external_service (${cleanUrl})`;
          }
        }
      } catch (err) {
        console.warn('[Calories Engine] External ML service call failed, using embedded engine:', err);
      }
    }

    // Fallback to local embedded model
    if (recommendations.length === 0) {
      recommendations = generateSmartRecommendations({
        primaryGoal: user?.primaryGoal,
        userAllergies: user?.allergies || [],
        remainingBudget,
        activeGoalTargets: {
          dailyCaloriesKcal: goal.dailyCaloriesKcal,
          proteinGrams: goal.proteinGrams,
          carbohydrateGrams: goal.carbohydrateGrams,
          fatGrams: goal.fatGrams,
        },
        forbiddenFoods,
        recommendedFoods,
      });
    }

    res.status(200).json({
      remainingBudget,
      consumed: {
        caloriesKcal: consumed.consumedCalories,
        proteinG: consumed.consumedProtein,
        carbsG: consumed.consumedCarbs,
        fatG: consumed.consumedFat,
      },
      recommendations,
      modelInfo: {
        version: 'Calories-Knapsack-v1',
        engineSource,
        primaryGoal: user?.primaryGoal || 'fat_loss',
        activePdfInstructionsCount: activeInstructions.length,
      },
    });
  })
);
