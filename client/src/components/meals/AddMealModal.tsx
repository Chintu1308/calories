import React, { useState } from 'react';
import {
  Button,
  Badge,
  Input,
  Select,
  FormField,
  Icon,
} from '../ui/index.js';
import type { MealItem, MealType } from '../../types/nutrition.js';

export interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: MealType;
  defaultDateString?: string;
  initialMeal?: MealItem | null;
  onSaveMeal: (newMeal: MealItem) => void;
  onUpdateMeal?: (mealId: string, updatedFields: Partial<MealItem>) => void;
}

function generateMealId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function getIsoTimestamp(dateString?: string): string {
  if (!dateString) return new Date().toISOString();
  try {
    const parts = dateString.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const now = new Date();
      const target = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      return target.toISOString();
    }
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

const AddMealForm: React.FC<AddMealModalProps> = ({
  onClose,
  defaultCategory = 'Breakfast',
  defaultDateString,
  initialMeal,
  onSaveMeal,
  onUpdateMeal,
}) => {
  const isEditing = Boolean(initialMeal);
  const [selectedCategory, setSelectedCategory] = useState<MealType>(
    initialMeal?.mealType || defaultCategory
  );
  const [foodName, setFoodName] = useState(initialMeal?.foodName || '');
  const [quantity, setQuantity] = useState(String(initialMeal?.quantity?.amount ?? 1));
  const [unit, setUnit] = useState(initialMeal?.quantity?.unit || 'serving');
  const [calories, setCalories] = useState(
    initialMeal ? String(initialMeal.nutrition?.caloriesKcal ?? '') : ''
  );
  const [protein, setProtein] = useState(
    initialMeal ? String(initialMeal.nutrition?.proteinG ?? '') : ''
  );
  const [carbs, setCarbs] = useState(
    initialMeal ? String(initialMeal.nutrition?.carbsG ?? '') : ''
  );
  const [fat, setFat] = useState(
    initialMeal ? String(initialMeal.nutrition?.fatG ?? '') : ''
  );
  const [notes, setNotes] = useState(initialMeal?.notes || '');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!foodName.trim()) {
      setFormError('Food name is required.');
      return;
    }

    const cal = Number(calories);
    if (!calories || isNaN(cal) || cal <= 0) {
      setFormError('Please enter a valid positive calorie amount.');
      return;
    }

    const p = Math.max(0, Number(protein) || 0);
    const c = Math.max(0, Number(carbs) || 0);
    const f = Math.max(0, Number(fat) || 0);
    const qAmount = Math.max(0.1, Number(quantity) || 1);
    const qUnit = unit.trim() || 'serving';

    if (isEditing && initialMeal && onUpdateMeal) {
      const mealId = initialMeal.id || (initialMeal as any)._id;
      onUpdateMeal(mealId, {
        foodName: foodName.trim(),
        mealType: selectedCategory,
        quantity: {
          amount: qAmount,
          unit: qUnit,
        },
        nutrition: {
          caloriesKcal: cal,
          proteinG: p,
          carbsG: c,
          fatG: f,
        },
        notes: notes.trim() || undefined,
      });
    } else {
      const newMeal: MealItem = {
        id: generateMealId('meal_val'),
        userId: '',
        foodName: foodName.trim(),
        mealType: selectedCategory,
        eatenAt: getIsoTimestamp(defaultDateString),
        quantity: {
          amount: qAmount,
          unit: qUnit,
        },
        nutrition: {
          caloriesKcal: cal,
          proteinG: p,
          carbsG: c,
          fatG: f,
        },
        source: 'manual',
        notes: notes.trim() || undefined,
      };

      onSaveMeal(newMeal);
    }

    onClose();
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-log-title">
      <div className="calories-modal-card" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="calories-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name={isEditing ? 'meals' : 'plus'} size={20} />
            <div>
              <h3 id="modal-log-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                {isEditing ? 'Edit Meal Entry' : 'Log Food — Enter Values'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {isEditing
                  ? 'Update food name, portion, or nutritional values'
                  : 'Enter the food name and nutritional values directly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="calories-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="calories-modal-body">
          {formError && (
            <div className="calories-form-error-box" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label="Meal Category" htmlFor="log-category" required={true}>
                <Select
                  id="log-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as MealType)}
                  options={[
                    { value: 'Breakfast', label: 'Breakfast' },
                    { value: 'Lunch', label: 'Lunch' },
                    { value: 'Dinner', label: 'Dinner' },
                    { value: 'Snacks', label: 'Snacks' },
                    { value: 'Brunch', label: 'Brunch' },
                    { value: 'Intermediate', label: 'Intermediate' },
                  ]}
                />
              </FormField>

              <FormField
                label="Food Item Name"
                htmlFor="log-food-name"
                required={true}
              >
                <Input
                  id="log-food-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Masala Dosa, Chicken Salad"
                  autoFocus={true}
                />
              </FormField>
            </div>

            {/* Portion and Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label="Portion Amount" htmlFor="log-quantity" required={true}>
                <Input
                  id="log-quantity"
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 1, 2"
                />
              </FormField>
              <FormField label="Portion Unit" htmlFor="log-unit" required={true}>
                <Input
                  id="log-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. serving, piece, bowl, g"
                />
              </FormField>
            </div>

            {/* Macronutrient Values Box */}
            <div
              style={{
                background: 'var(--color-sand-soft)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-forest-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nutritional Breakdown
                </span>
                <Badge variant="forest">Direct Values</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <FormField label="Calories *" htmlFor="log-cal">
                  <Input
                    id="log-cal"
                    type="number"
                    placeholder="e.g. 450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    required={true}
                  />
                </FormField>
                <FormField label="Protein (g)" htmlFor="log-prot">
                  <Input
                    id="log-prot"
                    type="number"
                    placeholder="e.g. 25"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </FormField>
                <FormField label="Carbs (g)" htmlFor="log-carb">
                  <Input
                    id="log-carb"
                    type="number"
                    placeholder="e.g. 40"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </FormField>
                <FormField label="Fat (g)" htmlFor="log-fat">
                  <Input
                    id="log-fat"
                    type="number"
                    placeholder="e.g. 12"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            {/* Notes */}
            <FormField label="Notes (Optional)" htmlFor="log-notes">
              <Input
                id="log-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Homemade, with extra sambar, sugar-free"
              />
            </FormField>

            {/* Modal Actions */}
            <div className="calories-modal-footer" style={{ marginTop: '8px' }}>
              <Button variant="ghost" size="md" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                leftIcon={<Icon name="check" size={16} />}
              >
                {isEditing ? 'Save Changes' : '+ Add Meal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const AddMealModal: React.FC<AddMealModalProps> = (props) => {
  if (!props.isOpen) return null;

  const contentKey = props.initialMeal
    ? `edit-${props.initialMeal.id || (props.initialMeal as any)._id}`
    : `new-${props.defaultCategory || 'default'}`;

  return <AddMealForm key={contentKey} {...props} />;
};
