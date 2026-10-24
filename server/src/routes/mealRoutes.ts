import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Meal } from '../models/Meal.js';
import {
  createMealSchema,
  updateMealSchema,
  mealQuerySchema,
} from '../validators/mealValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const mealRouter = Router();

// Protect all meal routes with verified JWT authentication
mealRouter.use(authenticate);

/**
 * POST /api/v1/meals
 * Creates a new meal entry scoped strictly to the authenticated user.
 */
mealRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const validated = createMealSchema.parse(req.body);

    const meal = await Meal.create({
      ...validated,
      userId: req.user.userId,
    });

    res.status(201).json({
      meal: meal.toJSON(),
    });
  })
);

/**
 * GET /api/v1/meals
 * Paginated list of meals for the authenticated user, supporting category and date filters.
 */
mealRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { page, limit, mealType, startDate, endDate } = mealQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {
      userId: req.user.userId,
    };

    if (mealType) {
      filter.mealType = mealType;
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      filter.eatenAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [meals, total] = await Promise.all([
      Meal.find(filter).sort({ eatenAt: -1 }).skip(skip).limit(limit),
      Meal.countDocuments(filter),
    ]);

    res.status(200).json({
      meals: meals.map((m) => m.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

/**
 * GET /api/v1/meals/:id
 * Retrieves a single meal entry, strictly enforcing multi-tenant ownership.
 */
mealRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid meal entry ID format');
    }

    const meal = await Meal.findOne({
      _id: id,
      userId: req.user.userId,
    });

    if (!meal) {
      throw AppError.notFound('Meal entry not found');
    }

    res.status(200).json({
      meal: meal.toJSON(),
    });
  })
);

/**
 * PATCH /api/v1/meals/:id
 * Updates an existing meal entry, verifying tenant ownership.
 */
mealRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid meal entry ID format');
    }

    const validated = updateMealSchema.parse(req.body);

    const meal = await Meal.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { $set: validated },
      { returnDocument: 'after', runValidators: true }
    );

    if (!meal) {
      throw AppError.notFound('Meal entry not found');
    }

    res.status(200).json({
      meal: meal.toJSON(),
    });
  })
);

/**
 * DELETE /api/v1/meals/:id
 * Deletes a meal entry, ensuring only the resource owner can delete it.
 */
mealRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid meal entry ID format');
    }

    const result = await Meal.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });

    if (!result) {
      throw AppError.notFound('Meal entry not found');
    }

    res.status(200).json({
      message: 'Meal entry deleted successfully',
      id,
    });
  })
);
