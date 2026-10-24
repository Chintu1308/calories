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
  Input,
  Select,
  FormField,
  Icon,
} from '../components/ui/index.js';
import type { DailyGoal } from '../types/nutrition.js';

export interface GoalsPageProps {
  currentGoal: DailyGoal;
  onSaveGoal: (updatedGoal: DailyGoal) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  currentGoal,
  onSaveGoal,
}) => {
  const [calories, setCalories] = useState(String(currentGoal.dailyCaloriesKcal));
  const [protein, setProtein] = useState(String(currentGoal.proteinGrams));
  const [carbs, setCarbs] = useState(String(currentGoal.carbohydrateGrams));
  const [fat, setFat] = useState(String(currentGoal.fatGrams));
  const [targetWeight, setTargetWeight] = useState(String(currentGoal.targetWeight || 72));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(currentGoal.weightUnit || 'kg');

  const [validationError, setValidationError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute energy distribution from macros: Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g
  const numCal = Number(calories) || 2000;
  const numP = Number(protein) || 0;
  const numC = Number(carbs) || 0;
  const numF = Number(fat) || 0;

  const proteinKcal = numP * 4;
  const carbsKcal = numC * 4;
  const fatKcal = numF * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.round((fatKcal / totalMacroKcal) * 100) : 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSavedSuccess(false);

    const c = Number(calories);
    const p = Number(protein);
    const cb = Number(carbs);
    const f = Number(fat);
    const tw = Number(targetWeight);

    if (isNaN(c) || c < 500 || c > 10000) {
      setValidationError('Daily calories must be between 500 and 10,000 kcal.');
      return;
    }
    if (isNaN(p) || p < 0 || p > 600) {
      setValidationError('Protein must be between 0 and 600 grams.');
      return;
    }
    if (isNaN(cb) || cb < 0 || cb > 1000) {
      setValidationError('Carbohydrates must be between 0 and 1,000 grams.');
      return;
    }
    if (isNaN(f) || f < 0 || f > 500) {
      setValidationError('Fats must be between 0 and 500 grams.');
      return;
    }

    const newGoal: DailyGoal = {
      dailyCaloriesKcal: Math.round(c),
      proteinGrams: Math.round(p),
      carbohydrateGrams: Math.round(cb),
      fatGrams: Math.round(f),
      targetWeight: tw > 0 ? tw : undefined,
      weightUnit,
    };

    onSaveGoal(newGoal);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Personal Nutritional Baseline</div>
          <h1 className="calories-greeting-title">Target &amp; Goal Setting</h1>
          <p className="calories-greeting-subtext">
            Configure your daily dietary targets. All targets are scoped strictly to your account and evaluated in goal-vs-actual reports.
          </p>
        </div>

        <Badge variant="forest">Multi-Tenant Scoped</Badge>
      </div>

      {/* Non-Medical Disclaimer Alert */}
      <div className="calories-demo-notice-bar" style={{ borderLeftColor: 'var(--color-amber)' }}>
        <Icon name="heart" size={18} />
        <div>
          <strong>Nutritional Guidance Disclaimer:</strong> Nutritional targets set in Calories are intended for personal wellness tracking and lifestyle education. They do not constitute formal medical or clinical advice.
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Targets successfully saved and persisted! Your dashboard and charts are now updated.</span>
        </div>
      )}

      {/* Goal Form & Macro Distribution Split */}
      <div className="calories-grid-two">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="goals" size={24} />
              <CardTitle>Daily Nutrient Targets</CardTitle>
            </div>
            <CardDescription>Specify daily calorie and macronutrient thresholds</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="goals-form" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {validationError && (
                <div className="calories-form-error-box" role="alert">
                  {validationError}
                </div>
              )}

              <FormField
                label="Daily Calorie Budget (kcal)"
                htmlFor="goal-calories"
                required={true}
                hint="Standard adult baseline is typically 1,800 to 2,500 kcal"
              >
                <Input
                  id="goal-calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="2200"
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <FormField label="Protein (g)" htmlFor="goal-protein" required={true}>
                  <Input
                    id="goal-protein"
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="150"
                  />
                </FormField>

                <FormField label="Carbs (g)" htmlFor="goal-carbs" required={true}>
                  <Input
                    id="goal-carbs"
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="220"
                  />
                </FormField>

                <FormField label="Fat (g)" htmlFor="goal-fat" required={true}>
                  <Input
                    id="goal-fat"
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="70"
                  />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <FormField label="Target Weight" htmlFor="goal-weight" hint="Optional health tracking goal">
                  <Input
                    id="goal-weight"
                    type="number"
                    step="0.1"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="72.0"
                  />
                </FormField>

                <FormField label="Unit" htmlFor="goal-weight-unit">
                  <Select
                    id="goal-weight-unit"
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                    options={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lbs', label: 'lbs' },
                    ]}
                  />
                </FormField>
              </div>
            </form>
          </CardContent>

          <CardFooter>
            <Button variant="primary" size="md" type="submit" form="goals-form" leftIcon={<Icon name="check" size={16} />}>
              Save Nutrition Targets
            </Button>
          </CardFooter>
        </Card>

        {/* Macro Ratio Analysis Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="reports" size={24} />
              <CardTitle>Energy Distribution Analysis</CardTitle>
            </div>
            <CardDescription>Calculated from 4 kcal/g protein &amp; carbs, 9 kcal/g fat</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Macro Calorie Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Macro Calorie Sum</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                    <strong>{totalMacroKcal.toLocaleString()} kcal</strong> ({numCal > 0 ? Math.round((totalMacroKcal / numCal) * 100) : 0}% of budget)
                  </span>
                </div>

                <div className="calories-macro-ratio-bar">
                  <div
                    title={`Protein: ${proteinPct}%`}
                    style={{
                      width: `${proteinPct}%`,
                      backgroundColor: 'var(--color-forest-green)',
                    }}
                  />
                  <div
                    title={`Carbohydrates: ${carbsPct}%`}
                    style={{
                      width: `${carbsPct}%`,
                      backgroundColor: 'var(--color-sage-green)',
                    }}
                  />
                  <div
                    title={`Fats: ${fatPct}%`}
                    style={{
                      width: `${fatPct}%`,
                      backgroundColor: 'var(--color-amber)',
                    }}
                  />
                </div>
              </div>

              {/* Individual Breakdown Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="calories-macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="protein" size={18} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Protein</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                      {numP}g ({proteinKcal} kcal)
                    </span>
                    <Badge variant="forest" style={{ marginLeft: '8px' }}>{proteinPct}%</Badge>
                  </div>
                </div>

                <div className="calories-macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="carbs" size={18} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Carbohydrates</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                      {numC}g ({carbsKcal} kcal)
                    </span>
                    <Badge variant="sage" style={{ marginLeft: '8px' }}>{carbsPct}%</Badge>
                  </div>
                </div>

                <div className="calories-macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="fat" size={18} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Fats</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                      {numF}g ({fatKcal} kcal)
                    </span>
                    <Badge variant="amber" style={{ marginLeft: '8px' }}>{fatPct}%</Badge>
                  </div>
                </div>
              </div>

              {/* Rationale Note */}
              <div className="calories-editorial-note">
                <strong>Nutritional Balance:</strong> A balanced macronutrient profile typically targets 20–35% protein, 45–60% carbohydrates, and 20–35% dietary fats for general wellness.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
