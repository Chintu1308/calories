import type { GoalProjectionPoint } from '../types/nutrition.js';

export function generateWeightProjection(
  currentWeightKg: number,
  targetWeightKg: number,
  weeks: number
): GoalProjectionPoint[] {
  const points: GoalProjectionPoint[] = [];
  const safeWeeks = Math.max(weeks, 1);
  const totalChange = targetWeightKg - currentWeightKg;

  for (let w = 0; w <= safeWeeks; w++) {
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
