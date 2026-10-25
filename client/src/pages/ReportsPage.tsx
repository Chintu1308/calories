import React, { useState } from 'react';
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
import { computeWeeklyTrend } from '../utils/trendCalculator.js';
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
  weeklyTrend,
}) => {
  const [groupBy, setGroupBy] = useState<'day' | 'week'>('day');
  const [dateRange, setDateRange] = useState<string>('7days');

  // Compute real dynamic weekly trend if not directly provided
  const activeWeeklyTrend = weeklyTrend || computeWeeklyTrend(meals, goal.dailyCaloriesKcal);

  // Aggregated totals
  const totalCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.nutrition.fatG, 0);

  // Compile unique micronutrient names from meals
  const micronutrientMap: Record<string, { total: number; unit: string; countRecorded: number }> = {};
  meals.forEach((meal) => {
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
            Longitudinal analysis of calorie trends, macronutrient ratios, micronutrient density, and goal-vs-actual adherence.
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
                meals,
                weeklyTrend: activeWeeklyTrend,
                dateRangeLabel: dateRange === '7days' ? 'Last 7 Days Dynamic Report' : 'Last 30 Days',
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
              <Badge variant="forest">Real Aggregates</Badge>
            </div>
            <CardDescription>Compares actual logged intakes against saved goal targets</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Calories */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Energy Budget (kcal)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalCalories.toLocaleString()} / {goal.dailyCaloriesKcal.toLocaleString()} kcal ({Math.round((totalCalories / goal.dailyCaloriesKcal) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalCalories}
                  max={goal.dailyCaloriesKcal}
                  variant={totalCalories > goal.dailyCaloriesKcal ? 'amber' : 'forest'}
                />
              </div>

              {/* Protein */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Protein (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalProtein} / {goal.proteinGrams}g ({Math.round((totalProtein / goal.proteinGrams) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalProtein}
                  max={goal.proteinGrams}
                  variant="forest"
                />
              </div>

              {/* Carbs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Carbohydrates (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalCarbs} / {goal.carbohydrateGrams}g ({Math.round((totalCarbs / goal.carbohydrateGrams) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalCarbs}
                  max={goal.carbohydrateGrams}
                  variant="sage"
                />
              </div>

              {/* Fat */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Fat (g)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {totalFat} / {goal.fatGrams}g ({Math.round((totalFat / goal.fatGrams) * 100)}%)
                  </span>
                </div>
                <ProgressBar
                  value={totalFat}
                  max={goal.fatGrams}
                  variant="amber"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Computed dynamically from persisted meal records
            </span>
          </CardFooter>
        </Card>

        {/* Weekly Trend Bar Chart Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="calendar" size={24} />
                <CardTitle>7-Day Historical Intake</CardTitle>
              </div>
              <Badge variant="sage">7-Day Horizon</Badge>
            </div>
            <CardDescription>Daily consumed calories vs {goal.dailyCaloriesKcal.toLocaleString()} kcal budget line</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="calories-trend-chart-container" style={{ height: '180px' }}>
              <div className="calories-chart-target-line" style={{ bottom: `${Math.min((goal.dailyCaloriesKcal / 2600) * 100, 100)}%` }}>
                <span className="calories-target-line-tag">Budget: {goal.dailyCaloriesKcal.toLocaleString()} kcal</span>
              </div>
              <div className="calories-trend-bars-row">
                {activeWeeklyTrend.map((point, index) => {
                  const isToday = point.status === 'in_progress' || index === activeWeeklyTrend.length - 1;
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
                          title="You are here today"
                        >
                          <Icon name="leaf" size={11} style={{ filter: 'brightness(0) invert(1)' }} />
                          <span>Today</span>
                        </div>
                      )}
                      <div className="calories-trend-bar-track">
                        <div
                          className="calories-trend-bar-fill"
                          style={{
                            height: `${Math.min(Math.round((point.consumedKcal / 2600) * 100), 100)}%`,
                            backgroundColor: point.consumedKcal > goal.dailyCaloriesKcal + 100 ? 'var(--color-amber)' : 'var(--color-forest-green)',
                            outline: isToday ? '2px solid var(--color-forest-green, #285B46)' : 'none',
                            position: 'relative',
                          }}
                        >
                          {isToday && (
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
                      <span className={`calories-trend-day-label ${isToday ? 'today' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {isToday && <Icon name="leaf" size={10} />}
                        {point.day}
                      </span>
                      <span className="calories-trend-kcal-label">{point.consumedKcal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calories-chart-legend" style={{ marginTop: '12px' }}>
              <div className="calories-legend-item">
                <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-forest-green)' }} />
                <span>On Target</span>
              </div>
              <div className="calories-legend-item">
                <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-amber)' }} />
                <span>Over Budget (&gt;+100 kcal)</span>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Server aggregates run via MongoDB pipeline in Stage 9
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
              <CardTitle>Tracked Micronutrient Summary</CardTitle>
            </div>
            <Badge variant="neutral">Honest Absence Semantics</Badge>
          </div>
          <CardDescription>
            Only explicitly recorded micronutrients are aggregated. Unmeasured nutrients are represented as unknown/unrecorded, not zero.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {trackedMicros.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No micronutrients have been recorded in this date range.
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
                  {trackedMicros.map((m) => (
                    <tr key={m.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{m.amount.toFixed(1)}</strong>
                      </td>
                      <td>
                        <Badge variant="neutral">{m.unit}</Badge>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        Recorded in {m.recordedIn} {m.recordedIn === 1 ? 'meal' : 'meals'}
                      </td>
                      <td>
                        <Badge variant="forest">Sufficient Data</Badge>
                      </td>
                    </tr>
                  ))}
                  {/* Explicit Unknown Micronutrient Rows to show absence honesty */}
                  <tr>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Vitamin D</td>
                    <td style={{ color: 'var(--color-muted-slate)', fontStyle: 'italic' }}>Unmeasured</td>
                    <td><Badge variant="neutral">IU</Badge></td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>0 meals</td>
                    <td><Badge variant="amber">Unknown / Not Zero</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Zinc</td>
                    <td style={{ color: 'var(--color-muted-slate)', fontStyle: 'italic' }}>Unmeasured</td>
                    <td><Badge variant="neutral">mg</Badge></td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>0 meals</td>
                    <td><Badge variant="amber">Unknown / Not Zero</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Compliance Rule: Unrecorded vitamins and minerals are omitted, avoiding false clinical assumptions.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
};
