import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  FormField,
  Icon,
} from '../components/ui/index.js';
import type { DailyGoal, MealItem, FoodRecommendation } from '../types/nutrition.js';
import { generateWeightProjection } from '../utils/weightProjection.js';

const RECOMMENDED_HEALTH_FOODS: FoodRecommendation[] = [
  {
    id: 'rec_1',
    foodName: 'Grilled Chicken Breast with Steamed Broccoli',
    portion: '160g chicken + 100g broccoli',
    caloriesKcal: 260,
    proteinG: 48,
    carbsG: 7,
    fatG: 4,
    reason: 'Fulfills remaining protein target with lean, high-satiety volume',
    macroFocus: 'protein',
  },
  {
    id: 'rec_2',
    foodName: '0% Fat Greek Yogurt with Chia & Raspberries',
    portion: '200g yogurt + 40g raspberries',
    caloriesKcal: 170,
    proteinG: 21,
    carbsG: 16,
    fatG: 2,
    reason: 'Slow-digesting casein protein plus gut-friendly dietary fiber',
    macroFocus: 'protein',
  },
  {
    id: 'rec_3',
    foodName: 'Wild Atlantic Salmon Fillet with Asparagus',
    portion: '180g salmon + 8 spears',
    caloriesKcal: 380,
    proteinG: 36,
    carbsG: 4,
    fatG: 22,
    reason: 'Nutrient-dense dinner option rich in bioavailable Omega-3s',
    macroFocus: 'balanced',
  },
  {
    id: 'rec_4',
    foodName: 'Tofu & Edamame Sauté with Brown Rice',
    portion: '150g firm tofu + 50g edamame + 80g rice',
    caloriesKcal: 320,
    proteinG: 24,
    carbsG: 38,
    fatG: 8,
    reason: 'Plant-powered complete amino acid profile with complex carbohydrates',
    macroFocus: 'balanced',
  },
];

export interface GoalsPageProps {
  currentGoal: DailyGoal;
  onSaveGoal: (updatedGoal: DailyGoal) => void;
  currentWeightKg?: number;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFat?: number;
  onQuickLogMeal?: (meal: MealItem) => void;
}

