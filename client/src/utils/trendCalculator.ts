/**
 * Dynamic Trend Calculator
 * Computes chronological daily and weekly calorie consumption from user-recorded meals
 * against target energy budgets. Supports dynamic time horizons (7, 14, 30 days) and grouping.
 */
import type { MealItem } from '../types/nutrition.js';
import type { DayTrendPoint } from '../components/reports/WeeklyTrendPreview.js';

/**
 * Computes a dynamic trend array ending on today for any specified number of days,
 * supporting daily and weekly grouping resolutions.
 *
 * @param meals - Array of meal entries logged by the user
 * @param targetKcal - Daily calorie goal target
 * @param daysCount - Number of days in the horizon (e.g. 7, 14, 30)
 * @param groupBy - Grouping resolution ('day' | 'week')
 * @returns Array of chronological DayTrendPoint objects
 */
export function computeRangeTrend(
  meals: MealItem[],
  targetKcal: number = 2200,
  daysCount: number = 7,
  groupBy: 'day' | 'week' = 'day'
): DayTrendPoint[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  if (groupBy === 'week') {
    const numWeeks = Math.max(1, Math.ceil(daysCount / 7));
    const trend: DayTrendPoint[] = [];

    for (let w = numWeeks - 1; w >= 0; w--) {
      const weekEndDate = new Date(now);
      weekEndDate.setDate(now.getDate() - w * 7);
      weekEndDate.setHours(23, 59, 59, 999);

      const weekStartDate = new Date(weekEndDate);
      weekStartDate.setDate(weekEndDate.getDate() - 6);
      weekStartDate.setHours(0, 0, 0, 0);

      const weekMeals = meals.filter((m) => {
        if (!m.eatenAt) return false;
        const mDate = new Date(m.eatenAt);
        return mDate >= weekStartDate && mDate <= weekEndDate;
      });

      const consumedKcal = weekMeals.reduce((sum, m) => sum + (m.nutrition?.caloriesKcal || 0), 0);
      const weeklyTarget = targetKcal * 7;
      const isCurrentWeek = w === 0;

      let status = 'on_track';
      if (isCurrentWeek) {
        status = 'in_progress';
      } else if (consumedKcal === 0) {
        status = 'on_track';
      } else if (consumedKcal > weeklyTarget + 500) {
        status = 'slightly_over';
      } else if (Math.abs(consumedKcal - weeklyTarget) <= 500) {
        status = 'target_met';
      } else {
        status = 'on_track';
      }

      const startMonth = months[weekStartDate.getMonth()] || '';
      const endMonth = months[weekEndDate.getMonth()] || '';
      const dateLabel = `${startMonth} ${weekStartDate.getDate()} – ${endMonth} ${weekEndDate.getDate()}`;

      trend.push({
        day: `Wk ${numWeeks - w}`,
        date: dateLabel,
        consumedKcal,
        targetKcal: weeklyTarget,
        status,
      });
    }

    return trend;
  }

  // Daily grouping
  const trend: DayTrendPoint[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(d.getDate() + 1);

    const dayName = daysCount <= 7 ? (days[d.getDay()] || 'Day') : `${d.getMonth() + 1}/${d.getDate()}`;
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

/**
 * Computes a rolling 7-day trend array ending on today, aggregating calories
 * from meals matching each day in local/UTC dates.
 *
 * @param meals - Array of meal entries logged by the user
 * @param targetKcal - Daily calorie goal target
 * @returns 7 chronological DayTrendPoint objects
 */
export function computeWeeklyTrend(meals: MealItem[], targetKcal: number = 2200): DayTrendPoint[] {
  return computeRangeTrend(meals, targetKcal, 7, 'day');
}
