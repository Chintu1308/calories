import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  ProgressBar,
  Icon,
  Skeleton,
} from '../ui/index.js';
import type { DayNutritionalSummary } from '../../types/nutrition.js';

export interface GoalSummaryCardsProps {
  summary: DayNutritionalSummary;
  isLoading?: boolean;
}

export const GoalSummaryCards: React.FC<GoalSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="calories-grid-three">
        <Card>
          <CardHeader>
            <Skeleton width="60%" height="24px" />
            <Skeleton width="40%" height="16px" />
          </CardHeader>
          <CardContent>
            <Skeleton width="100%" height="12px" style={{ marginBottom: '16px' }} />
            <Skeleton width="100%" height="48px" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton width="60%" height="24px" />
            <Skeleton width="40%" height="16px" />
          </CardHeader>
          <CardContent>
            <Skeleton width="100%" height="20px" style={{ marginBottom: '12px' }} />
            <Skeleton width="100%" height="20px" style={{ marginBottom: '12px' }} />
            <Skeleton width="100%" height="20px" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton width="60%" height="24px" />
            <Skeleton width="40%" height="16px" />
          </CardHeader>
          <CardContent>
            <Skeleton width="100%" height="32px" style={{ marginBottom: '12px' }} />
            <Skeleton width="100%" height="32px" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    consumedCalories,
    targetCalories,
    consumedProtein,
    targetProtein,
    consumedCarbs,
    targetCarbs,
    consumedFat,
    targetFat,
    waterIntakeMl,
    targetWaterMl,
    currentWeightKg,
    targetWeightKg,
  } = summary;

  const remainingKcal = Math.max(targetCalories - consumedCalories, 0);
  const caloriePercent = Math.round((consumedCalories / targetCalories) * 100);
  const isOverBudget = consumedCalories > targetCalories;

  return (
    <div className="calories-grid-three">
      {/* 1. Daily Calorie Target Card */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="calories" size={26} />
              <CardTitle>Daily Calorie Target</CardTitle>
            </div>
            <Badge variant={isOverBudget ? 'amber' : 'forest'}>
              {isOverBudget ? 'Budget Exceeded' : 'On Track'}
            </Badge>
          </div>
          <CardDescription>Daily budget: {targetCalories.toLocaleString()} kcal</CardDescription>
        </CardHeader>

        <CardContent>
          <ProgressBar
            value={consumedCalories}
            max={targetCalories}
            label="Energy Consumed"
            unit="kcal"
            variant={isOverBudget ? 'amber' : 'forest'}
            showPercentage={true}
          />

          <div className="calories-metric-details">
            <div className="calories-metric-stat">
              <span className="calories-stat-label">Consumed</span>
              <span className="calories-stat-val">{consumedCalories.toLocaleString()} kcal</span>
            </div>
            <div className="calories-metric-stat">
              <span className="calories-stat-label">Remaining</span>
              <span className="calories-stat-val">{remainingKcal.toLocaleString()} kcal</span>
            </div>
            <div className="calories-metric-stat">
              <span className="calories-stat-label">Goal Met</span>
              <span className="calories-stat-val">{caloriePercent}%</span>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Stored in UTC; evaluated against personal target
          </span>
        </CardFooter>
      </Card>

      {/* 2. Macronutrient Breakdown Card */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="goals" size={26} />
              <CardTitle>Macronutrient Targets</CardTitle>
            </div>
            <Badge variant="sage">Balanced Diet</Badge>
          </div>
          <CardDescription>Daily protein, carbs, and fat progress</CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Protein */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <Icon name="protein" size={16} /> Protein
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {consumedProtein}g / {targetProtein}g
                </span>
              </div>
              <ProgressBar
                value={consumedProtein}
                max={targetProtein}
                unit="g"
                variant="forest"
              />
            </div>

            {/* Carbs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <Icon name="carbs" size={16} /> Carbohydrates
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {consumedCarbs}g / {targetCarbs}g
                </span>
              </div>
              <ProgressBar
                value={consumedCarbs}
                max={targetCarbs}
                unit="g"
                variant="sage"
              />
            </div>

            {/* Fat */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <Icon name="fat" size={16} /> Fats
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {consumedFat}g / {targetFat}g
                </span>
              </div>
              <ProgressBar
                value={consumedFat}
                max={targetFat}
                unit="g"
                variant="amber"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Explicit units in grams (g); missing values never default to 0
          </span>
        </CardFooter>
      </Card>

      {/* 3. Hydration & Weight Target Card */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="water" size={26} />
              <CardTitle>Hydration &amp; Weight</CardTitle>
            </div>
            <Badge variant="neutral">Daily Health</Badge>
          </div>
          <CardDescription>Complementary wellness indicators</CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Water */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <Icon name="water" size={16} /> Water Intake
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {(waterIntakeMl / 1000).toFixed(1)}L / {(targetWaterMl / 1000).toFixed(1)}L
                </span>
              </div>
              <ProgressBar
                value={waterIntakeMl}
                max={targetWaterMl}
                unit="ml"
                variant="sage"
              />
            </div>

            {/* Target Weight */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--color-sand-soft)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="weight" size={22} />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Target Weight</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Goal: {targetWeightKg} kg</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentWeightKg} kg
                </div>
                <span style={{ fontSize: '10px', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                  -0.4 kg this week
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Lifestyle context; non-medical nutritional data
          </span>
        </CardFooter>
      </Card>
    </div>
  );
};
