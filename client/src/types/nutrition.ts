/**
 * Domain types for Calories platform
 * Strictly mirrors the backend data model defined in docs/DATA_MODEL.md
 */

export type MealType =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snacks'
  | 'Brunch'
  | 'Intermediate';

export type MealSource = 'manual' | 'ai';

export interface Micronutrient {
  name: string; // e.g. "Fiber", "Sodium", "Vitamin C"
  amount: number;
  unit: 'g' | 'mg' | 'mcg' | 'IU';
}

export interface NutritionInfo {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface QuantityInfo {
  amount: number;
  unit: string; // e.g. "g", "ml", "cup", "serving", "slice"
}

export interface MealItem {
  id: string;
  userId: string;
  foodName: string;
  mealType: MealType;
  eatenAt: string; // ISO 8601 UTC string
  quantity: QuantityInfo;
  nutrition: NutritionInfo;
  micronutrients?: Micronutrient[]; // Omitted when unknown; never default to 0
  source: MealSource;
  notes?: string;
}

export interface DailyGoal {
  dailyCaloriesKcal: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  targetWeight?: number;
  weightUnit?: 'kg' | 'lbs';
  title?: string;
  targetDate?: string;
  targetWeeks?: number;
}

export interface SupplementItem {
  id: string;
  name: string;
  dosage: string; // e.g. "5g", "1 scoop (30g)", "2000 IU"
  timing: 'Morning' | 'Pre-Workout' | 'Post-Workout' | 'Evening' | 'With Meals';
  notes?: string;
}

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  loggedAt: string; // ISO 8601 UTC string
  note?: string;
}

export interface SupplementLogEntry {
  id: string;
  supplementId: string;
  name: string;
  dosage: string;
  timing: SupplementItem['timing'];
  loggedAt: string; // ISO 8601 UTC string
  taken: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  targetWeeks: number;
  targetDate: string; // ISO date string
  allergies: string[];
  supplements: SupplementItem[];
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
  primaryGoal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'athletic';
}

export interface GoalProjectionPoint {
  week: number;
  dateLabel: string;
  projectedWeightKg: number;
  calorieTarget: number;
}

export interface FoodRecommendation {
  id: string;
  foodName: string;
  portion: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  reason: string;
  macroFocus: 'protein' | 'carbs' | 'balanced' | 'low_calorie';
}

export interface DayNutritionalSummary {
  consumedCalories: number;
  targetCalories: number;
  consumedProtein: number;
  targetProtein: number;
  consumedCarbs: number;
  targetCarbs: number;
  consumedFat: number;
  targetFat: number;
  waterIntakeMl: number;
  targetWaterMl: number;
  currentWeightKg: number;
  targetWeightKg: number;
}
