import React, { useState, useEffect } from 'react';
import { Header, type NavTabId } from './components/layout/Header.js';
import { DashboardShell, type DashboardViewState } from './components/layout/DashboardShell.js';
import { MealsPage } from './pages/MealsPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AIScanPage } from './pages/AIScanPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ErrorsPage } from './pages/ErrorsPage.js';
import { AddMealModal } from './components/meals/AddMealModal.js';
import { AuthOnboardingModal, type AuthModalMode } from './components/auth/AuthOnboardingModal.js';
import { CaloriesLogo } from './components/ui/index.js';
import {
  SAMPLE_DAILY_GOAL,
  SAMPLE_MEALS,
  SAMPLE_WEEKLY_TREND,
  SAMPLE_USER_PROFILE,
} from './data/mockNutritionData.js';
import type { MealItem, MealType, DailyGoal, DayNutritionalSummary, UserProfile } from './types/nutrition.js';
import { exportNutritionReportPdf } from './utils/exportPdf.js';
import './App.css';

export const App: React.FC = () => {
  // Navigation & State Management
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [viewState, setViewState] = useState<DashboardViewState>('normal');
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const [meals, setMeals] = useState<MealItem[]>(SAMPLE_MEALS);
  const [goal, setGoal] = useState<DailyGoal>(() => {
    try {
      const saved = localStorage.getItem('calories_daily_goal');
      return saved ? JSON.parse(saved) : SAMPLE_DAILY_GOAL;
    } catch {
      return SAMPLE_DAILY_GOAL;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('calories_daily_goal', JSON.stringify(goal));
    } catch {
      // Ignore localStorage write error
    }
  }, [goal]);

  // User Profile & Onboarding State (persisted to localStorage)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('calories_user_profile');
      return saved ? JSON.parse(saved) : SAMPLE_USER_PROFILE;
    } catch {
      return SAMPLE_USER_PROFILE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('calories_user_profile', JSON.stringify(userProfile));
    } catch {
      // Ignore localStorage write error
    }
  }, [userProfile]);

  // Modal dialog states
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MealType>('Breakfast');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('register');

  // Dynamic calculations from meals
  const consumedCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
  const consumedProtein = meals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
  const consumedCarbs = meals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
  const consumedFat = meals.reduce((acc, m) => acc + m.nutrition.fatG, 0);

  const remainingCalories = Math.max(0, goal.dailyCaloriesKcal - consumedCalories);
  const remainingProtein = Math.max(0, goal.proteinGrams - consumedProtein);
  const remainingCarbs = Math.max(0, goal.carbohydrateGrams - consumedCarbs);
  const remainingFat = Math.max(0, goal.fatGrams - consumedFat);

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
    currentWeightKg: userProfile.currentWeightKg || 74.2,
    targetWeightKg: userProfile.targetWeightKg || goal.targetWeight || 70.0,
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

  const handleOpenAddMeal = (category: MealType = 'Breakfast') => {
    setSelectedCategory(category);
    setIsAddMealOpen(true);
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  };

  const handleSaveMeal = (newMeal: MealItem) => {
    setMeals((prev) => [newMeal, ...prev]);
  };

  const handleOpenAuthModal = (mode: AuthModalMode = 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSaveUserProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (updatedProfile.targetWeightKg) {
      setGoal((prev) => ({
        ...prev,
        targetWeight: updatedProfile.targetWeightKg,
        targetWeeks: updatedProfile.targetWeeks,
      }));
    }
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
          onOpenAIScan={() => setActiveTab('ai-scan')}
          userName={userProfile.name}
          onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
        />
      ) : (
        <div className="calories-showcase-layout">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenAddMeal={() => handleOpenAddMeal('Breakfast')}
            onOpenAIScan={() => setActiveTab('ai-scan')}
            userName={userProfile.name}
            onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
          />

          <main className="calories-main">
            {activeTab === 'meals' && (
              <MealsPage
                meals={meals}
                onOpenAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onOpenAIScan={() => setActiveTab('ai-scan')}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsPage
                currentGoal={goal}
                onSaveGoal={setGoal}
                currentWeightKg={userProfile.currentWeightKg}
                consumedCalories={consumedCalories}
                consumedProtein={consumedProtein}
                consumedCarbs={consumedCarbs}
                consumedFat={consumedFat}
                onQuickLogMeal={handleSaveMeal}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsPage
                meals={meals}
                goal={goal}
                userProfile={userProfile}
              />
            )}

            {activeTab === 'ai-scan' && (
              <AIScanPage
                onCommitMeal={(newMeal) => {
                  setMeals((prev) => [newMeal, ...prev]);
                }}
                onNavigateJournal={() => setActiveTab('meals')}
                remainingCalories={remainingCalories}
                remainingProtein={remainingProtein}
                remainingCarbs={remainingCarbs}
                remainingFat={remainingFat}
                userAllergies={userProfile.allergies}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                meals={meals}
                goal={goal}
                userProfile={userProfile}
                onEditProfile={() => handleOpenAuthModal('edit_profile')}
                onExportPdf={() =>
                  exportNutritionReportPdf({
                    userProfile,
                    goal,
                    meals,
                    weeklyTrend: SAMPLE_WEEKLY_TREND,
                  })
                }
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

      {/* DUAL OPTION ADD MEAL MODAL (Manual Entry vs Photo & Dish Name) */}
      <AddMealModal
        isOpen={isAddMealOpen}
        onClose={() => setIsAddMealOpen(false)}
        defaultCategory={selectedCategory}
        onSaveMeal={handleSaveMeal}
      />

      {/* USER REGISTER / LOGIN & HEALTH ONBOARDING PROFILE MODAL */}
      <AuthOnboardingModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        currentProfile={userProfile}
        onSaveProfile={handleSaveUserProfile}
        onAuthSuccess={(name) => {
          setUserProfile((prev) => ({ ...prev, name }));
        }}
      />
    </>
  );
};

export default App;
