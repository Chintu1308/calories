/**
 * TEMPORARY FICTIONAL SAMPLE DATA FOR STAGE 3 UI DEMONSTRATION ONLY
 * This data powers the static dashboard shell before backend persistence is wired in Stages 4-7.
 * All records strictly conform to the Calories Data Model (docs/DATA_MODEL.md).
 */

import type { DailyGoal, MealItem, UserProfile, FoodRecommendation, GoalProjectionPoint } from '../types/nutrition.js';

export const SAMPLE_DAILY_GOAL: DailyGoal = {
  dailyCaloriesKcal: 2200,
  proteinGrams: 150,
  carbohydrateGrams: 220,
  fatGrams: 70,
  targetWeight: 70.0,
  weightUnit: 'kg',
  title: 'Lean Definition & Fat Loss',
  targetWeeks: 8,
  targetDate: '2026-12-19',
};

export const SAMPLE_USER_PROFILE: UserProfile = {
  id: 'user_alex_h',
  name: 'Alex Henderson',
  email: 'alex.henderson@example.com',
  heightCm: 178,
  currentWeightKg: 74.2,
  targetWeightKg: 70.0,
  targetWeeks: 8,
  targetDate: '2026-12-19',
  allergies: ['Peanuts', 'Shellfish'],
  supplements: [
    {
      id: 'supp_1',
      name: 'Whey Protein Isolate',
      dosage: '1 scoop (30g)',
      timing: 'Post-Workout',
      notes: 'Contains 27g protein and 1g carbs per scoop',
    },
    {
      id: 'supp_2',
      name: 'Creatine Monohydrate',
      dosage: '5g',
      timing: 'Morning',
      notes: 'Dissolved in water or morning shake for cellular energy',
    },
    {
      id: 'supp_3',
      name: 'Vitamin D3 + K2',
      dosage: '2,000 IU',
      timing: 'With Meals',
      notes: 'Fat-soluble vitamin taken with breakfast fat intake',
    },
    {
      id: 'supp_4',
      name: 'Omega-3 Wild Fish Oil',
      dosage: '1,000 mg',
      timing: 'Evening',
      notes: 'EPA 600mg / DHA 400mg for cardiovascular and joint health',
    },
  ],
  activityLevel: 'moderate',
  primaryGoal: 'fat_loss',
};

export const SAMPLE_RECOMMENDATIONS: FoodRecommendation[] = [
  {
    id: 'rec_1',
    foodName: 'Grilled Chicken Breast with Steamed Broccoli',
    portion: '160g chicken + 100g broccoli',
    caloriesKcal: 260,
    proteinG: 48,
    carbsG: 7,
    fatG: 4,
    reason: 'Fulfills remaining protein target with lean, high-satiety volume',
    macroFocus: 'protein',
  },
  {
    id: 'rec_2',
    foodName: '0% Fat Greek Yogurt with Chia & Raspberries',
    portion: '200g yogurt + 40g raspberries',
    caloriesKcal: 170,
    proteinG: 21,
    carbsG: 16,
    fatG: 2,
    reason: 'Slow-digesting casein protein plus gut-friendly dietary fiber',
    macroFocus: 'protein',
  },
  {
    id: 'rec_3',
    foodName: 'Wild Atlantic Salmon Fillet with Asparagus',
    portion: '180g salmon + 8 spears',
    caloriesKcal: 380,
    proteinG: 36,
    carbsG: 4,
    fatG: 22,
    reason: 'Nutrient-dense dinner option rich in bioavailable Omega-3s',
    macroFocus: 'balanced',
  },
  {
    id: 'rec_4',
    foodName: 'Tofu & Edamame Sauté with Brown Rice',
    portion: '150g firm tofu + 50g edamame + 80g rice',
    caloriesKcal: 320,
    proteinG: 24,
    carbsG: 38,
    fatG: 8,
    reason: 'Plant-powered complete amino acid profile with complex carbohydrates',
    macroFocus: 'balanced',
  },
];

export function generateWeightProjection(
  currentWeightKg: number,
  targetWeightKg: number,
  weeks: number
): GoalProjectionPoint[] {
  const points: GoalProjectionPoint[] = [];
  const safeWeeks = Math.max(weeks, 1);
  const totalChange = targetWeightKg - currentWeightKg;

  for (let w = 0; w <= safeWeeks; w++) {
    // Gradual non-linear curve (weight loss slows down slightly as body adapts)
    const progress = Math.pow(w / safeWeeks, 0.9);
    const weightAtWeek = Number((currentWeightKg + totalChange * progress).toFixed(1));
    const targetCal = totalChange < 0 ? 2100 : 2500;
    points.push({
      week: w,
      dateLabel: w === 0 ? 'Start' : `Week ${w}`,
      projectedWeightKg: weightAtWeek,
      calorieTarget: targetCal,
    });
  }

  return points;
}

