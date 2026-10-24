import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Meal } from '../models/Meal.js';
import { extractNutritionFromImage } from '../services/aiVisionService.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const aiRouter = Router();

// Protect all AI vision endpoints with verified JWT authentication
aiRouter.use(authenticate);

// Configure multer memory storage with 5MB cap and strict image MIME filters
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are supported.'));
    }
  },
});

/**
 * POST /api/v1/ai/extract
 * Accepts an image of a meal, dish, or label and returns an uncommitted nutritional proposal
 * with ingredient breakdown and contextual fit analysis against today's remaining calories.
 */
aiRouter.post(
  '/extract',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (!req.file) {
      throw AppError.badRequest('Missing image file. Please upload a photo of your meal or food label.');
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);

    // 1. Fetch user allergies and biometric preferences
    const user = await User.findById(req.user.userId);
    const userAllergies = user?.allergies || [];

    // 2. Fetch active nutritional goal
    const goal = await Goal.findOne({ userId: req.user.userId, isActive: true });
    const targetCalories = goal ? goal.dailyCaloriesKcal : 2000;
    const targetProtein = goal ? goal.proteinGrams : 150;
    const targetCarbs = goal ? goal.carbohydrateGrams : 200;
    const targetFat = goal ? goal.fatGrams : 65;

    // 3. Compute today's consumed nutrients
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

    const remainingCalories = Math.max(0, targetCalories - consumed.consumedCalories);
    const remainingProtein = Math.max(0, targetProtein - consumed.consumedProtein);
    const remainingCarbs = Math.max(0, targetCarbs - consumed.consumedCarbs);
    const remainingFat = Math.max(0, targetFat - consumed.consumedFat);

    // 4. Run AI vision extraction adapter
    const result = await extractNutritionFromImage(
      req.file.buffer,
      req.file.originalname,
      userAllergies,
      remainingCalories,
      remainingProtein,
      remainingCarbs,
      remainingFat
    );

    res.status(200).json(result);
  })
);