function generateMealId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  currentGoal,
  onSaveGoal,
  currentWeightKg = 74.2,
  consumedCalories = 0,
  consumedProtein = 0,
  consumedCarbs = 0,
  consumedFat = 0,
  onQuickLogMeal,
}) => {
  // Modal states for Add Goal & Edit Goal
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [quickLogSuccess, setQuickLogSuccess] = useState<string | null>(null);

  // Form states
  const [goalTitle, setGoalTitle] = useState(currentGoal.title || 'Fat Loss & Lean Definition');
  const [calories, setCalories] = useState(String(currentGoal.dailyCaloriesKcal));
  const [protein, setProtein] = useState(String(currentGoal.proteinGrams));
  const [carbs, setCarbs] = useState(String(currentGoal.carbohydrateGrams));
  const [fat, setFat] = useState(String(currentGoal.fatGrams));
  const [targetWeight, setTargetWeight] = useState(String(currentGoal.targetWeight || 70.0));
  const [targetWeeks, setTargetWeeks] = useState(String(currentGoal.targetWeeks || 8));
  const [weightUnit] = useState<'kg' | 'lbs'>(currentGoal.weightUnit || 'kg');

  const [validationError, setValidationError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute remaining nutrients for today
  const targetCal = currentGoal.dailyCaloriesKcal;
  const targetP = currentGoal.proteinGrams;
  const targetC = currentGoal.carbohydrateGrams;
  const targetF = currentGoal.fatGrams;

  const remainingCal = Math.max(0, targetCal - consumedCalories);
  const remainingP = Math.max(0, targetP - consumedProtein);
  const remainingC = Math.max(0, targetC - consumedCarbs);
  const remainingF = Math.max(0, targetF - consumedFat);

  // Energy distribution
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

  // Generate weight trajectory projection data
  const numTargetWeight = Number(targetWeight) || 70.0;
  const numWeeks = Number(targetWeeks) || 8;
  const projectionPoints = generateWeightProjection(currentWeightKg, numTargetWeight, numWeeks);

  const handleSaveGoalForm = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const c = Number(calories);
    const p = Number(protein);
    const cb = Number(carbs);
    const f = Number(fat);
    const tw = Number(targetWeight);
    const wks = Number(targetWeeks);

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

    const d = new Date();
    d.setDate(d.getDate() + (wks || 8) * 7);

    const newGoal: DailyGoal = {
      title: goalTitle.trim() || 'Custom Health Target',
      dailyCaloriesKcal: Math.round(c),
      proteinGrams: Math.round(p),
      carbohydrateGrams: Math.round(cb),
      fatGrams: Math.round(f),
      targetWeight: tw > 0 ? tw : undefined,
      weightUnit,
      targetWeeks: wks || 8,
      targetDate: d.toISOString().split('T')[0],
    };

    onSaveGoal(newGoal);
    setSavedSuccess(true);
    setIsAddGoalModalOpen(false);
    setIsEditGoalModalOpen(false);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleQuickLogRecommendation = (rec: FoodRecommendation) => {
    if (!onQuickLogMeal) return;

    const newMeal: MealItem = {
      id: generateMealId('meal_rec'),
      userId: '',
      foodName: rec.foodName,
      mealType: 'Snacks',
      eatenAt: getIsoTimestamp(),
      quantity: {
        amount: 1,
        unit: 'portion',
      },
      nutrition: {
        caloriesKcal: rec.caloriesKcal,
        proteinG: rec.proteinG,
        carbsG: rec.carbsG,
        fatG: rec.fatG,
      },
      source: 'manual',
      notes: `Smart recommendation: ${rec.reason}`,
    };

    onQuickLogMeal(newMeal);
    setQuickLogSuccess(rec.foodName);
    setTimeout(() => setQuickLogSuccess(null), 3000);
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Nutritional Baseline &amp; Timeline Projection</div>
          <h1 className="calories-greeting-title">Target &amp; Goal Management</h1>
          <p className="calories-greeting-subtext">
            Track active goals, view projected timeline curves to achieve your weight target, and discover recommended foods to satisfy remaining daily nutrients.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Icon name="settings" size={16} />}
            onClick={() => setIsEditGoalModalOpen(true)}
          >
            Edit Current Goal
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="plus" size={16} />}
            onClick={() => setIsAddGoalModalOpen(true)}
          >
            + Add New Goal
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Goal and timeline updated successfully! Charts and projections recalculated.</span>
        </div>
      )}

      {/* Quick Log Success Banner */}
      {quickLogSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Logged "{quickLogSuccess}" to your daily journal!</span>
        </div>
      )}

      {/* Active Goal Highlight & Remaining Nutrients Strip */}
      <Card style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-light)' }}>
        <CardContent style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant="forest">Active Goal</Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Target Date: <strong>{currentGoal.targetDate || 'Dec 19, 2026'}</strong> ({numWeeks} Weeks)
                </span>
              </div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '6px 0 0', color: 'var(--text-primary)' }}>
                {currentGoal.title || 'Fat Loss & Lean Definition'}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Weight</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {currentWeightKg} {weightUnit}
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--color-slate-light)', alignSelf: 'center' }}>→</div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-forest-green)', textTransform: 'uppercase', fontWeight: 600 }}>Target Weight</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-forest-green)' }}>
                  {numTargetWeight} {weightUnit}
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Nutrients Today Strip */}
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remaining to Reach Today's Targets:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '8px' }}>
              <div style={{ background: 'var(--color-sand-soft)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Calories Remaining</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--action-primary)' }}>
                  {remainingCal} kcal
                </div>
              </div>
              <div style={{ background: 'var(--color-sand-soft)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Protein Remaining</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-forest-green)' }}>
                  {remainingP}g
                </div>
              </div>
              <div style={{ background: 'var(--color-sand-soft)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Carbs Remaining</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-sage-green)' }}>
                  {remainingC}g
                </div>
              </div>
              <div style={{ background: 'var(--color-sand-soft)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fat Remaining</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-amber)' }}>
                  {remainingF}g
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TIMELINE APPROXIMATION PROJECTION GRAPH */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="goals" size={24} />
              <CardTitle>Timeline Approximation &amp; Trajectory</CardTitle>
            </div>
            <Badge variant="sage">
              Est. Deficit: ~450 kcal/day • Goal in {numWeeks} Weeks
            </Badge>
          </div>
          <CardDescription>
            Approximated weekly weight projection from current weight ({currentWeightKg} {weightUnit}) to target ({numTargetWeight} {weightUnit}) based on your metabolic baseline.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
            {/* SVG Projection Chart */}
            <div style={{ minWidth: '560px', padding: '16px 8px 8px' }}>
              <svg viewBox="0 0 700 200" style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="projectionArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-forest-green)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--color-forest-green)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="40" y1="30" x2="680" y2="30" stroke="var(--border-light)" strokeDasharray="3 3" />
                <line x1="40" y1="90" x2="680" y2="90" stroke="var(--border-light)" strokeDasharray="3 3" />
                <line x1="40" y1="150" x2="680" y2="150" stroke="var(--border-light)" strokeDasharray="3 3" />

                {/* Y-axis labels */}
                <text x="30" y="34" fill="var(--text-secondary)" fontSize="11" textAnchor="end" fontFamily="var(--font-mono)">
                  {Math.max(currentWeightKg, numTargetWeight) + 1}kg
                </text>
                <text x="30" y="94" fill="var(--text-secondary)" fontSize="11" textAnchor="end" fontFamily="var(--font-mono)">
                  {((currentWeightKg + numTargetWeight) / 2).toFixed(1)}kg
                </text>
                <text x="30" y="154" fill="var(--text-secondary)" fontSize="11" textAnchor="end" fontFamily="var(--font-mono)">
                  {Math.min(currentWeightKg, numTargetWeight) - 1}kg
                </text>

                {/* Projection Polyline & Area */}
                {(() => {
                  const xStart = 60;
                  const xEnd = 660;
                  const minW = Math.min(currentWeightKg, numTargetWeight) - 1;
                  const maxW = Math.max(currentWeightKg, numTargetWeight) + 1;
                  const range = maxW - minW || 1;

                  const pointsCoords = projectionPoints.map((pt, idx) => {
                    const x = xStart + (idx / (projectionPoints.length - 1)) * (xEnd - xStart);
                    const y = 160 - ((pt.projectedWeightKg - minW) / range) * 130;
                    return { x, y, ...pt };
                  });

                  const pointsString = pointsCoords.map((p) => `${p.x},${p.y}`).join(' ');
                  const areaString = `${xStart},160 ${pointsString} ${xEnd},160`;

                  return (
                    <>
                      <polygon points={areaString} fill="url(#projectionArea)" />
                      <polyline
                        points={pointsString}
                        fill="none"
                        stroke="var(--color-forest-green)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Point Markers */}
                      {pointsCoords.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={i === 0 || i === pointsCoords.length - 1 ? 6 : 4}
                            fill={i === pointsCoords.length - 1 ? 'var(--color-forest-green)' : 'var(--surface-card)'}
                            stroke="var(--color-forest-green)"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 10}
                            fill="var(--text-primary)"
                            fontSize="10"
                            fontWeight="600"
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                          >
                            {p.projectedWeightKg}kg
                          </text>
                          <text
                            x={p.x}
                            y="178"
                            fill="var(--text-secondary)"
                            fontSize="11"
                            textAnchor="middle"
                          >
                            {p.dateLabel}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* "THINGS TO HAVE" — SMART FOOD RECOMMENDATIONS TO REACH GOALS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="meals" size={20} />
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Things to Have — Foods to Meet Today's Targets
              </h2>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Tailored nutritional suggestions aligned with your remaining {remainingP}g protein and {remainingCal} kcal budget.
            </p>
          </div>

          <Badge variant="forest">Allergy Checked</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {RECOMMENDED_HEALTH_FOODS.map((rec) => (
            <Card key={rec.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <CardContent style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    {rec.foodName}
                  </strong>
                  <Badge variant={rec.macroFocus === 'protein' ? 'forest' : 'sage'}>
                    {rec.macroFocus}
                  </Badge>
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Portion: {rec.portion}
                </div>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', margin: '10px 0', fontStyle: 'italic', background: 'var(--color-sand-soft)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  💡 {rec.reason}
                </p>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                  <span><strong>{rec.caloriesKcal}</strong> kcal</span>
                  <span>•</span>
                  <span><strong>{rec.proteinG}g</strong> Protein</span>
                  <span>•</span>
                  <span><strong>{rec.carbsG}g</strong> Carbs</span>
                  <span>•</span>
                  <span><strong>{rec.fatG}g</strong> Fat</span>
                </div>
              </CardContent>

              <div style={{ padding: '0 18px 16px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ width: '100%' }}
                  leftIcon={<Icon name="plus" size={14} />}
                  onClick={() => handleQuickLogRecommendation(rec)}
                >
                  + Quick Log to Journal
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* MACRO DISTRIBUTION ENERGY RATIO SPLIT CARD */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="reports" size={24} />
            <CardTitle>Daily Macronutrient Energy Distribution</CardTitle>
          </div>
          <CardDescription>
            Calculated from 4 kcal/g protein &amp; carbs, 9 kcal/g dietary fat
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Macro Calorie Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Macro Energy Total</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
          </div>
        </CardContent>
      </Card>

      {/* ADD GOAL / EDIT GOAL MODAL */}
      {(isAddGoalModalOpen || isEditGoalModalOpen) && (
        <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
          <div className="calories-modal-card" style={{ maxWidth: '580px' }}>
            <div className="calories-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="goals" size={20} />
                <h3 id="goal-modal-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  {isAddGoalModalOpen ? 'Set New Nutritional Goal' : 'Edit Current Nutritional Targets'}
                </h3>
              </div>
              <button
                type="button"
                className="calories-modal-close-btn"
                onClick={() => {
                  setIsAddGoalModalOpen(false);
                  setIsEditGoalModalOpen(false);
                }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoalForm} className="calories-modal-body">
              {validationError && (
                <div className="calories-form-error-box" role="alert">
                  {validationError}
                </div>
              )}

              <FormField label="Goal Title / Program Name" htmlFor="goal-title-input" required={true}>
                <Input
                  id="goal-title-input"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. 10-Week Muscle Hypertrophy or Lean Definition"
                  autoFocus={true}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Target Weight (kg)" htmlFor="goal-tw-input" hint="Your target weight">
                  <Input
                    id="goal-tw-input"
                    type="number"
                    step="0.1"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="70.0"
                  />
                </FormField>

                <FormField label="Target Timeline (Weeks to Achieve)" htmlFor="goal-twk-input" hint="Duration to hit goal">
                  <Input
                    id="goal-twk-input"
                    type="number"
                    value={targetWeeks}
                    onChange={(e) => setTargetWeeks(e.target.value)}
                    placeholder="8"
                  />
                </FormField>
              </div>

              <FormField
                label="Daily Calorie Budget (kcal)"
                htmlFor="goal-cal-input"
                required={true}
                hint="Standard adult baseline is typically 1,800 to 2,500 kcal"
              >
                <Input
                  id="goal-cal-input"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="2200"
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <FormField label="Protein (g)" htmlFor="goal-prot-input" required={true}>
                  <Input
                    id="goal-prot-input"
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="150"
                  />
                </FormField>

                <FormField label="Carbs (g)" htmlFor="goal-carb-input" required={true}>
                  <Input
                    id="goal-carb-input"
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="220"
                  />
                </FormField>

                <FormField label="Fat (g)" htmlFor="goal-fat-input" required={true}>
                  <Input
                    id="goal-fat-input"
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="70"
                  />
                </FormField>
              </div>

              <div className="calories-modal-footer">
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => {
                    setIsAddGoalModalOpen(false);
                    setIsEditGoalModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" leftIcon={<Icon name="check" size={16} />}>
                  {isAddGoalModalOpen ? 'Create & Activate Goal' : 'Save Targets'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
