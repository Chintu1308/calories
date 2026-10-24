import { Router, type Request, type Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/security.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Registers a new user account with bcrypt password hashing (10 salt rounds).
 * Validates registration schema, prevents duplicate emails, and returns a signed session JWT.
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
