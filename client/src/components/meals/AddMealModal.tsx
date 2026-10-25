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
import { apiClient } from '../../api/apiClient.js';

export interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: MealType;
  defaultDateString?: string;
  initialMeal?: MealItem | null;
  onSaveMeal: (newMeal: MealItem) => void;
  onUpdateMeal?: (mealId: string, updatedFields: Partial<MealItem>) => void;
}

export type ModalEntryMode = 'manual' | 'ai';

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

function normalizeCategory(cat?: string): MealType {
  if (!cat) return 'Breakfast';
  const c = cat.toLowerCase();
  if (c.includes('lunch')) return 'Lunch';
  if (c.includes('dinner')) return 'Dinner';
  if (c.includes('snack')) return 'Snacks';
  if (c.includes('brunch')) return 'Breakfast';
  if (c.includes('breakfast')) return 'Breakfast';
  if (c.includes('intermediate')) return 'Intermediate';
  return 'Breakfast';
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
  const [entryMode, setEntryMode] = useState<ModalEntryMode>('manual');

  // Meal values
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

  // AI image states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    setAiSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image file must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Call backend Vision AI extraction
    setIsAnalyzing(true);
    apiClient
      .extractFromImage(file)
      .then((res) => {
        if (res.proposal.foodName) {
          setFoodName(res.proposal.foodName);
        }
        if (res.proposal.mealType) {
          setSelectedCategory(normalizeCategory(res.proposal.mealType));
        }
        setCalories(String(res.proposal.nutrition.caloriesKcal || ''));
        setProtein(String(res.proposal.nutrition.proteinG || '0'));
        setCarbs(String(res.proposal.nutrition.carbsG || '0'));
        setFat(String(res.proposal.nutrition.fatG || '0'));
        if (res.proposal.quantity?.amount) {
          setQuantity(String(res.proposal.quantity.amount));
        }
        if (res.proposal.quantity?.unit) {
          setUnit(res.proposal.quantity.unit);
        }
        setAiConfidence(res.proposal.confidence);
        const confPct = Math.round(res.proposal.confidence * 100);
        setAiSuccessMsg(`✨ Identified as "${res.proposal.foodName}" (${confPct}% confidence). Values auto-filled below!`);
      })
      .catch((err: unknown) => {
        console.warn('[AddMealModal] Vision AI notice:', err);
        setFormError('Could not auto-analyze image. You can still enter or adjust values manually below.');
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  };

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
    const qAmount = Math.max(0.01, Number(quantity) || 1);
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
        id: generateMealId(entryMode === 'ai' ? 'meal_ai' : 'meal_val'),
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
        source: entryMode === 'ai' ? 'ai' : 'manual',
        notes: notes.trim() || (entryMode === 'ai' ? 'Logged via AI Image Scan' : undefined),
      };

      onSaveMeal(newMeal);
    }

    onClose();
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-log-title">
      <div className="calories-modal-card">
        {/* Header */}
        <div className="calories-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name={isEditing ? 'meals' : entryMode === 'ai' ? 'camera' : 'plus'} size={20} />
            <div>
              <h3 id="modal-log-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                {isEditing
                  ? 'Edit Meal Entry'
                  : entryMode === 'ai'
                  ? 'Log Meal with AI Image'
                  : 'Log Meal — Enter Values'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {isEditing
                  ? 'Update food name, portion, or nutritional values'
                  : entryMode === 'ai'
                  ? 'Snap a plate photo or upload an image. AI extracts values for your review.'
                  : 'Enter the food name and nutritional values directly.'}
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

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div className="calories-modal-body">
            {/* Mode Switcher Tabs (Only shown when adding new meal) */}
            {!isEditing && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '4px',
                  backgroundColor: 'var(--color-sand-soft)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '6px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setEntryMode('manual')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: entryMode === 'manual' ? 700 : 500,
                    backgroundColor: entryMode === 'manual' ? 'var(--surface-card)' : 'transparent',
                    color: entryMode === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: entryMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Icon name="plus" size={14} />
                  <span>Enter Values Directly</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMode('ai')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: entryMode === 'ai' ? 700 : 500,
                    backgroundColor: entryMode === 'ai' ? 'var(--surface-card)' : 'transparent',
                    color: entryMode === 'ai' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                    boxShadow: entryMode === 'ai' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Icon name="camera" size={14} />
                  <span>AI Image Scan</span>
                  <Badge variant="forest" style={{ fontSize: '10px', padding: '1px 5px' }}>AI</Badge>
                </button>
              </div>
            )}

            {formError && (
              <div className="calories-form-error-box" role="alert">
                {formError}
              </div>
            )}

            {aiSuccessMsg && (
              <div
                style={{
                  backgroundColor: 'var(--color-sage-soft)',
                  border: '1px solid rgba(40, 91, 70, 0.25)',
                  color: 'var(--color-forest-green)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            {/* AI Photo Dropzone (When in AI mode) */}
            {entryMode === 'ai' && (
              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: photoPreview ? '10px' : '16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-sand-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {photoPreview ? (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '160px', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                    <img
                      src={photoPreview}
                      alt="Meal Preview"
                      style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                    {aiConfidence && (
                      <Badge variant="forest" style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                        {Math.round(aiConfidence * 100)}% Match
                      </Badge>
                    )}
                  </div>
                ) : (
                  <>
                    <Icon name="camera" size={30} />
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '4px' }}>
                      Snap a photo or upload dish picture
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Supports JPEG, PNG, or WebP up to 5MB
                    </div>
                  </>
                )}

                <input
                  type="file"
                  id="ai-modal-photo-input"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => document.getElementById('ai-modal-photo-input')?.click()}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing with AI...' : photoPreview ? 'Change Picture' : 'Select / Snap Picture'}
                </Button>

                {isAnalyzing && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-forest-green)', fontWeight: 600, marginTop: '6px' }}>
                    ✨ Google Gemini AI analyzing dish calories &amp; macros...
                  </div>
                )}
              </div>
            )}

            {/* Category and Dish Name */}
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
                  disabled={isAnalyzing}
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
                  placeholder={entryMode === 'ai' ? 'Waiting for AI or enter name...' : 'e.g. Masala Dosa, Chicken Salad'}
                  autoFocus={entryMode === 'manual'}
                  disabled={isAnalyzing}
                />
              </FormField>
            </div>

            {/* Portion and Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label="Portion Amount" htmlFor="log-quantity" required={true}>
                <Input
                  id="log-quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 1, 2, 5"
                  disabled={isAnalyzing}
                />
              </FormField>
              <FormField label="Portion Unit" htmlFor="log-unit" required={true}>
                <Input
                  id="log-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. serving, piece, bowl, g"
                  disabled={isAnalyzing}
                />
              </FormField>
            </div>

            {/* Macronutrient Values Box */}
            <div
              style={{
                background: 'var(--color-sand-soft)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-forest-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nutritional Breakdown
                </span>
                <Badge variant={entryMode === 'ai' ? 'forest' : 'neutral'}>
                  {entryMode === 'ai' ? 'AI Proposed' : 'Direct Values'}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <FormField label="Calories *" htmlFor="log-cal">
                  <Input
                    id="log-cal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    required={true}
                    disabled={isAnalyzing}
                  />
                </FormField>
                <FormField label="Protein (g)" htmlFor="log-prot">
                  <Input
                    id="log-prot"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 25"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </FormField>
                <FormField label="Carbs (g)" htmlFor="log-carb">
                  <Input
                    id="log-carb"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 40"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </FormField>
                <FormField label="Fat (g)" htmlFor="log-fat">
                  <Input
                    id="log-fat"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 12"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    disabled={isAnalyzing}
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
                placeholder="e.g. Homemade, lightly salted, with extra sambar"
                disabled={isAnalyzing}
              />
            </FormField>
          </div>

          {/* Modal Actions Footer (Always Pinned) */}
          <div className="calories-modal-footer">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={isAnalyzing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isAnalyzing}
              leftIcon={<Icon name={isEditing ? 'check' : entryMode === 'ai' ? 'leaf' : 'plus'} size={16} />}
            >
              {isAnalyzing
                ? 'Analyzing...'
                : isEditing
                ? 'Save Changes'
                : entryMode === 'ai'
                ? '✓ Log AI Meal to Diary'
                : '+ Add Meal'}
            </Button>
          </div>
        </form>
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
