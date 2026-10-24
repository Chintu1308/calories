import React, { useState } from 'react';
import { Header, type NavTabId } from './components/layout/Header.js';
import { DashboardShell, type DashboardViewState } from './components/layout/DashboardShell.js';
import { MealsPage } from './pages/MealsPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AIScanPage } from './pages/AIScanPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ErrorsPage } from './pages/ErrorsPage.js';
import {
  Button,
  Input,
  Select,
  FormField,
  Icon,
  CaloriesLogo,
} from './components/ui/index.js';
import {
  SAMPLE_DAILY_GOAL,
  SAMPLE_MEALS,
  SAMPLE_WEEKLY_TREND,
} from './data/mockNutritionData.js';
import type { MealItem, MealType, DailyGoal, DayNutritionalSummary } from './types/nutrition.js';
import './App.css';

export const App: React.FC = () => {
  // Navigation & State Management
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [viewState, setViewState] = useState<DashboardViewState>('normal');
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const [meals, setMeals] = useState<MealItem[]>(SAMPLE_MEALS);
  const [goal, setGoal] = useState<DailyGoal>(SAMPLE_DAILY_GOAL);

  // Modal dialog states
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [isAIScanOpen, setIsAIScanOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MealType>('Breakfast');
  const [newFoodName, setNewFoodName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [newQuantity, setNewQuantity] = useState('150');
  const [newUnit, setNewUnit] = useState('g');
  const [formError, setFormError] = useState('');

  // AI Mock State inside modal
  const [aiScanLoading, setAiScanLoading] = useState(false);
  const [aiProposedItem, setAiProposedItem] = useState<{
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
  } | null>(null);

  // Dynamic calculations from meals
  const consumedCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
  const consumedProtein = meals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
  const consumedCarbs = meals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
  const consumedFat = meals.reduce((acc, m) => acc + m.nutrition.fatG, 0);

  const daySummary: DayNutritionalSummary = {
    consumedCalories,
    targetCalories: goal.dailyCaloriesKcal,
    consumedProtein,
    targetProtein: goal.proteinGrams,
    consumedCarbs,
    targetCarbs: goal.carbohydrateGrams,
    consumedFat,
    targetFat: goal.fatGrams,
    waterIntakeMl: 2250,
    targetWaterMl: 3000,
    currentWeightKg: 74.2,
    targetWeightKg: goal.targetWeight || 72.0,
  };

  // Date labels
  const dateLabels = [
    'Saturday, 24 October 2026',
    'Friday, 23 October 2026',
    'Thursday, 22 October 2026',
    'Wednesday, 21 October 2026',
  ];
  const currentDateLabel = dateLabels[currentDateIndex] || 'Today';

  const handlePrevDay = () => {
    if (currentDateIndex < dateLabels.length - 1) {
      setCurrentDateIndex((prev) => prev + 1);
    }
  };

  const handleNextDay = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex((prev) => prev - 1);
    }
  };

  const handleToday = () => {
    setCurrentDateIndex(0);
  };

  const handleOpenAddMeal = (category: MealType) => {
    setSelectedCategory(category);
    setNewFoodName('');
    setNewCalories('');
    setNewProtein('');
    setNewCarbs('');
    setNewFat('');
    setFormError('');
    setIsAddMealOpen(true);
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  };

  const handleSaveMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName.trim()) {
      setFormError('Food name is required.');
      return;
    }
    const cal = Number(newCalories);
    if (!newCalories || Number.isNaN(cal) || cal <= 0) {
      setFormError('Please enter a valid positive calorie amount.');
      return;
    }

    const newMeal: MealItem = {
      id: `meal_${Date.now()}`,
      userId: 'user_demo_student',
      foodName: newFoodName.trim(),
      mealType: selectedCategory,
      eatenAt: new Date().toISOString(),
      quantity: {
        amount: Number(newQuantity) || 100,
        unit: newUnit,
      },
      nutrition: {
        caloriesKcal: cal,
        proteinG: Number(newProtein) || 0,
        carbsG: Number(newCarbs) || 0,
        fatG: Number(newFat) || 0,
      },
      source: 'manual',
      notes: 'Added from manual food log',
    };

    setMeals((prev) => [newMeal, ...prev]);
    setIsAddMealOpen(false);
  };

  const handleSimulateAIScan = () => {
    setAiScanLoading(true);
    setAiProposedItem(null);
    setTimeout(() => {
      setAiProposedItem({
        foodName: 'Avocado Toast with Poached Egg',
        calories: 340,
        protein: 15,
        carbs: 26,
        fat: 19,
        confidence: 0.92,
      });
      setAiScanLoading(false);
    }, 900);
  };

  const handleConfirmAIMeal = () => {
    if (!aiProposedItem) return;
    const newMeal: MealItem = {
      id: `meal_ai_${Date.now()}`,
      userId: 'user_demo_student',
      foodName: aiProposedItem.foodName,
      mealType: 'Breakfast',
      eatenAt: new Date().toISOString(),
      quantity: {
        amount: 1,
        unit: 'serving',
      },
      nutrition: {
        caloriesKcal: aiProposedItem.calories,
        proteinG: aiProposedItem.protein,
        carbsG: aiProposedItem.carbs,
        fatG: aiProposedItem.fat,
      },
      source: 'ai',
      notes: 'Extracted from image scan; confirmed by user',
    };

    setMeals((prev) => [newMeal, ...prev]);
    setIsAIScanOpen(false);
    setAiProposedItem(null);
  };

  return (
    <>
      {/* View Router */}
      {activeTab === 'dashboard' ? (
        <DashboardShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          viewState={viewState}
          onViewStateChange={setViewState}
          currentDateLabel={currentDateLabel}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          summary={daySummary}
          meals={meals}
          weeklyTrend={SAMPLE_WEEKLY_TREND}
          onAddMeal={handleOpenAddMeal}
          onOpenAIScan={() => setIsAIScanOpen(true)}
        />
      ) : (
        <div className="calories-showcase-layout">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenAddMeal={() => handleOpenAddMeal('Breakfast')}
            onOpenAIScan={() => setIsAIScanOpen(true)}
          />

          <main className="calories-main">
            {activeTab === 'meals' && (
              <MealsPage
                meals={meals}
                onOpenAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onOpenAIScan={() => setIsAIScanOpen(true)}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsPage
                currentGoal={goal}
                onSaveGoal={setGoal}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsPage
                meals={meals}
                goal={goal}
              />
            )}

            {activeTab === 'ai-scan' && (
              <AIScanPage
                onCommitMeal={(newMeal) => setMeals((prev) => [newMeal, ...prev])}
                onNavigateJournal={() => setActiveTab('meals')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                meals={meals}
                goal={goal}
              />
            )}

            {activeTab === 'errors' && (
              <ErrorsPage
                onNavigateDashboard={() => setActiveTab('dashboard')}
              />
            )}
          </main>

          <footer className="calories-footer">
            <div className="calories-footer-container">
              <CaloriesLogo size="sm" variant="image" />
              <span className="calories-footer-text">
                Calories Platform — Complete Editorial Health-Tech Suite Verified.
              </span>
              <span className="calories-footer-domain">calories.bhhc.me</span>
            </div>
          </footer>
        </div>
      )}

      {/* Manual Add Meal Modal */}
      {isAddMealOpen && (
        <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-add-title">
          <div className="calories-modal-card">
            <div className="calories-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="plus" size={20} />
                <h3 id="modal-add-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                  Log Food Entry
                </h3>
              </div>
              <button
                type="button"
                className="calories-modal-close-btn"
                onClick={() => setIsAddMealOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="calories-modal-body">
              <FormField label="Meal Category" htmlFor="modal-category" required={true}>
                <Select
                  id="modal-category"
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
                htmlFor="modal-food-name"
                required={true}
                error={formError}
                hint="e.g. Greek Yogurt with Mixed Berries"
              >
                <Input
                  id="modal-food-name"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  placeholder="Enter food name..."
                  autoFocus={true}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <FormField label="Quantity Amount" htmlFor="modal-qty">
                  <Input
                    id="modal-qty"
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                  />
                </FormField>
                <FormField label="Unit" htmlFor="modal-unit">
                  <Select
                    id="modal-unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    options={[
                      { value: 'g', label: 'g (grams)' },
                      { value: 'ml', label: 'ml (milliliters)' },
                      { value: 'serving', label: 'serving' },
                      { value: 'cup', label: 'cup' },
                      { value: 'oz', label: 'oz' },
                    ]}
                  />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <FormField label="Calories" htmlFor="modal-cal" required={true}>
                  <Input
                    id="modal-cal"
                    type="number"
                    value={newCalories}
                    onChange={(e) => setNewCalories(e.target.value)}
                    placeholder="350"
                  />
                </FormField>
                <FormField label="Protein (g)" htmlFor="modal-protein">
                  <Input
                    id="modal-protein"
                    type="number"
                    value={newProtein}
                    onChange={(e) => setNewProtein(e.target.value)}
                    placeholder="25"
                  />
                </FormField>
                <FormField label="Carbs (g)" htmlFor="modal-carbs">
                  <Input
                    id="modal-carbs"
                    type="number"
                    value={newCarbs}
                    onChange={(e) => setNewCarbs(e.target.value)}
                    placeholder="40"
                  />
                </FormField>
                <FormField label="Fat (g)" htmlFor="modal-fat">
                  <Input
                    id="modal-fat"
                    type="number"
                    value={newFat}
                    onChange={(e) => setNewFat(e.target.value)}
                    placeholder="10"
                  />
                </FormField>
              </div>

              <div className="calories-modal-footer">
                <Button variant="ghost" size="md" onClick={() => setIsAddMealOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save to {selectedCategory}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Extraction Modal */}
      {isAIScanOpen && (
        <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-ai-title">
          <div className="calories-modal-card">
            <div className="calories-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="ai-scan" size={22} />
                <h3 id="modal-ai-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                  AI Nutrition Scanner
                </h3>
              </div>
              <button
                type="button"
                className="calories-modal-close-btn"
                onClick={() => setIsAIScanOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="calories-modal-body">
              <div className="calories-ai-upload-dropzone">
                <Icon name="camera" size={36} />
                <div style={{ marginTop: '8px', fontWeight: 600 }}>
                  Upload Food Photo or Nutrition Label
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Accepts JPEG, PNG, or WebP up to 5MB. AI proposes values for review; never saved without confirmation.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ marginTop: '14px' }}
                  onClick={handleSimulateAIScan}
                  isLoading={aiScanLoading}
                >
                  {aiScanLoading ? 'Analyzing Nutritional Values...' : 'Simulate Plate Scan'}
                </Button>
              </div>

              {aiProposedItem && (
                <div className="calories-ai-proposal-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{aiProposedItem.foodName}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                      Confidence: {Math.round(aiProposedItem.confidence * 100)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: 'var(--text-xs)' }}>
                    <span>Calories: <strong>{aiProposedItem.calories} kcal</strong></span>
                    <span>Protein: <strong>{aiProposedItem.protein}g</strong></span>
                    <span>Carbs: <strong>{aiProposedItem.carbs}g</strong></span>
                    <span>Fat: <strong>{aiProposedItem.fat}g</strong></span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
                    ⚠️ Proposal only. Please verify the estimates before committing to your journal.
                  </div>
                </div>
              )}

              <div className="calories-modal-footer">
                <Button variant="ghost" size="md" onClick={() => setIsAIScanOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmAIMeal}
                  disabled={!aiProposedItem}
                >
                  Confirm &amp; Save Meal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
