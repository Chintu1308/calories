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
  onSaveMeal: (newMeal: MealItem) => void;
}

export type LogMealMethod = 'choice' | 'photo' | 'manual';

function generateMealId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export const AddMealModal: React.FC<AddMealModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'Breakfast',
  onSaveMeal,
}) => {
  const [method, setMethod] = useState<LogMealMethod>('choice');
  const [selectedCategory, setSelectedCategory] = useState<MealType>(defaultCategory);

  // Common & Manual fields
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [notes, setNotes] = useState('');

  // Photo-specific fields
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image file must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      setFormError('');
    };
    reader.readAsDataURL(file);

    // Call AI vision extraction to prefill nutritional estimates
    setIsAnalyzingPhoto(true);
    apiClient
      .extractFromImage(file)
      .then((res) => {
        if (res.proposal.foodName) {
          setFoodName(res.proposal.foodName);
        }
        if (res.proposal.mealType) {
          setSelectedCategory(res.proposal.mealType);
        }
        setCalories(String(res.proposal.nutrition.caloriesKcal));
        setProtein(String(res.proposal.nutrition.proteinG));
        setCarbs(String(res.proposal.nutrition.carbsG));
        setFat(String(res.proposal.nutrition.fatG));
      })
      .catch((err: unknown) => {
        console.warn('AI photo analysis notice:', err);
      })
      .finally(() => {
        setIsAnalyzingPhoto(false);
      });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
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

    const newMeal: MealItem = {
      id: generateMealId('meal_man'),
      userId: '',
      foodName: foodName.trim(),
      mealType: selectedCategory,
      eatenAt: getIsoTimestamp(),
      quantity: {
        amount: Number(quantity) || 1,
        unit: unit || 'serving',
      },
      nutrition: {
        caloriesKcal: cal,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
      },
      source: 'manual',
      notes: notes.trim() || undefined,
    };

    onSaveMeal(newMeal);
    resetAndClose();
  };

  const handlePhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) {
      setFormError('Please enter the name of the dish.');
      return;
    }

    // Nutrition values extracted from photo or adjusted by user
    const cal = Number(calories) || 0;
    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fat) || 0;

    if (!cal || cal <= 0) {
      setFormError('Please enter estimated calories or wait for AI analysis to finish.');
      return;
    }

    const newMeal: MealItem = {
      id: generateMealId('meal_photo'),
      userId: '',
      foodName: foodName.trim(),
      mealType: selectedCategory,
      eatenAt: getIsoTimestamp(),
      quantity: {
        amount: 1,
        unit: 'serving',
      },
      nutrition: {
        caloriesKcal: cal,
        proteinG: p,
        carbsG: c,
        fatG: f,
      },
      source: 'ai',
      notes: photoPreview
        ? `Logged via dish photo upload: ${foodName.trim()}`
        : 'Logged with dish snapshot',
    };

    onSaveMeal(newMeal);
    resetAndClose();
  };

  const resetAndClose = () => {
    setMethod('choice');
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPhotoPreview(null);
    setFormError('');
    onClose();
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-log-title">
      <div className="calories-modal-card" style={{ maxWidth: method === 'choice' ? '540px' : '580px' }}>
        {/* Header */}
        <div className="calories-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="plus" size={20} />
            <h3 id="modal-log-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              {method === 'choice' && 'Log Food — Choose Option'}
              {method === 'photo' && 'Take or Upload Photo'}
              {method === 'manual' && 'Manual Food Entry'}
            </h3>
          </div>
          <button
            type="button"
            className="calories-modal-close-btn"
            onClick={resetAndClose}
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

          {/* STEP 1: DUAL OPTION CHOICE VIEW */}
          {method === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                Select how you would like to log your meal to your Calories journal:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Option 1: Take a Photo */}
                <button
                  type="button"
                  onClick={() => setMethod('photo')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-medium)',
                    backgroundColor: 'var(--surface-card)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    gap: '12px',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="calories-choice-card"
                >
                  <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'var(--color-sage-soft)', color: 'var(--color-forest-green)' }}>
                    <Icon name="camera" size={32} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 'var(--text-base)', display: 'block', color: 'var(--text-primary)' }}>
                      Take / Upload Photo
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                      Snap a dish photo and enter dish name
                    </span>
                  </div>
                  <Badge variant="forest">Fast &amp; Visual</Badge>
                </button>

                {/* Option 2: Add Manually */}
                <button
                  type="button"
                  onClick={() => setMethod('manual')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-medium)',
                    backgroundColor: 'var(--surface-card)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    gap: '12px',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="calories-choice-card"
                >
                  <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'var(--color-sand-soft)', color: 'var(--action-primary)' }}>
                    <Icon name="meals" size={32} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 'var(--text-base)', display: 'block', color: 'var(--text-primary)' }}>
                      Add Manually
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                      Type food name, portion, and exact macros
                    </span>
                  </div>
                  <Badge variant="neutral">Precise Macros</Badge>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button variant="ghost" size="sm" onClick={resetAndClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2A: PHOTO LOGGING VIEW */}
          {method === 'photo' && (
            <form onSubmit={handlePhotoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMethod('choice')}
                >
                  ‹ Change Method
                </Button>
                <Badge variant="forest">Photo &amp; Dish Entry</Badge>
              </div>

              <FormField label="Meal Category" htmlFor="photo-category" required={true}>
                <Select
                  id="photo-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as MealType)}
                  options={[
                    { value: 'Breakfast', label: 'Breakfast' },
                    { value: 'Lunch', label: 'Lunch' },
                    { value: 'Dinner', label: 'Dinner' },
                    { value: 'Snacks', label: 'Snacks' },
                  ]}
                />
              </FormField>

              <FormField
                label="Dish Name"
                htmlFor="photo-dish-name"
                required={true}
                hint="e.g. Avocado Toast with Poached Egg, Grilled Salmon Bowl"
              >
                <Input
                  id="photo-dish-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Enter the name of the dish..."
                  autoFocus={true}
                />
              </FormField>

              {/* Photo Upload Dropzone */}
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Dish Photo (Camera or Upload)
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: photoPreview ? '12px' : '20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-sand-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {photoPreview ? (
                    <div style={{ position: 'relative', width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                      <img
                        src={photoPreview}
                        alt="Dish Preview"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                      />
                      <Badge variant="sage" style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                        Photo Attached
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <Icon name="camera" size={36} />
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '6px' }}>
                        Take a photo or browse image
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        JPEG, PNG, or WebP up to 5MB
                      </div>
                    </>
                  )}

                  <input
                    type="file"
                    id="dish-photo-file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    style={{ marginTop: '10px' }}
                    onClick={() => document.getElementById('dish-photo-file')?.click()}
                    disabled={isAnalyzingPhoto}
                  >
                    {isAnalyzingPhoto ? 'Analyzing...' : photoPreview ? 'Change Photo' : 'Capture / Select Photo'}
                  </Button>
                  {isAnalyzingPhoto && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-forest-green)', fontWeight: 600, marginTop: '8px' }}>
                      ✨ Analyzing food photo with Google Gemini AI...
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated / Desired Calories & Macros */}
              <div style={{ background: 'var(--color-sage-soft)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(40, 91, 70, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-forest-green)' }}>
                    Nutritional Breakdown (AI Extracted)
                  </span>
                  {isAnalyzingPhoto ? (
                    <Badge variant="amber">Analyzing Image...</Badge>
                  ) : calories ? (
                    <Badge variant="forest">AI Extracted ✓</Badge>
                  ) : (
                    <Badge variant="neutral">Select Photo</Badge>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <FormField label="Calories" htmlFor="p-cal">
                    <Input id="p-cal" type="number" placeholder="e.g. 450" value={calories} onChange={(e) => setCalories(e.target.value)} disabled={isAnalyzingPhoto} />
                  </FormField>
                  <FormField label="Protein (g)" htmlFor="p-prot">
                    <Input id="p-prot" type="number" placeholder="e.g. 35" value={protein} onChange={(e) => setProtein(e.target.value)} disabled={isAnalyzingPhoto} />
                  </FormField>
                  <FormField label="Carbs (g)" htmlFor="p-carb">
                    <Input id="p-carb" type="number" placeholder="e.g. 40" value={carbs} onChange={(e) => setCarbs(e.target.value)} disabled={isAnalyzingPhoto} />
                  </FormField>
                  <FormField label="Fat (g)" htmlFor="p-fat">
                    <Input id="p-fat" type="number" placeholder="e.g. 15" value={fat} onChange={(e) => setFat(e.target.value)} disabled={isAnalyzingPhoto} />
                  </FormField>
                </div>
              </div>

              <div className="calories-modal-footer">
                <Button variant="ghost" size="md" onClick={resetAndClose} disabled={isAnalyzingPhoto}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={isAnalyzingPhoto} leftIcon={<Icon name="check" size={16} />}>
                  {isAnalyzingPhoto ? 'Analyzing Photo...' : 'Add Meal with Photo'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2B: MANUAL LOGGING VIEW */}
          {method === 'manual' && (
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMethod('choice')}
                >
                  ‹ Change Method
                </Button>
                <Badge variant="neutral">Manual Data Entry</Badge>
              </div>

              <FormField label="Meal Category" htmlFor="manual-category" required={true}>
                <Select
                  id="manual-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as MealType)}
                  options={[
                    { value: 'Breakfast', label: 'Breakfast' },
                    { value: 'Lunch', label: 'Lunch' },
                    { value: 'Dinner', label: 'Dinner' },
                    { value: 'Snacks', label: 'Snacks' },
                  ]}
                />
              </FormField>

              <FormField
                label="Food Item Name"
                htmlFor="manual-food-name"
                required={true}
                hint="e.g. Greek Yogurt with Mixed Berries"
              >
                <Input
                  id="manual-food-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Enter food name..."
                  autoFocus={true}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <FormField label="Quantity Amount" htmlFor="manual-qty">
                  <Input
                    id="manual-qty"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </FormField>
                <FormField label="Unit" htmlFor="manual-unit">
                  <Select
                    id="manual-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    options={[
                      { value: 'serving', label: 'serving' },
                      { value: 'g', label: 'g (grams)' },
                      { value: 'ml', label: 'ml' },
                      { value: 'cup', label: 'cup' },
                      { value: 'oz', label: 'oz' },
                    ]}
                  />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <FormField label="Calories (kcal)" htmlFor="manual-cal" required={true}>
                  <Input
                    id="manual-cal"
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="350"
                  />
                </FormField>
                <FormField label="Protein (g)" htmlFor="manual-protein">
                  <Input
                    id="manual-protein"
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="25"
                  />
                </FormField>
                <FormField label="Carbs (g)" htmlFor="manual-carbs">
                  <Input
                    id="manual-carbs"
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="40"
                  />
                </FormField>
                <FormField label="Fat (g)" htmlFor="manual-fat">
                  <Input
                    id="manual-fat"
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="10"
                  />
                </FormField>
              </div>

              <FormField label="Notes (Optional)" htmlFor="manual-notes">
                <Input
                  id="manual-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Organic, homemade, lightly salted..."
                />
              </FormField>

              <div className="calories-modal-footer">
                <Button variant="ghost" size="md" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save to {selectedCategory}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