export const SAMPLE_MEALS: MealItem[] = [
  // Breakfast
  {
    id: 'meal_demo_01',
    userId: 'user_demo_student',
    foodName: 'Rolled Oatmeal with Blueberries & Chia',
    mealType: 'Breakfast',
    eatenAt: '2026-10-24T08:15:00.000Z',
    quantity: { amount: 260, unit: 'g' },
    nutrition: {
      caloriesKcal: 380,
      proteinG: 14,
      carbsG: 62,
      fatG: 9,
    },
    micronutrients: [
      { name: 'Dietary Fiber', amount: 9, unit: 'g' },
      { name: 'Potassium', amount: 280, unit: 'mg' },
    ],
    source: 'manual',
    notes: 'Topped with half a scoop of plant protein and Ceylon cinnamon',
  },
  {
    id: 'meal_demo_02',
    userId: 'user_demo_student',
    foodName: 'Greek Yogurt (0% Fat) with Raw Honey',
    mealType: 'Breakfast',
    eatenAt: '2026-10-24T08:35:00.000Z',
    quantity: { amount: 170, unit: 'g' },
    nutrition: {
      caloriesKcal: 140,
      proteinG: 18,
      carbsG: 16,
      fatG: 1,
    },
    micronutrients: [
      { name: 'Calcium', amount: 200, unit: 'mg' },
    ],
    source: 'manual',
  },

  // Lunch
  {
    id: 'meal_demo_03',
    userId: 'user_demo_student',
    foodName: 'Grilled Chicken & Quinoa Grain Bowl',
    mealType: 'Lunch',
    eatenAt: '2026-10-24T13:10:00.000Z',
    quantity: { amount: 380, unit: 'g' },
    nutrition: {
      caloriesKcal: 560,
      proteinG: 48,
      carbsG: 52,
      fatG: 18,
    },
    micronutrients: [
      { name: 'Dietary Fiber', amount: 8, unit: 'g' },
      { name: 'Iron', amount: 4.2, unit: 'mg' },
      { name: 'Sodium', amount: 480, unit: 'mg' },
    ],
    source: 'ai',
    notes: 'Extracted from nutrition plate photo; reviewed and confirmed',
  },

  // Snacks
  {
    id: 'meal_demo_04',
    userId: 'user_demo_student',
    foodName: 'Roasted California Almonds',
    mealType: 'Snacks',
    eatenAt: '2026-10-24T16:30:00.000Z',
    quantity: { amount: 30, unit: 'g' },
    nutrition: {
      caloriesKcal: 175,
      proteinG: 6,
      carbsG: 6,
      fatG: 15,
    },
    micronutrients: [
      { name: 'Vitamin E', amount: 7.3, unit: 'mg' },
      { name: 'Magnesium', amount: 76, unit: 'mg' },
    ],
    source: 'manual',
    notes: 'Unsalted dry roasted portion',
  },

  // Dinner
  {
    id: 'meal_demo_05',
    userId: 'user_demo_student',
    foodName: 'Pan-Seared Atlantic Salmon & Roasted Asparagus',
    mealType: 'Dinner',
    eatenAt: '2026-10-24T20:00:00.000Z',
    quantity: { amount: 320, unit: 'g' },
    nutrition: {
      caloriesKcal: 440,
      proteinG: 39,
      carbsG: 14,
      fatG: 26,
    },
    micronutrients: [
      { name: 'Omega-3', amount: 2.2, unit: 'g' },
      { name: 'Potassium', amount: 620, unit: 'mg' },
    ],
    source: 'manual',
    notes: 'Drizzled with cold-pressed olive oil and lemon zest',
  },
];

export const SAMPLE_WEEKLY_TREND = [
  { day: 'Sun', date: 'Oct 18', consumedKcal: 2120, targetKcal: 2200, status: 'on_track' },
  { day: 'Mon', date: 'Oct 19', consumedKcal: 2240, targetKcal: 2200, status: 'target_met' },
  { day: 'Tue', date: 'Oct 20', consumedKcal: 1980, targetKcal: 2200, status: 'on_track' },
  { day: 'Wed', date: 'Oct 21', consumedKcal: 2310, targetKcal: 2200, status: 'slightly_over' },
  { day: 'Thu', date: 'Oct 22', consumedKcal: 2180, targetKcal: 2200, status: 'target_met' },
  { day: 'Fri', date: 'Oct 23', consumedKcal: 2050, targetKcal: 2200, status: 'on_track' },
  { day: 'Sat', date: 'Oct 24', consumedKcal: 1695, targetKcal: 2200, status: 'in_progress' },
];
