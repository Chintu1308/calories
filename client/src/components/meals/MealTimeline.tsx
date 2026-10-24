import React from 'react';
import { Card, CardContent, Button, Icon, Skeleton } from '../ui/index.js';
import { MealCategoryCard } from './MealCategoryCard.js';
import type { MealItem, MealType } from '../../types/nutrition.js';

export interface MealTimelineProps {
  meals: MealItem[];
  isLoading?: boolean;
  dateLabel?: string;
  onAddMeal: (category: MealType) => void;
  onOpenAIScan: () => void;
}

export const MealTimeline: React.FC<MealTimelineProps> = ({
  meals,
  isLoading = false,
  dateLabel,
  onAddMeal,
  onOpenAIScan,
}) => {
  const categories: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

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

  if (meals.length === 0) {
    return (
      <Card className="calories-empty-state-card">
        <CardContent style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="meals" size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              No meals recorded for this day
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '400px' }}>
              Your meal timeline is empty. Log a meal manually or snap a photo of your food/nutrition label using our AI extraction tool.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              leftIcon={<Icon name="plus" size={16} />}
              onClick={() => onAddMeal('Breakfast')}
            >
              Log Meal Manually
            </Button>
            <Button
              variant="outline"
              leftIcon={<Icon name="ai-scan" size={16} />}
              onClick={onOpenAIScan}
            >
              Scan Food with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            leftIcon={<Icon name="ai-scan" size={14} />}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {categories.map((cat) => {
          const categoryMeals = meals.filter((m) => m.mealType === cat);
          return (
            <MealCategoryCard
              key={cat}
              category={cat}
              meals={categoryMeals}
              onAddMeal={onAddMeal}
            />
          );
        })}
      </div>
    </div>
  );
};
