/**
 * Dynamic 7-Day Trend Calculator
 * Computes chronological daily calorie consumption from user-recorded meals
 * against target energy budgets. Replaces static mock data with real analytics.
 */
import type { MealItem } from '../types/nutrition.js';
import type { DayTrendPoint } from '../components/reports/WeeklyTrendPreview.js';

/**
 * Computes a rolling 7-day trend array ending on today, aggregating calories
 * from meals matching each day in local/UTC dates.
 *
 * @param meals - Array of meal entries logged by the user
 * @param targetKcal - Daily calorie goal target
 * @returns 7 chronological DayTrendPoint objects
 */
export function computeWeeklyTrend(meals: MealItem[], targetKcal: number = 2200): DayTrendPoint[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const trend: DayTrendPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(d.getDate() + 1);

    const dayName = days[d.getDay()] || 'Day';
    const monthName = months[d.getMonth()] || '';
    const dateLabel = `${monthName} ${d.getDate()}`;

    // Filter meals falling into this 24-hour window
    const dayMeals = meals.filter((m) => {
      if (!m.eatenAt) return false;
      const mealDate = new Date(m.eatenAt);
      return mealDate >= d && mealDate < nextD;
    });

    const consumedKcal = dayMeals.reduce((sum, m) => sum + (m.nutrition?.caloriesKcal || 0), 0);

    let status = 'on_track';
    if (i === 0) {
      status = 'in_progress';
    } else if (consumedKcal === 0) {
      status = 'on_track';
    } else if (consumedKcal > targetKcal + 100) {
      status = 'slightly_over';
    } else if (Math.abs(consumedKcal - targetKcal) <= 100) {
      status = 'target_met';
    } else {
      status = 'on_track';
    }

    trend.push({
      day: dayName,
      date: dateLabel,
      consumedKcal,
      targetKcal,
      status,
    });
  }

  return trend;
}
