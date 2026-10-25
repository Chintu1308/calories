import React, { useState, useEffect } from 'react';
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
import type { DailyGoal, MealItem, UserProfile } from '../types/nutrition.js';
import { generateWeightProjection } from '../utils/weightProjection.js';
import { apiClient, type SmartRecommendationItem, type DietInstructionItem } from '../api/apiClient.js';
import { GoalMilestoneModal } from '../components/goals/GoalMilestoneModal.js';

export interface GoalsPageProps {
  currentGoal: DailyGoal;
  onSaveGoal: (updatedGoal: DailyGoal) => void;
  currentWeightKg?: number;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFat?: number;
  onQuickLogMeal?: (meal: MealItem) => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (updatedProfile: UserProfile) => Promise<void>;
}

function generateQuickLogMealId(): string {
  return `meal_rec_${Date.now()}`;
}

function getQuickLogTimestamp(): string {
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
  onQuickLogMeal: _onQuickLogMeal,
  userProfile,
  onUpdateProfile,
}) => {
  // Modal states for Add Goal, Edit Goal, and Milestone Check-In
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

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

  // Synchronize form states whenever active goal is updated
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setGoalTitle(currentGoal.title || 'Fat Loss & Lean Definition');
    setCalories(String(currentGoal.dailyCaloriesKcal));
    setProtein(String(currentGoal.proteinGrams));
    setCarbs(String(currentGoal.carbohydrateGrams));
    setFat(String(currentGoal.fatGrams));
    setTargetWeight(String(currentGoal.targetWeight || 70.0));
    setTargetWeeks(String(currentGoal.targetWeeks || 8));
  }, [
    currentGoal.title,
    currentGoal.dailyCaloriesKcal,
    currentGoal.proteinGrams,
    currentGoal.carbohydrateGrams,
    currentGoal.fatGrams,
    currentGoal.targetWeight,
    currentGoal.targetWeeks,
  ]);

  // Clinical PDF Diet Instructions State
  const [dietInstructions, setDietInstructions] = useState<DietInstructionItem[]>([]);
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState<string | null>(null);
  const [isDeletingInstruction, setIsDeletingInstruction] = useState(false);

  const fetchDietInstructions = async () => {
    setIsLoadingInstructions(true);
    try {
      const res = await apiClient.getDietInstructions();
      if (res?.instructions) {
        setDietInstructions(res.instructions);
      }
    } catch (err) {
      console.warn('Failed to load diet instructions:', err);
    } finally {
      setIsLoadingInstructions(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDietInstructions()
      .then((res) => {
        if (mounted && res?.instructions) {
          setDietInstructions(res.instructions);
        }
      })
      .catch((err) => {
        console.warn('Failed to load diet instructions:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Dynamic ML Recommendation Engine State
  const [recommendations, setRecommendations] = useState<SmartRecommendationItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [recModelInfo, setRecModelInfo] = useState<{
    version: string;
    primaryGoal: string;
    activePdfInstructionsCount: number;
  } | null>(null);
  const [quickLogSuccess, setQuickLogSuccess] = useState<string | null>(null);

  const refreshRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const res = await apiClient.getRecommendations();
      setRecommendations(res.recommendations);
      setRecModelInfo(res.modelInfo);
    } catch {
      // Fallback silently if offline
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiClient
      .getRecommendations()
      .then((res) => {
        if (mounted) {
          setRecommendations(res.recommendations);
          setRecModelInfo(res.modelInfo);
        }
      })
      .catch(() => {
        // Fallback silently if offline or unauthenticated
      })
      .finally(() => {
        if (mounted) setIsLoadingRecs(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentGoal.title, currentGoal.dailyCaloriesKcal, consumedCalories]);

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfUploadError(null);
    setPdfUploadSuccess(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
        setPdfFile(file);
      } else {
        setPdfUploadError('Please select a valid PDF document (.pdf).');
      }
    }
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setPdfUploadError('Please choose a diet plan or prescription PDF first.');
      return;
    }

    setIsUploadingPdf(true);
    setPdfUploadError(null);
    setPdfUploadSuccess(null);

    try {
      const res = await apiClient.uploadDietPlanPdf(pdfFile);
      setPdfUploadSuccess(res.message || 'Diet plan analyzed & guidelines saved successfully!');
      setPdfFile(null);
      await fetchDietInstructions();
      await refreshRecommendations();
      // If server updated active goal calories from dietitian targets, fetch fresh goal
      const goalRes = await apiClient.getActiveGoal();
      if (goalRes?.goal) {
        onSaveGoal(goalRes.goal);
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to extract guidelines from PDF.';
      setPdfUploadError(msg);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    setIsDeletingInstruction(true);
    try {
      await apiClient.deleteDietInstruction(id);
      setDietInstructions((prev) => prev.filter((item) => item._id !== id));
      await refreshRecommendations();
    } catch (err: unknown) {
      console.warn('Failed to delete diet instruction:', err);
    } finally {
      setIsDeletingInstruction(false);
    }
  };

  const handleUpdateProfileAndGoal = async (
    heightCm: number,
    newWeightKg: number,
    newTargetWeight?: number
  ) => {
    if (onUpdateProfile && userProfile) {
      await onUpdateProfile({
        ...userProfile,
        heightCm,
        currentWeightKg: newWeightKg,
        targetWeightKg: newTargetWeight ?? userProfile.targetWeightKg,
      });
    } else {
      await apiClient.updateProfile({
        heightCm,
        currentWeightKg: newWeightKg,
        targetWeightKg: newTargetWeight,
      });
    }

    if (newTargetWeight && newTargetWeight !== currentGoal.targetWeight) {
      onSaveGoal({
        ...currentGoal,
        targetWeight: newTargetWeight,
      });
    }
  };

  const handleQuickLog = async (rec: SmartRecommendationItem) => {
    const newMeal: MealItem = {
      id: generateQuickLogMealId(),
      userId: '',
      foodName: rec.foodName,
      mealType: rec.category,
      eatenAt: getQuickLogTimestamp(),
      quantity: {
        amount: rec.portionAmount,
        unit: rec.portionUnit,
      },
      nutrition: {
        caloriesKcal: rec.nutrition.caloriesKcal,
        proteinG: rec.nutrition.proteinG,
        carbsG: rec.nutrition.carbsG,
        fatG: rec.nutrition.fatG,
      },
      source: 'ai',
      notes: `Quick logged from ML Recommendation Engine (${rec.matchScore}% deficit match)`,
    };

    if (_onQuickLogMeal) {
      _onQuickLogMeal(newMeal);
    } else {
      try {
        await apiClient.createMeal({
          userId: '',
          foodName: newMeal.foodName,
          mealType: newMeal.mealType,
          eatenAt: newMeal.eatenAt,
          quantity: newMeal.quantity,
          nutrition: newMeal.nutrition,
          source: 'ai',
          notes: newMeal.notes,
        });
      } catch (err) {
        console.error('Quick log failed:', err);
      }
    }

    setQuickLogSuccess(`Logged ${rec.foodName} (${rec.nutrition.caloriesKcal} kcal) directly to your diary!`);
    setTimeout(() => setQuickLogSuccess(null), 3500);
  };

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
  const numTargetWeight = currentGoal.targetWeight || Number(targetWeight) || 70.0;
  const numWeeks = currentGoal.targetWeeks || Number(targetWeeks) || 8;
  const projectionPoints = generateWeightProjection(currentWeightKg, numTargetWeight, numWeeks);

  // Dynamically compute metabolic deficit / surplus based on calorie target vs TDEE
  const userHeight = userProfile?.heightCm || 175;
  const userBmr = 10 * currentWeightKg + 6.25 * userHeight - 5 * 28 + 5;
  const userTdee = Math.round(userBmr * 1.4);
  const netDeficit = Math.round(currentGoal.dailyCaloriesKcal - userTdee);
  const deficitBadgeText = netDeficit < 0
    ? `Est. Deficit: ~${Math.abs(netDeficit)} kcal/day`
    : netDeficit > 0
      ? `Est. Surplus: +${netDeficit} kcal/day`
      : `Maintenance: ~${userTdee} kcal/day`;

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

  // Milestone completion evaluation
  const isTargetDateReached = (() => {
    if (!currentGoal.targetDate) return false;
    // oxlint-disable-next-line react/purity
    const todayStr = new Date().toISOString().split('T')[0]!;
    return todayStr >= currentGoal.targetDate;
  })();

  const isTargetWeightReached = (() => {
    if (!currentGoal.targetWeight || !currentWeightKg) return false;
    return Math.abs(currentWeightKg - currentGoal.targetWeight) <= 0.2;
  })();

  const isGoalMilestoneReady = isTargetDateReached || isTargetWeightReached;

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Nutritional Baseline &amp; Timeline Projection</div>
          <h1 className="calories-greeting-title">Target &amp; Goal Management</h1>
          <p className="calories-greeting-subtext">
            Track active goals, view projected timeline curves to achieve your weight target, upload clinical diet plans, and discover recommended foods to satisfy remaining daily nutrients.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Icon name="weight" size={16} />}
            onClick={() => setIsMilestoneModalOpen(true)}
            style={{ borderColor: 'var(--color-forest-green)', color: 'var(--color-forest-green)' }}
          >
            Check Goal Milestone &amp; Weight
          </Button>

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
            Add New Goal
          </Button>
        </div>
      </div>

      {/* Goal Milestone Reached Celebratory Banner */}
      {isGoalMilestoneReady && (
        <div
          style={{
            backgroundColor: 'var(--color-sage-soft)',
            border: '2px solid var(--color-forest-green)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '32px' }}>🏆</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-forest-green)' }}>
                {isTargetWeightReached ? '🎉 Target Weight Reached!' : '🎯 Goal Milestone Timeline Arrived!'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {isTargetWeightReached
                  ? `Spectacular work! You have reached your target weight of ${currentGoal.targetWeight} kg. Let's record your updated height & weight to calculate your BMI and set your next milestone!`
                  : `Your target date (${currentGoal.targetDate || 'today'}) has arrived! Let's check whether you achieved your target weight of ${numTargetWeight} kg and record your updated measurements.`}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="check" size={16} />}
            onClick={() => setIsMilestoneModalOpen(true)}
          >
            Check Goal Achievement &amp; Log Height/Weight
          </Button>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Goal and timeline updated successfully! Charts and projections recalculated.</span>
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
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{numTargetWeight} {weightUnit}</span>
                  <button
                    type="button"
                    onClick={() => setIsMilestoneModalOpen(true)}
                    style={{
                      background: 'var(--color-sage-soft)',
                      border: '1px solid var(--color-forest-green)',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--color-forest-green)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                    title="Check whether target weight was reached"
                  >
                    Check
                  </button>
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

      {/* CLINICAL DIET PLANS & PRESCRIPTIONS (PDF) */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="ai-scan" size={24} />
              <div>
                <CardTitle>Clinical Diet Plans &amp; Doctor Prescriptions (PDF)</CardTitle>
                <CardDescription>
                  Upload your dietitian&apos;s meal chart, clinical diet plan, or doctor&apos;s prescription (PDF). Antigravity AI extracts medical restrictions, forbidden foods, and recommended items to dynamically tailor your nutrition recommendations.
                </CardDescription>
              </div>
            </div>
            <Badge variant="sage">
              {dietInstructions.length} Active Guideline{dietInstructions.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PDF Upload Dropzone Form */}
          <form onSubmit={handleUploadPdf} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className="calories-ai-upload-dropzone"
              style={{
                cursor: 'pointer',
                padding: '24px 20px',
                border: pdfFile ? '2px solid var(--color-forest-green)' : '2px dashed var(--border-medium)',
                backgroundColor: pdfFile ? 'var(--color-sage-soft)' : 'var(--color-sand-soft)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('diet-pdf-file-input')?.click()}
            >
              <input
                id="diet-pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handlePdfFileSelect}
              />
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              {pdfFile ? (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-forest-green)', fontSize: 'var(--text-sm)' }}>
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Click to choose a different PDF file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                    Click or drag &amp; drop your diet chart or prescription PDF here
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Supports doctor diet sheets, clinical charts, and nutritionist meal plans in PDF format
                  </div>
                </div>
              )}
            </div>

            {pdfUploadError && (
              <div className="calories-form-error-box" role="alert">
                {pdfUploadError}
              </div>
            )}

            {pdfUploadSuccess && (
              <div className="calories-success-banner" role="status">
                <Icon name="check" size={18} />
                <span>{pdfUploadSuccess}</span>
              </div>
            )}

            {pdfFile && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    setPdfUploadError(null);
                  }}
                  disabled={isUploadingPdf}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isUploadingPdf}
                  leftIcon={<Icon name="ai-scan" size={16} />}
                >
                  {isUploadingPdf ? 'Analyzing PDF with AI...' : 'Extract & Save Clinical Guidelines'}
                </Button>
              </div>
            )}
          </form>

          {/* Extracted Clinical Instructions List */}
          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Active Clinical Guidelines &amp; Restrictions ({dietInstructions.length})
            </h3>

            {isLoadingInstructions ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                Loading active diet instructions...
              </div>
            ) : dietInstructions.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-light)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                No clinical diet plans uploaded yet. Upload a prescription or diet chart above to extract guidelines and tailor your food suggestions!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {dietInstructions.map((instruction) => (
                  <div
                    key={instruction._id}
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <div>
                          <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            {instruction.fileName}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Uploaded on {new Date(instruction.createdAt).toLocaleDateString()} • {(instruction.fileSizeBytes / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        style={{ color: 'var(--color-error-red)', borderColor: 'rgba(184, 68, 68, 0.4)' }}
                        onClick={() => handleDeleteInstruction(instruction._id)}
                        disabled={isDeletingInstruction}
                      >
                        🗑️ Remove Guideline
                      </Button>
                    </div>

                    {/* Summary */}
                    {instruction.summary && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.5, backgroundColor: 'var(--color-sand-soft)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Summary:</strong> {instruction.summary}
                      </div>
                    )}

                    {/* Clinical Observations */}
                    {instruction.clinicalObservations && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        <strong>Doctor Notes:</strong> {instruction.clinicalObservations}
                      </div>
                    )}

                    {/* Prescribed targets if specified */}
                    {instruction.targetCaloriesKcal && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Prescribed Targets:</span>
                        <Badge variant="forest">{instruction.targetCaloriesKcal} kcal</Badge>
                        {instruction.targetProteinGrams && <Badge variant="sage">{instruction.targetProteinGrams}g Protein</Badge>}
                        {instruction.targetCarbsGrams && <Badge variant="neutral">{instruction.targetCarbsGrams}g Carbs</Badge>}
                        {instruction.targetFatGrams && <Badge variant="amber">{instruction.targetFatGrams}g Fat</Badge>}
                      </div>
                    )}

                    {/* Forbidden Foods & Recommended Foods Pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {instruction.forbiddenFoods && instruction.forbiddenFoods.length > 0 && (
                        <div style={{ backgroundColor: 'rgba(184, 68, 68, 0.05)', border: '1px solid rgba(184, 68, 68, 0.2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-error-red)', textTransform: 'uppercase', marginBottom: '6px' }}>
                            🚫 Forbidden / Avoid Foods:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {instruction.forbiddenFoods.map((food, i) => (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: 'rgba(184, 68, 68, 0.12)',
                                  color: 'var(--color-error-red)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                }}
                              >
                                ✕ {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {instruction.recommendedFoods && instruction.recommendedFoods.length > 0 && (
                        <div style={{ backgroundColor: 'var(--color-sage-soft)', border: '1px solid rgba(40, 91, 70, 0.2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-forest-green)', textTransform: 'uppercase', marginBottom: '6px' }}>
                            🌿 Recommended / Emphasized Foods:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {instruction.recommendedFoods.map((food, i) => (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: 'rgba(40, 91, 70, 0.15)',
                                  color: 'var(--color-forest-green)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                }}
                              >
                                ✓ {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dietary Rules & Meal Timing */}
                    {((instruction.dietaryRules && instruction.dietaryRules.length > 0) || (instruction.mealTimingNotes && instruction.mealTimingNotes.length > 0)) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {instruction.dietaryRules && instruction.dietaryRules.map((rule, idx) => (
                          <div key={`rule-${idx}`}>• {rule}</div>
                        ))}
                        {instruction.mealTimingNotes && instruction.mealTimingNotes.map((note, idx) => (
                          <div key={`timing-${idx}`}>⏰ {note}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DYNAMIC ML-POWERED FOOD RECOMMENDATIONS */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="leaf" size={24} />
              <div>
                <CardTitle>AI-Recommended Foods For Today</CardTitle>
                <CardDescription>
                  Custom multi-objective knapsack model: selects whole foods mathematically calculated to fit your remaining {remainingCal} kcal and {remainingP}g protein deficits.
                </CardDescription>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Badge variant="forest">
                🟢 ML Model Live
              </Badge>
              {recModelInfo && recModelInfo.activePdfInstructionsCount > 0 && (
                <Badge variant="sage">
                  📄 Guided by PDF Plan ({recModelInfo.activePdfInstructionsCount})
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {quickLogSuccess && (
            <div className="calories-success-banner" role="status" style={{ marginBottom: '16px' }}>
              <Icon name="check" size={18} />
              <span>{quickLogSuccess}</span>
            </div>
          )}

          {isLoadingRecs ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Calculating optimal macro convergence with custom model...
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              No recommendations needed: you have met your daily targets, or log more meals to refine suggestions.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  {/* Item Header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {rec.foodName}
                      </strong>
                      <Badge variant="forest">
                        {rec.matchScore}% Match
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{rec.category}</span>
                      <span>•</span>
                      <span>{rec.portionAmount} {rec.portionUnit}</span>
                      {rec.guidedByPdf && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--color-forest-green)', fontWeight: 600 }}>⭐ Dietitian Pick</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Macro Breakdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '6px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Cal</span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {rec.nutrition.caloriesKcal}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-forest-green)' }}>Prot</span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-forest-green)', fontFamily: 'var(--font-mono)' }}>
                        {rec.nutrition.proteinG}g
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-sage-green)' }}>Carb</span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-sage-green)', fontFamily: 'var(--font-mono)' }}>
                        {rec.nutrition.carbsG}g
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-amber)' }}>Fat</span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>
                        {rec.nutrition.fatG}g
                      </div>
                    </div>
                  </div>

                  {/* Clinical Reasoning */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    💡 {rec.reason}
                  </div>

                  {/* Action: Quick Log */}
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ width: '100%' }}
                    leftIcon={<Icon name="plus" size={14} />}
                    onClick={() => handleQuickLog(rec)}
                  >
                    + Quick Log to Diary
                  </Button>
                </div>
              ))}
            </div>
          )}
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
              {deficitBadgeText} • Goal in {numWeeks} Weeks
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

      {/* Goal Milestone Check-In Modal */}
      <GoalMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        goal={currentGoal}
        userProfile={userProfile}
        onUpdateProfileAndGoal={handleUpdateProfileAndGoal}
      />
    </div>
  );
};
