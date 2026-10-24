import { NUTRITION_DATASET, type NutritionDatasetItem } from '../data/nutritionDataset.js';
import { TRAINED_MODEL_WEIGHTS, type PrimaryGoalType, type GoalWeights } from '../ml/modelWeights.js';
import type { MealType } from '../models/Meal.js';

export interface RemainingBudget {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface RecommendationProposal {
  id: string;
  foodName: string;
  category: MealType;
  portionAmount: number;
  portionUnit: string;
  nutrition: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  fiberG: number;
  matchScore: number; // 0 - 100 percentage
  reason: string;
  tags: string[];
  guidedByPdf: boolean;
}

export interface RecommendationEngineInput {
  primaryGoal?: PrimaryGoalType;
  userAllergies?: string[];
  remainingBudget: RemainingBudget;
  activeGoalTargets: {
    dailyCaloriesKcal: number;
    proteinGrams: number;
    carbohydrateGrams: number;
    fatGrams: number;
  };
  forbiddenFoods?: string[];
  recommendedFoods?: string[];
  preferredCategory?: MealType;
}

/**
 * Custom ML Recommendation Engine
 * Solves multi-objective constrained deficit filling with hard allergen filtering,
 * clinical PDF guideline alignment, and Holt satiety optimization.
 */
export function generateSmartRecommendations(input: RecommendationEngineInput): RecommendationProposal[] {
  const goal: PrimaryGoalType = input.primaryGoal || 'fat_loss';
  const weights: GoalWeights = TRAINED_MODEL_WEIGHTS[goal] || TRAINED_MODEL_WEIGHTS.fat_loss;
  const userAllergies = (input.userAllergies || []).map((a) => a.toLowerCase().trim());
  const forbiddenFoods = (input.forbiddenFoods || []).map((f) => f.toLowerCase().trim());
  const recommendedFoods = (input.recommendedFoods || []).map((r) => r.toLowerCase().trim());
  const remaining = input.remainingBudget;

  // 1. HARD CONSTRAINTS: Filter out allergens and diet plan forbidden ingredients
  const eligibleCandidates: NutritionDatasetItem[] = [];

  for (const item of NUTRITION_DATASET) {
    // Check allergens
    const hasAllergen = item.allergens.some((itemAllergen) => {
      const aLower = itemAllergen.toLowerCase();
      return userAllergies.some((userAllergy) => aLower.includes(userAllergy) || userAllergy.includes(aLower));
    });
    if (hasAllergen) continue;

    // Check PDF forbidden foods
    const isForbidden = forbiddenFoods.some((forbidden) => {
      if (!forbidden) return false;
      const nameMatch = item.name.toLowerCase().includes(forbidden);
      const tagMatch = item.tags.some((t) => t.toLowerCase().includes(forbidden));
      return nameMatch || tagMatch;
    });
    if (isForbidden) continue;

    eligibleCandidates.push(item);
  }

  // 2. MULTI-OBJECTIVE SCORING
  const scoredCandidates: Array<{
    item: NutritionDatasetItem;
    score: number;
    matchScore: number;
    reason: string;
    guidedByPdf: boolean;
  }> = [];

  for (const item of eligibleCandidates) {
    let score = 0;

    // Protein efficiency
    const proteinTarget = Math.max(5, remaining.proteinG);
    const proteinCoverage = Math.min(1.2, item.protein / proteinTarget);
    score += proteinCoverage * weights.proteinEfficiency;

    // Calorie fit
    const calBudget = Math.max(200, remaining.caloriesKcal);
    const calProximity = 1.0 - Math.min(1.0, Math.abs(item.calories - calBudget) / calBudget);
    score += calProximity * weights.calorieFit;

    // Calorie overshoot penalty
    if (item.calories > remaining.caloriesKcal && remaining.caloriesKcal > 0) {
      const overshootFraction = (item.calories - remaining.caloriesKcal) / remaining.caloriesKcal;
      score -= overshootFraction * weights.calorieOvershootPenalty;
    }

    // Carb alignment
    const carbTarget = Math.max(10, remaining.carbsG);
    const carbFit = 1.0 - Math.min(1.0, Math.abs(item.carbs - carbTarget) / carbTarget);
    score += Math.max(0, carbFit) * weights.carbAlignment;

    // Satiety index bonus
    const normSatiety = item.satietyIndex / 5.0;
    score += normSatiety * weights.satietyBonus;

    // Fiber density bonus
    const normFiber = Math.min(1.0, item.fiber / 8.0);
    score += normFiber * weights.fiberDensity;

    // Clinical PDF Recommendation Affinity Bonus
    let guidedByPdf = false;
    for (const rec of recommendedFoods) {
      if (!rec) continue;
      if (item.name.toLowerCase().includes(rec) || item.tags.some((t) => t.toLowerCase().includes(rec))) {
        score += 0.35; // Significant boost for dietitian-specified foods
        guidedByPdf = true;
        break;
      }
    }

    // Category affinity (if a specific category is requested)
    if (input.preferredCategory && item.category === input.preferredCategory) {
      score += 0.15;
    }

    // Normalize match percentage (clamp between 65% and 99%)
    const matchScore = Math.min(99, Math.max(65, Math.round(55 + score * 40)));

    // Generate clinical explanation
    let reason = '';
    if (guidedByPdf) {
      reason = `Dietitian Priority: Explicitly recommended in your uploaded clinical diet plan; supplies ${item.protein}g protein.`;
    } else if (remaining.proteinG > 15 && item.protein >= 20) {
      const pct = Math.min(100, Math.round((item.protein / remaining.proteinG) * 100));
      reason = `Fulfills ${pct}% of your remaining ${remaining.proteinG}g protein deficit with high satiety (${item.calories} kcal).`;
    } else if (item.fiber >= 5) {
      reason = `High-fiber glycemic stabilizer (${item.fiber}g fiber); supports digestive satiety while fitting inside today's budget.`;
    } else if (item.calories <= remaining.caloriesKcal) {
      reason = `Calorically optimal (${item.calories} kcal); fits cleanly within your remaining ${remaining.caloriesKcal} kcal daily allowance.`;
    } else {
      reason = `Nutrient-dense whole food aligned with your ${goal.replace('_', ' ')} protocol.`;
    }

    scoredCandidates.push({
      item,
      score,
      matchScore,
      reason,
      guidedByPdf,
    });
  }

  // 3. SORT & DIVERSITY KNAPSACK (Select top 4 diverse items)
  scoredCandidates.sort((a, b) => b.score - a.score);

  const selected: RecommendationProposal[] = [];
  const usedTags = new Set<string>();

  for (const cand of scoredCandidates) {
    if (selected.length >= 4) break;

    // Ensure variety: don't pick items with identical primary tag if we already have 2
    const primaryTag = cand.item.tags[0] || 'General';
    const tagCount = Array.from(usedTags).filter((t) => t === primaryTag).length;
    if (tagCount >= 2 && scoredCandidates.length > 4) {
      continue;
    }

    usedTags.add(primaryTag);
    selected.push({
      id: cand.item.id,
      foodName: cand.item.name,
      category: cand.item.category,
      portionAmount: cand.item.portionAmount,
      portionUnit: cand.item.portionUnit,
      nutrition: {
        caloriesKcal: cand.item.calories,
        proteinG: cand.item.protein,
        carbsG: cand.item.carbs,
        fatG: cand.item.fat,
      },
      fiberG: cand.item.fiber,
      matchScore: cand.matchScore,
      reason: cand.reason,
      tags: cand.item.tags,
      guidedByPdf: cand.guidedByPdf,
    });
  }

  return selected;
}
