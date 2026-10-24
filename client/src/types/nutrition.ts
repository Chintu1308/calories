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
