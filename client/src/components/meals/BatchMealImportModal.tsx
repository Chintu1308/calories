import React, { useState } from 'react';
import {
  Button,
  Badge,
  Icon,
} from '../ui/index.js';
import { apiClient, type BatchExtractedMealItem } from '../../api/apiClient.js';
import type { MealItem } from '../../types/nutrition.js';

export interface BatchMealImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealsImported: (importedMeals: MealItem[]) => void;
}

const SAMPLE_MARKDOWN_TABLE = `| Date | Meal | Food Name | Portion | Calories | Protein | Carbs | Fat |
| 2026-10-20 | Breakfast | 2 Masala Dosas & Sambar | 2 pcs | 450 | 10 | 68 | 14 |
| 2026-10-20 | Lunch | Grilled Chicken Rice Bowl | 1 bowl | 520 | 44 | 56 | 12 |
| 2026-10-21 | Breakfast | Oatmeal with Banana & Whey | 1 bowl | 340 | 28 | 48 | 6 |
| 2026-10-21 | Dinner | Pan-Seared Salmon & Green Beans | 1 plate | 420 | 38 | 14 | 22 |`;

const SAMPLE_CSV = `Date,Meal,Food,Portion,Calories,Protein,Carbs,Fat
2026-10-20,Breakfast,2 Boiled Eggs & Whole Wheat Toast,2 slices,280,16,24,12
2026-10-20,Lunch,Paneer Tikka with Quinoa Salad,1 plate,460,24,38,22
2026-10-21,Breakfast,Greek Yogurt with Blueberries & Honey,1 cup,220,18,28,2
2026-10-21,Dinner,Tofu Stir Fry with Steamed Rice,1 bowl,380,22,54,10`;

const SAMPLE_FREEFORM = `Date: 2026-10-20
Breakfast: 2 idlis with coconut chutney (180 kcal)
Lunch: Chicken biryani with raita (650 kcal)

Date: 2026-10-21
Breakfast: 3 scrambled eggs with spinach (240 kcal)
Dinner: Grilled white fish with sweet potato (390 kcal)`;

