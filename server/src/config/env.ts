import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file (both local server dir and root)
dotenv.config();
dotenv.config({ path: 'server/.env' });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/calories'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('dev_jwt_secret_calories_platform_key_32_chars_min'),
  AI_SERVICE_URL: z.string().optional(),
  ML_SERVICE_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('[Calories Config] Invalid environment configuration:');
  console.error(parsedEnv.error.format());
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const env = parsedEnv.success ? parsedEnv.data : envSchema.parse({});
