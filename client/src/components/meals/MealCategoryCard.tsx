import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Icon,
} from '../ui/index.js';
import type { MealItem, MealType } from '../../types/nutrition.js';

export interface MealCategoryCardProps {
  category: MealType;
  meals: MealItem[];
  onAddMeal: (category: MealType) => void;
}

export const MealCategoryCard: React.FC<MealCategoryCardProps> = ({
  category,
  meals,
  onAddMeal,
}) => {
  // Compute subtotals for this category
  const totalCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.nutrition.fatG, 0);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Card className="calories-meal-category-card">
      <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="meals" size={20} />
            <CardTitle style={{ fontSize: 'var(--text-base)' }}>{category}</CardTitle>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              ({meals.length} {meals.length === 1 ? 'item' : 'items'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalCalories} kcal
            </span>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="plus" size={14} />}
              onClick={() => onAddMeal(category)}
              aria-label={`Add item to ${category}`}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Subtotal Macro Breakdown Bar */}
        {meals.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>P: <strong style={{ color: 'var(--color-forest-green)' }}>{totalProtein}g</strong></span>
            <span>C: <strong style={{ color: 'var(--color-ink-navy)' }}>{totalCarbs}g</strong></span>
            <span>F: <strong style={{ color: 'var(--color-amber)' }}>{totalFat}g</strong></span>
          </div>
        )}
      </CardHeader>

      <CardContent style={{ paddingTop: 'var(--space-2)' }}>
        {meals.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
            No meals logged for {category}. Click "+ Add" to log your first item.
          </div>
        ) : (
          <div className="calories-meal-items-list">
            {meals.map((meal) => (
              <div key={meal.id || (meal as any)._id} className="calories-meal-item-row">
                <div className="calories-meal-item-main">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="calories-meal-name">{meal.foodName}</span>
                    <span className="calories-meal-qty">
                      {meal.quantity.amount} {meal.quantity.unit}
                    </span>
                    <span className="calories-meal-time">{formatTime(meal.eatenAt)}</span>
                  </div>

                  {/* Notes & Micronutrients */}
                  {(meal.notes || (meal.micronutrients && meal.micronutrients.length > 0)) && (
                    <div className="calories-meal-meta-line">
                      {meal.notes && <span className="calories-meal-note">{meal.notes}</span>}
                      {meal.micronutrients && meal.micronutrients.length > 0 && (
                        <div className="calories-micronutrient-pills">
                          {meal.micronutrients.map((micro) => (
                            <span key={micro.name} className="calories-micro-pill">
                              {micro.name}: {micro.amount}{micro.unit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="calories-meal-item-end">
                  <div className="calories-meal-nutrition-pills">
                    <span className="calories-meal-kcal">{meal.nutrition.caloriesKcal} kcal</span>
                    <span className="calories-meal-macro-text">
                      P: {meal.nutrition.proteinG}g · C: {meal.nutrition.carbsG}g · F: {meal.nutrition.fatG}g
                    </span>
                  </div>
                  <Badge
                    variant={meal.source === 'ai' ? 'forest' : 'neutral'}
                    style={{ fontSize: '10px', height: '20px' }}
                  >
                    {meal.source === 'ai' ? 'AI Extracted' : 'Manual'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
