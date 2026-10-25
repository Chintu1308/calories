import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Select,
  ProgressBar,
  Icon,
} from '../components/ui/index.js';
import type { MealItem, DailyGoal, UserProfile } from '../types/nutrition.js';
import { exportNutritionReportPdf } from '../utils/exportPdf.js';
import { computeRangeTrend } from '../utils/trendCalculator.js';
import type { DayTrendPoint } from '../components/reports/WeeklyTrendPreview.js';

const DEFAULT_REPORT_PROFILE: UserProfile = {
  id: '',
  name: 'User',
  email: '',
  heightCm: 175,
  currentWeightKg: 75,
  targetWeightKg: 70,
  targetWeeks: 8,
  targetDate: new Date().toISOString().split('T')[0],
  activityLevel: 'moderate',
  allergies: [],
  supplements: [],
  primaryGoal: 'fat_loss',
};

export interface ReportsPageProps {
  meals: MealItem[];
  goal: DailyGoal;
  userProfile?: UserProfile;
  weeklyTrend?: DayTrendPoint[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  meals,
  goal,
  userProfile = DEFAULT_REPORT_PROFILE,
  weeklyTrend: _weeklyTrendProp,
}) => {
  const [groupBy, setGroupBy] = useState<'day' | 'week'>('day');
  const [dateRange, setDateRange] = useState<string>('7days');

  const daysCount = dateRange === '14days' ? 14 : dateRange === '30days' ? 30 : 7;
  const horizonLabel = dateRange === '14days' ? '14-Day' : dateRange === '30days' ? '30-Day' : '7-Day';
  const fullRangeTitle = dateRange === '14days' ? 'Last 14 Days' : dateRange === '30days' ? 'Last 30 Days' : 'Last 7 Days';

  // Filter meals strictly based on the selected date range
  const filteredMeals = useMemo(() => {
    // oxlint-disable-next-line react/purity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (daysCount - 1));
    cutoffDate.setHours(0, 0, 0, 0);

    return meals.filter((m) => {
      if (!m.eatenAt) return false;
      const mealDate = new Date(m.eatenAt);
      return mealDate >= cutoffDate;
    });
  }, [meals, daysCount]);

  // Compute dynamic trend points for this date range and grouping (handles empty meal set cleanly)
  const activeTrend = useMemo(() => {
    return computeRangeTrend(filteredMeals, goal.dailyCaloriesKcal, daysCount, groupBy);
  }, [filteredMeals, goal.dailyCaloriesKcal, daysCount, groupBy]);

  // Target comparison metrics for the period
  const periodTargetBudget = groupBy === 'week' ? goal.dailyCaloriesKcal * 7 : goal.dailyCaloriesKcal;
  const maxCalorieScale = useMemo(() => {
    const maxVal = Math.max(periodTargetBudget, ...activeTrend.map((p) => p.consumedKcal));
    return Math.max(periodTargetBudget * 1.25, maxVal * 1.15 || 2600);
  }, [activeTrend, periodTargetBudget]);

  // Aggregated totals strictly for the filtered time horizon
  const totalCalories = filteredMeals.reduce((acc, m) => acc + (m.nutrition?.caloriesKcal || 0), 0);
  const totalProtein = filteredMeals.reduce((acc, m) => acc + (m.nutrition?.proteinG || 0), 0);
  const totalCarbs = filteredMeals.reduce((acc, m) => acc + (m.nutrition?.carbsG || 0), 0);
  const totalFat = filteredMeals.reduce((acc, m) => acc + (m.nutrition?.fatG || 0), 0);

  // Compile unique micronutrient names from filtered meals
  const micronutrientMap: Record<string, { total: number; unit: string; countRecorded: number }> = {};
  filteredMeals.forEach((meal) => {
    if (meal.micronutrients) {
      meal.micronutrients.forEach((micro) => {
        if (!micronutrientMap[micro.name]) {
          micronutrientMap[micro.name] = { total: 0, unit: micro.unit, countRecorded: 0 };
        }
        micronutrientMap[micro.name].total += micro.amount;
        micronutrientMap[micro.name].countRecorded += 1;
      });
    }
  });

  const trackedMicros = Object.entries(micronutrientMap).map(([name, data]) => ({
    name,
    amount: data.total,
    unit: data.unit,
    recordedIn: data.countRecorded,
  }));

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Aggregated Analytics &amp; Trends</div>
          <h1 className="calories-greeting-title">Nutritional Reports</h1>
          <p className="calories-greeting-subtext">
            Longitudinal analysis of calorie trends, macronutrient ratios, micronutrient density, and goal-vs-actual adherence for {fullRangeTitle}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="reports" size={16} />}
            onClick={() =>
              exportNutritionReportPdf({
                userProfile,
                goal,
                meals: filteredMeals,
                weeklyTrend: activeTrend,
                dateRangeLabel: `${fullRangeTitle} (${groupBy === 'week' ? 'Weekly' : 'Daily'} Breakdown)`,
              })
            }
          >
            Export Report (PDF)
          </Button>

          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week')}
            options={[
              { value: 'day', label: 'Group by Day' },
              { value: 'week', label: 'Group by Week' },
            ]}
          />
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7days', label: 'Last 7 Days' },
              { value: '14days', label: 'Last 14 Days' },
              { value: '30days', label: 'Last 30 Days' },
            ]}
          />
        </div>
      </div>

      {/* Goal vs Actual Comparison Grid */}
      <div className="calories-grid-two">
        {/* Goal vs Actual Adherence Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="reports" size={24} />
                <CardTitle>Goal vs. Actual Adherence</CardTitle>
              </div>
              <Badge variant="forest">{horizonLabel} Horizon</Badge>
            </div>
            <CardDescription>
              {fullRangeTitle} total: {totalCalories.toLocaleString()} kcal consumed ({filteredMeals.length} meal{filteredMeals.length === 1 ? '' : 's'})
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Calories */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Energy Budget (kcal)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalCalories.toLocaleString()} / {(goal.dailyCaloriesKcal * daysCount).toLocaleString()} kcal ({Math.round((totalCalories / ((goal.dailyCaloriesKcal * daysCount) || 1)) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalCalories}
                  max={goal.dailyCaloriesKcal * daysCount}
                  variant={totalCalories > goal.dailyCaloriesKcal * daysCount ? 'amber' : 'forest'}
                />
              </div>

              {/* Protein */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Protein (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalProtein} / {goal.proteinGrams * daysCount}g ({Math.round((totalProtein / ((goal.proteinGrams * daysCount) || 1)) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalProtein}
                  max={goal.proteinGrams * daysCount}
                  variant="forest"
                />
              </div>

              {/* Carbs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Carbohydrates (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalCarbs} / {goal.carbohydrateGrams * daysCount}g ({Math.round((totalCarbs / ((goal.carbohydrateGrams * daysCount) || 1)) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalCarbs}
                  max={goal.carbohydrateGrams * daysCount}
                  variant="sage"
                />
              </div>

              {/* Fat */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Fat (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalFat} / {goal.fatGrams * daysCount}g ({Math.round((totalFat / ((goal.fatGrams * daysCount) || 1)) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalFat}
                  max={goal.fatGrams * daysCount}
                  variant="amber"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Computed dynamically for {fullRangeTitle} ({filteredMeals.length} recorded meal{filteredMeals.length === 1 ? '' : 's'})
            </span>
          </CardFooter>
        </Card>

        {/* Dynamic Trend Bar Chart Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="calendar" size={24} />
                <CardTitle>{horizonLabel} Historical Intake</CardTitle>
              </div>
              <Badge variant="sage">{horizonLabel} Horizon • {groupBy === 'week' ? 'Weekly' : 'Daily'}</Badge>
            </div>
            <CardDescription>
              {groupBy === 'week' ? 'Weekly' : 'Daily'} consumed calories vs {periodTargetBudget.toLocaleString()} kcal target budget
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="calories-trend-chart-container" style={{ height: '180px', overflowX: 'auto', paddingBottom: '4px' }}>
              <div style={{ minWidth: groupBy === 'week' ? '100%' : daysCount > 14 ? '760px' : daysCount > 7 ? '540px' : '100%', position: 'relative', height: '100%' }}>
                <div className="calories-chart-target-line" style={{ bottom: `${Math.min((periodTargetBudget / maxCalorieScale) * 100, 95)}%` }}>
                  <span className="calories-target-line-tag">Budget: {periodTargetBudget.toLocaleString()} kcal</span>
                </div>
                <div className="calories-trend-bars-row">
                  {activeTrend.map((point, index) => {
                    const isToday = point.status === 'in_progress' || index === activeTrend.length - 1;
                    const heightPercent = Math.min(Math.round((point.consumedKcal / maxCalorieScale) * 100), 100);

                    return (
                      <div key={point.date} className="calories-trend-col" style={{ position: 'relative' }}>
                        {isToday && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'var(--color-forest-green, #285B46)',
                              color: '#ffffff',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 700,
                              gap: '3px',
                              boxShadow: '0 2px 6px rgba(40,91,70,0.3)',
                              zIndex: 15,
                              whiteSpace: 'nowrap',
                            }}
                            title="Current period / Today"
                          >
                            <Icon name="leaf" size={11} style={{ filter: 'brightness(0) invert(1)' }} />
                            <span>{groupBy === 'week' ? 'This Wk' : 'Today'}</span>
                          </div>
                        )}
                        <div className="calories-trend-bar-track">
                          <div
                            className="calories-trend-bar-fill"
                            style={{
                              height: `${heightPercent}%`,
                              backgroundColor: point.consumedKcal > periodTargetBudget + 100 ? 'var(--color-amber)' : 'var(--color-forest-green)',
                              outline: isToday ? '2px solid var(--color-forest-green, #285B46)' : 'none',
                              position: 'relative',
                            }}
                          >
                            {isToday && heightPercent >= 20 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  opacity: 0.9,
                                }}
                              >
                                <Icon name="leaf" size={10} style={{ filter: 'brightness(0) invert(1)' }} />
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`calories-trend-day-label ${isToday ? 'today' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: daysCount > 14 ? '9px' : '11px' }}>
                          {isToday && <Icon name="leaf" size={9} />}
                          {point.day}
                        </span>
                        <span className="calories-trend-kcal-label" style={{ fontSize: daysCount > 14 ? '9px' : '11px' }}>
                          {point.consumedKcal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="calories-chart-legend" style={{ marginTop: '12px' }}>
              <div className="calories-legend-item">
                <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-forest-green)' }} />
                <span>On Target</span>
              </div>
              <div className="calories-legend-item">
                <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-amber)' }} />
                <span>Over Budget</span>
              </div>
              <div className="calories-legend-item">
                <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--border-medium)' }} />
                <span>Empty / Zero</span>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Dynamically rendered for {fullRangeTitle} ({activeTrend.length} data point{activeTrend.length === 1 ? '' : 's'})
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* Honest Micronutrient Summary Card */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="vitamins" size={24} />
              <CardTitle>Tracked Micronutrient Summary ({horizonLabel})</CardTitle>
            </div>
            <Badge variant="neutral">Honest Absence Semantics</Badge>
          </div>
          <CardDescription>
            Only explicitly recorded micronutrients in {fullRangeTitle} are aggregated. Unmeasured nutrients are represented as unknown/unrecorded, not zero.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {trackedMicros.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--color-sand-soft)', borderRadius: 'var(--radius-md)' }}>
              No micronutrients have been recorded in {fullRangeTitle}. Log meals with vitamin/mineral disclosures to populate this table.
            </div>
          ) : (
            <div className="calories-journal-table-wrap">
              <table className="calories-journal-table">
                <thead>
                  <tr>
                    <th>Micronutrient</th>
                    <th>Aggregated Quantity</th>
                    <th>Explicit Unit</th>
                    <th>Meals Tracked</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trackedMicros.map((item) => (
                    <tr key={item.name}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {item.amount.toLocaleString()}
                      </td>
                      <td>
                        <Badge variant="neutral">{item.unit}</Badge>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {item.recordedIn} meal{item.recordedIn === 1 ? '' : 's'}
                      </td>
                      <td>
                        <Badge variant="forest">Recorded</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Aggregated from {filteredMeals.length} meal entries in {fullRangeTitle}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
};
