/**
 * TEMPORARY FICTIONAL SAMPLE DATA FOR STAGE 3 UI DEMONSTRATION ONLY
 * This data powers the static dashboard shell before backend persistence is wired in Stages 4-7.
 * All records strictly conform to the Calories Data Model (docs/DATA_MODEL.md).
 */

import type { DailyGoal, MealItem } from '../types/nutrition.js';

export const SAMPLE_DAILY_GOAL: DailyGoal = {
  dailyCaloriesKcal: 2200,
  proteinGrams: 150,
  carbohydrateGrams: 220,
  fatGrams: 70,
  targetWeight: 72.0,
  weightUnit: 'kg',
};

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
