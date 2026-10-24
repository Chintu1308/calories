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
 * Validates payload against `createMealSchema` enforcing non-negative macronutrients.
 * Guarantees tenant isolation by attaching `req.user.userId`.
 *
 * @returns HTTP 201 with persisted meal JSON
 * @throws 400 Bad Request on schema validation failure
 * @throws 401 Unauthorized if JWT token is missing or expired
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
 * Retrieves paginated meal history for the authenticated user.
 * Supports meal category filter (`mealType`) and date range bounds (`startDate`, `endDate`).
 * Uses stable tie-breaker sort `{ eatenAt: -1, _id: -1 }` aligned with compound index.
 *
 * @query page - Page number (defaults to 1, min 1)
 * @query limit - Items per page (defaults to 20, max 100)
 * @query mealType - Optional category filter (Breakfast, Lunch, Dinner, Snacks, Brunch, Intermediate)
 * @query startDate - Optional ISO date lower bound
 * @query endDate - Optional ISO date upper bound
 * @returns HTTP 200 with `{ meals, pagination: { page, limit, total, totalPages } }`
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
      Meal.find(filter).sort({ eatenAt: -1, _id: -1 }).skip(skip).limit(limit),
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
 *
 * @param id - MongoDB ObjectId of the target meal
 * @returns HTTP 200 with meal JSON
 * @throws 400 Bad Request if ID format is invalid
 * @throws 404 Not Found if meal does not exist or belongs to another user
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
 * Partially updates an existing meal entry, ensuring tenant boundary validation.
 *
 * @param id - MongoDB ObjectId of the target meal
 * @returns HTTP 200 with updated meal JSON
 * @throws 400 Bad Request on invalid ID or schema validation failure
 * @throws 404 Not Found if meal does not exist or belongs to another user
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
 * Permanently deletes a meal entry, ensuring only the resource owner can delete it.
 *
 * @param id - MongoDB ObjectId of the target meal
 * @returns HTTP 200 with confirmation message and deleted ID
 * @throws 400 Bad Request on invalid ID
 * @throws 404 Not Found if meal does not exist or belongs to another user
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