export const BatchMealImportModal: React.FC<BatchMealImportModalProps> = ({
  isOpen,
  onClose,
  onMealsImported,
}) => {
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parsed results
  const [parsedMeals, setParsedMeals] = useState<BatchExtractedMealItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [distinctDates, setDistinctDates] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAnalyzeTable = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Please paste or enter tabular meal data first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.batchExtractTable({
        rawText: rawText.trim(),
        autoCommit: false,
      });

      if (res.success && res.meals.length > 0) {
        setParsedMeals(res.meals);
        setSelectedIds(new Set(res.meals.map((m) => m.tempId)));
        setDistinctDates(res.distinctDates);
      } else {
        setErrorMsg('No meal rows could be extracted. Please check formatting or insert a sample template.');
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message || 'Failed to parse table with AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === parsedMeals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedMeals.map((m) => m.tempId)));
    }
  };

  const handleToggleMeal = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleCommitSelectedMeals = async () => {
    const mealsToCommit = parsedMeals.filter((m) => selectedIds.has(m.tempId));
    if (mealsToCommit.length === 0) {
      setErrorMsg('Please select at least one meal to log.');
      return;
    }

    setIsCommitting(true);
    setErrorMsg(null);

    try {
      const createdMeals: MealItem[] = [];

      for (const item of mealsToCommit) {
        const res = await apiClient.createMeal({
          userId: '',
          foodName: item.foodName,
          mealType: item.mealType,
          eatenAt: item.eatenAt,
          quantity: item.quantity,
          nutrition: item.nutrition,
          source: 'ai',
          notes: item.notes || `Logged via AI Tabular Batch Importer for ${item.date}`,
        });

        if (res.meal) {
          createdMeals.push(res.meal);
        }
      }

      setSuccessMsg(`Successfully logged ${createdMeals.length} meal(s) across ${distinctDates.length} date(s) to your journal!`);
      onMealsImported(createdMeals);

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message || 'Failed to save all batch meals.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="batch-modal-title">
      <div className="calories-modal-card" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="calories-modal-header" style={{ backgroundColor: 'var(--color-sand-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>📊</span>
            <div>
              <h3 id="batch-modal-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                AI Tabular &amp; Multi-Date Meal Importer
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Paste tables, CSV, or food diary text with different dates. The AI logs all meals to your diary.
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

        <div className="calories-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div className="calories-form-error-box" role="alert">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="calories-success-banner" role="status">
              <Icon name="check" size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick template inserters */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Insert Example Templates:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="calories-pill-btn"
                onClick={() => setRawText(SAMPLE_MARKDOWN_TABLE)}
              >
                📋 Markdown Table Sample
              </button>
              <button
                type="button"
                className="calories-pill-btn"
                onClick={() => setRawText(SAMPLE_CSV)}
              >
                📑 CSV / Spreadsheet Sample
              </button>
              <button
                type="button"
                className="calories-pill-btn"
                onClick={() => setRawText(SAMPLE_FREEFORM)}
              >
                📝 Multi-Date Text Log Sample
              </button>
              {rawText && (
                <button
                  type="button"
                  className="calories-pill-btn"
                  style={{ color: 'var(--color-error-red)' }}
                  onClick={() => {
                    setRawText('');
                    setParsedMeals([]);
                  }}
                >
                  Clear Text
                </button>
              )}
            </div>
          </div>

          {/* Raw Text Input */}
          <div>
            <label htmlFor="batch-raw-textarea" style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
              Paste Your Table or Multi-Meal Log:
            </label>
            <textarea
              id="batch-raw-textarea"
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste Markdown table (| Date | Meal | Food | ...), CSV lines, or dates with food names..."
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.5,
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Analyze Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isAnalyzing || !rawText.trim()}
              leftIcon={<Icon name="ai-scan" size={16} />}
              onClick={handleAnalyzeTable}
            >
              {isAnalyzing ? 'Analyzing Meals & Estimating Macros with AI...' : '⚡ Analyze & Extract All Meals'}
            </Button>
          </div>

          {/* Parsed Meals Preview Section */}
          {parsedMeals.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    Extracted Meals ({parsedMeals.length} meals across {distinctDates.length} date{distinctDates.length === 1 ? '' : 's'})
                  </strong>
                  <Badge variant="forest">
                    {distinctDates.join(', ')}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-forest-green)',
                    cursor: 'pointer',
                  }}
                >
                  {selectedIds.size === parsedMeals.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {parsedMeals.map((meal) => {
                  const isChecked = selectedIds.has(meal.tempId);
                  return (
                    <div
                      key={meal.tempId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isChecked ? 'var(--color-sage-soft)' : 'var(--bg-secondary)',
                        border: `1px solid ${isChecked ? 'var(--color-forest-green)' : 'var(--border-medium)'}`,
                        borderRadius: 'var(--radius-sm)',
                        gap: '12px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMeal(meal.tempId)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-forest-green)' }}
                        />

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <Badge variant="neutral">{meal.date}</Badge>
                            <Badge variant={meal.mealType === 'Breakfast' ? 'neutral' : meal.mealType === 'Lunch' ? 'forest' : 'sage'}>
                              {meal.mealType}
                            </Badge>
                            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                              {meal.foodName}
                            </strong>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Portion: {meal.quantity.amount} {meal.quantity.unit}
                          </div>
                        </div>
                      </div>

                      {/* Macros */}
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                          🔥 {meal.nutrition.caloriesKcal} kcal
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                          {meal.nutrition.proteinG}g P
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-sage-green)', fontWeight: 600 }}>
                          {meal.nutrition.carbsG}g C
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-amber)', fontWeight: 600 }}>
                          {meal.nutrition.fatG}g F
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="calories-modal-footer">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isCommitting}>
            Cancel
          </Button>

          {parsedMeals.length > 0 && (
            <Button
              variant="primary"
              size="md"
              disabled={isCommitting || selectedIds.size === 0}
              leftIcon={<Icon name="check" size={16} />}
              onClick={handleCommitSelectedMeals}
            >
              {isCommitting ? 'Logging All Meals to Journal...' : `✅ Log ${selectedIds.size} Selected Meal(s) to Journal`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
