import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { findUserByAuthId } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Meal } from '../models/Meal.js';
import { DietInstruction } from '../models/DietInstruction.js';
import { extractNutritionFromImage } from '../services/aiVisionService.js';
import { parseDietPlanPdf } from '../services/dietPdfService.js';
import { processNutritionChat } from '../services/aiChatService.js';
import { extractBatchMealsFromTable } from '../services/aiBatchTableService.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const aiRouter = Router();

// Protect all AI vision & diet plan endpoints with verified JWT authentication
aiRouter.use(authenticate);

// Configure multer memory storage with 5MB cap and strict image MIME filters
const uploadImage = multer({
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

// Configure multer for PDF diet plans (10MB limit)
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are supported.'));
    }
  },
});

function handleMulterError(uploadMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        return next(AppError.badRequest(err.message || 'File upload failed'));
      }
      next();
    });
  };
}

/**
 * POST /api/v1/ai/extract
 * Accepts an image of a meal, dish, or label and returns an uncommitted nutritional proposal
 * with ingredient breakdown, macro analysis, and adherence evaluation against the user's
 * active diet plan instructions stored in MongoDB.
 */
aiRouter.post(
  '/extract',
  handleMulterError(uploadImage.single('image')),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (!req.file) {
      throw AppError.badRequest('Missing image file. Please upload a photo of your meal or food label.');
    }

    // 1. Fetch user allergies and biometric preferences
    const user = await findUserByAuthId(req.user.userId, req.user.email);
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
          userId: req.user.userId,
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

    // 4. Fetch stored dietary instructions from MongoDB for future AI context feeding
    const activeInstructions = await DietInstruction.find({
      userId: req.user.userId,
      isActive: true,
    });
    const dietaryRules = activeInstructions.flatMap((i) => i.dietaryRules);
    const forbiddenFoods = activeInstructions.flatMap((i) => i.forbiddenFoods);

    // 5. Run AI vision extraction adapter with PDF dietary rules feed
    const result = await extractNutritionFromImage(
      req.file.buffer,
      req.file.originalname,
      userAllergies,
      remainingCalories,
      remainingProtein,
      remainingCarbs,
      remainingFat,
      dietaryRules,
      forbiddenFoods
    );

    res.status(200).json(result);
  })
);

/**
 * POST /api/v1/ai/diet-pdf (BONUS FEATURE)
 * Ingests a doctor/dietitian diet plan PDF, extracts dietary instructions via AI feed,
 * and saves structured rules, restrictions, and targets into MongoDB for future use.
 */
aiRouter.post(
  '/diet-pdf',
  handleMulterError(uploadPdf.single('pdf')),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (!req.file) {
      throw AppError.badRequest('Missing PDF file. Please upload your diet plan or nutritionist chart in PDF format.');
    }

    // 1. Feed raw PDF buffer to Gemini AI multimodal extractor
    const extractedPlan = await parseDietPlanPdf(req.file.buffer, req.file.originalname);

    // 2. Persist extracted clinical instructions to MongoDB
    const instructionDoc = await DietInstruction.create({
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype || 'application/pdf',
      summary: extractedPlan.summary,
      dietaryRules: extractedPlan.dietaryRules,
      forbiddenFoods: extractedPlan.forbiddenFoods,
      recommendedFoods: extractedPlan.recommendedFoods,
      targetCaloriesKcal: extractedPlan.targetCaloriesKcal,
      targetProteinGrams: extractedPlan.targetProteinGrams,
      targetCarbsGrams: extractedPlan.targetCarbsGrams,
      targetFatGrams: extractedPlan.targetFatGrams,
      mealTimingNotes: extractedPlan.mealTimingNotes,
      clinicalObservations: extractedPlan.clinicalObservations,
      isActive: true,
    });

    // 3. If explicit caloric targets are prescribed by the dietitian, sync active goal
    if (extractedPlan.targetCaloriesKcal) {
      await Goal.findOneAndUpdate(
        { userId: req.user.userId, isActive: true },
        {
          $set: {
            dailyCaloriesKcal: extractedPlan.targetCaloriesKcal,
            ...(extractedPlan.targetProteinGrams ? { proteinGrams: extractedPlan.targetProteinGrams } : {}),
            ...(extractedPlan.targetCarbsGrams ? { carbohydrateGrams: extractedPlan.targetCarbsGrams } : {}),
            ...(extractedPlan.targetFatGrams ? { fatGrams: extractedPlan.targetFatGrams } : {}),
          },
        },
        { new: true }
      );
    }

    res.status(201).json({
      message: 'Diet plan successfully extracted and saved to MongoDB for AI guidance.',
      instruction: instructionDoc,
    });
  })
);

/**
 * GET /api/v1/ai/diet-instructions
 * Retrieves all stored clinical diet instructions for the authenticated user from MongoDB.
 */
aiRouter.get(
  '/diet-instructions',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const instructions = await DietInstruction.find({
      userId: req.user.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({ instructions });
  })
);

/**
 * DELETE /api/v1/ai/diet-instructions/:id
 * Removes or archives a stored diet instruction set, enforcing strict tenant isolation.
 */
aiRouter.delete(
  '/diet-instructions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid diet instruction ID');
    }

    const deleted = await DietInstruction.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });

    if (!deleted) {
      throw AppError.notFound('Diet instruction not found');
    }

    res.status(200).json({
      message: 'Diet instruction removed from AI engine.',
      id,
    });
  })
);

/**
 * POST /api/v1/ai/chat (BONUS FEATURE)
 * Interactive AI Nutrition Chat Assistant.
 * Provides personalized nutritional advice, meal recommendations, and macro deficit analysis
 * grounded in the user's active goals, consumed meals today, allergies, and diet PDF instructions.
 */
aiRouter.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { message, conversationHistory, clientDate } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw AppError.badRequest('Message cannot be empty. Please ask a nutrition question.');
    }

    if (message.length > 2000) {
      throw AppError.badRequest('Message exceeds maximum allowed length (2000 characters).');
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    const chatResult = await processNutritionChat(
      req.user.userId,
      message.trim(),
      history,
      clientDate
    );

    res.status(200).json(chatResult);
  })
);

/**
 * POST /api/v1/ai/batch-extract-table
 * Analyzes tabular data (Markdown tables, CSV, TSV, or multi-date structured logs).
 * Extracts all meals, calculates/estimates nutritional macros across all dates,
 * and optionally bulk-persists them to MongoDB under the user's account.
 */
aiRouter.post(
  '/batch-extract-table',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const { rawText, autoCommit } = req.body;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      throw AppError.badRequest('Raw table text is required. Please provide Markdown, CSV, or formatted meal rows.');
    }

    const result = await extractBatchMealsFromTable(
      rawText.trim(),
      req.user.userId,
      Boolean(autoCommit)
    );

    res.status(200).json(result);
  })
);
