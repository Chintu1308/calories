import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Meal } from '../models/Meal.js';
import { Goal } from '../models/Goal.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reportRouter = Router();

// Protect all report endpoints with verified JWT authentication
reportRouter.use(authenticate);

const dateRangeQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

const macroQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(['day', 'week']).default('day'),
});

const weeklyQuerySchema = z.object({
  weekStart: z.string().optional(),
});

/**
 * GET /api/v1/reports/weekly-calories
 * Returns 7-day chronological calorie totals with daily goal comparison.
 */
reportRouter.get(
  '/weekly-calories',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { weekStart } = weeklyQuerySchema.parse(req.query);
    const startDate = weekStart ? new Date(weekStart) : new Date(Date.now() - 6 * 24 * 3600 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);

    // Fetch user's active goal
    const activeGoal = await Goal.findOne({ userId: req.user.userId, isActive: true });
    const targetCalories = activeGoal ? activeGoal.dailyCaloriesKcal : 2000;

    // Aggregation pipeline over meals
    const dailyAggregates = await Meal.aggregate([
      {
        $match: {
          userId: userObjectId,
          eatenAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$eatenAt', timezone: 'UTC' },
          },
          caloriesKcal: { $sum: '$nutrition.caloriesKcal' },
          mealCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build dense 7-day array to ensure zero days are represented cleanly
    const dayMap = new Map(dailyAggregates.map((d) => [d._id, d]));
    const days = [];

    for (let i = 0; i < 7; i++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      const match = dateStr ? dayMap.get(dateStr) : undefined;

      days.push({
        date: dateStr,
        caloriesKcal: match ? Math.round(match.caloriesKcal) : 0,
        targetCalories,
        mealCount: match ? match.mealCount : 0,
      });
    }

    res.status(200).json({
      startDate: startDate.toISOString().split('T')[0],
      days,
      targetCalories,
    });
  })
);

/**
 * GET /api/v1/reports/macros
 * Returns macronutrient totals and percentage split grouped by day or week.
 */
reportRouter.get(
  '/macros',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { start, end, groupBy } = macroQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.user.userId),
    };

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = new Date(start);
      if (end) dateFilter.$lte = new Date(end);
      filter.eatenAt = dateFilter;
    }

    const formatString = groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d';

    const results = await Meal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: formatString, date: '$eatenAt', timezone: 'UTC' },
          },
          proteinG: { $sum: '$nutrition.proteinG' },
          carbsG: { $sum: '$nutrition.carbsG' },
          fatG: { $sum: '$nutrition.fatG' },
          caloriesKcal: { $sum: '$nutrition.caloriesKcal' },
          mealCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = results.map((r) => {
      const pKcal = r.proteinG * 4;
      const cKcal = r.carbsG * 4;
      const fKcal = r.fatG * 9;
      const totalKcal = pKcal + cKcal + fKcal;

      return {
        period: r._id,
        proteinG: Math.round(r.proteinG),
        carbsG: Math.round(r.carbsG),
        fatG: Math.round(r.fatG),
        caloriesKcal: Math.round(r.caloriesKcal),
        mealCount: r.mealCount,
        energySplit: {
          proteinPct: totalKcal > 0 ? Math.round((pKcal / totalKcal) * 100) : 0,
          carbsPct: totalKcal > 0 ? Math.round((cKcal / totalKcal) * 100) : 0,
          fatPct: totalKcal > 0 ? Math.round((fKcal / totalKcal) * 100) : 0,
        },
      };
    });

    res.status(200).json({
      groupBy,
      data: formatted,
    });
  })
);

/**
 * GET /api/v1/reports/micronutrients
 * Returns aggregated micronutrients using honest absence semantics (unwinding non-null items).
 */
reportRouter.get(
  '/micronutrients',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { start, end } = dateRangeQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.user.userId),
      micronutrients: { $exists: true, $ne: [] },
    };

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = new Date(start);
      if (end) dateFilter.$lte = new Date(end);
      filter.eatenAt = dateFilter;
    }

    const results = await Meal.aggregate([
      { $match: filter },
      { $unwind: '$micronutrients' },
      {
        $group: {
          _id: {
            name: '$micronutrients.name',
            unit: '$micronutrients.unit',
          },
          totalAmount: { $sum: '$micronutrients.amount' },
          loggedCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.name': 1 } },
    ]);

    const formatted = results.map((r) => ({
      name: r._id.name,
      unit: r._id.unit,
      totalAmount: Math.round(r.totalAmount * 10) / 10,
      loggedCount: r.loggedCount,
    }));

    res.status(200).json({
      nutrients: formatted,
      totalDistinctNutrients: formatted.length,
    });
  })
);

/**
 * GET /api/v1/reports/goals
 * Compares average intake against the user's active goal.
 */
reportRouter.get(
  '/goals',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { start, end } = dateRangeQuerySchema.parse(req.query);

    const activeGoal = await Goal.findOne({ userId: req.user.userId, isActive: true });

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.user.userId),
    };

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = new Date(start);
      if (end) dateFilter.$lte = new Date(end);
      filter.eatenAt = dateFilter;
    }

    const results = await Meal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$nutrition.caloriesKcal' },
          totalProtein: { $sum: '$nutrition.proteinG' },
          totalCarbs: { $sum: '$nutrition.carbsG' },
          totalFat: { $sum: '$nutrition.fatG' },
          distinctDays: {
            $addToSet: {
              $dateToString: { format: '%Y-%m-%d', date: '$eatenAt', timezone: 'UTC' },
            },
          },
        },
      },
    ]);

    const summary = results[0];
    const daysLogged = summary ? summary.distinctDays.length : 0;

    const actual = {
      avgCaloriesKcal: daysLogged > 0 ? Math.round(summary.totalCalories / daysLogged) : 0,
      avgProteinG: daysLogged > 0 ? Math.round(summary.totalProtein / daysLogged) : 0,
      avgCarbsG: daysLogged > 0 ? Math.round(summary.totalCarbs / daysLogged) : 0,
      avgFatG: daysLogged > 0 ? Math.round(summary.totalFat / daysLogged) : 0,
      daysLogged,
    };

    const targetKcal = activeGoal ? activeGoal.dailyCaloriesKcal : 2000;
    const diffPct = actual.avgCaloriesKcal > 0
      ? Math.round((Math.abs(actual.avgCaloriesKcal - targetKcal) / targetKcal) * 100)
      : 100;
    const complianceRatePct = Math.max(0, 100 - diffPct);

    res.status(200).json({
      actual,
      goal: activeGoal ? activeGoal.toJSON() : null,
      complianceRatePct,
    });
  })
);
