import React from 'react';
import { Card, CardContent, Button, Icon, Skeleton } from '../ui/index.js';
import { MealCategoryCard } from './MealCategoryCard.js';
import { WaterCategoryCard } from './WaterCategoryCard.js';
import { SupplementCategoryCard } from './SupplementCategoryCard.js';
import type { MealItem, MealType, WaterLogEntry, SupplementItem, SupplementLogEntry } from '../../types/nutrition.js';

export interface MealTimelineProps {
  meals: MealItem[];
  isLoading?: boolean;
  dateLabel?: string;
  onAddMeal: (category: MealType) => void;
  onEditMeal?: (meal: MealItem) => void;
  onDeleteMeal?: (mealId: string) => void;
  onOpenAIScan: () => void;
  // Water Category & Tracking
  waterLogs?: WaterLogEntry[];
  targetWaterMl?: number;
  onLogWater?: (amountMl: number, note?: string) => void;
  onDeleteWaterLog?: (id: string) => void;
  // Supplement Category & Tracking
  userSupplements?: SupplementItem[];
  supplementLogs?: SupplementLogEntry[];
  onToggleSupplement?: (supplement: SupplementItem) => void;
  onAddSupplement?: () => void;
}

export const MealTimeline: React.FC<MealTimelineProps> = ({
  meals,
  isLoading = false,
  dateLabel,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onOpenAIScan,
  waterLogs,
  targetWaterMl = 3000,
  onLogWater,
  onDeleteWaterLog,
  userSupplements,
  supplementLogs,
  onToggleSupplement,
  onAddSupplement,
}) => {
  const standardCategories: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const extraCategories = Array.from(
    new Set(meals.map((m) => m.mealType).filter((cat) => !standardCategories.includes(cat)))
  );
  const categories: MealType[] = [...standardCategories, ...extraCategories];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton width="100%" height="90px" />
        <Skeleton width="100%" height="90px" />
        <Skeleton width="100%" height="90px" />
        <Skeleton width="100%" height="90px" />
      </div>
    );
  }

  const totalCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 className="calories-section-title">{dateLabel ? `${dateLabel} Timeline` : "Daily Meal Timeline"}</h2>
          <p className="calories-section-subtitle">
            {meals.length} {meals.length === 1 ? 'entry' : 'entries'} logged · Total: {totalCalories.toLocaleString()} kcal
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="leaf" size={14} />}
            onClick={onOpenAIScan}
          >
            AI Scan
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" size={14} />}
            onClick={() => onAddMeal('Breakfast')}
          >
            + Add Meal
          </Button>
        </div>
      </div>

      {/* Meals Category Section */}
      {meals.length === 0 ? (
        <Card className="calories-empty-state-card">
          <CardContent style={{ padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-sand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="meals" size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                No meals recorded for this day
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '380px' }}>
                Your food timeline is empty for this day. Log a meal manually or snap a plate photo using AI scan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Icon name="plus" size={14} />}
                onClick={() => onAddMeal('Breakfast')}
              >
                Log Meal Manually
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="leaf" size={14} />}
                onClick={onOpenAIScan}
              >
                Scan with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {categories.map((cat) => {
            const categoryMeals = meals.filter((m) => m.mealType === cat);
            return (
              <MealCategoryCard
                key={cat}
                category={cat}
                meals={categoryMeals}
                onAddMeal={onAddMeal}
                onEditMeal={onEditMeal}
                onDeleteMeal={onDeleteMeal}
              />
            );
          })}
        </div>
      )}

      {/* 2. Water & Hydration Category */}
      {onLogWater && onDeleteWaterLog && (
        <WaterCategoryCard
          waterLogs={waterLogs || []}
          targetWaterMl={targetWaterMl}
          onLogWater={onLogWater}
          onDeleteWaterLog={onDeleteWaterLog}
        />
      )}

      {/* 3. Daily Supplements Category */}
      {onToggleSupplement && userSupplements && (
        <SupplementCategoryCard
          userSupplements={userSupplements}
          supplementLogs={supplementLogs || []}
          onToggleSupplement={onToggleSupplement}
          onAddSupplement={onAddSupplement}
        />
      )}
    </div>
  );
};
