import { Router, type Request, type Response } from 'express';
import { Goal } from '../models/Goal.js';
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
 */
goalRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const goal = await Goal.findOne({
      userId: req.user.userId,
      isActive: true,
    }).sort({ updatedAt: -1 });

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
 * Upserts the active nutrition goal for the authenticated user.
 * If a goal already exists, it updates it in place; otherwise it creates it.
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
 * Creates a new active nutrition goal, automatically deactivating prior goals to preserve history.
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
