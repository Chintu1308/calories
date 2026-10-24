import React, { useState, useEffect } from 'react';
import { Header, type NavTabId } from './components/layout/Header.js';
import { DashboardShell, type DashboardViewState } from './components/layout/DashboardShell.js';
import { MealsPage } from './pages/MealsPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AIScanPage } from './pages/AIScanPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ErrorPage, type HttpErrorCode } from './components/errors/ErrorPage.js';
import { AddMealModal } from './components/meals/AddMealModal.js';
import { AuthOnboardingModal, type AuthModalMode } from './components/auth/AuthOnboardingModal.js';
import { CaloriesLogo } from './components/ui/index.js';
import {
  SAMPLE_DAILY_GOAL,
  SAMPLE_USER_PROFILE,
} from './data/mockNutritionData.js';
import type { MealItem, MealType, DailyGoal, DayNutritionalSummary, UserProfile } from './types/nutrition.js';
import { exportNutritionReportPdf } from './utils/exportPdf.js';
import { computeWeeklyTrend } from './utils/trendCalculator.js';
import { apiClient } from './api/apiClient.js';
import './App.css';

export const App: React.FC = () => {
  // Navigation & State Management
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [viewState, setViewState] = useState<DashboardViewState>('normal');
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);

  // Error boundary state: renders error screen only when an actual error occurs
  const [activeError, setActiveError] = useState<{
    code: HttpErrorCode;
    message?: string;
  } | null>(null);

  // Real meal entries state (hydrated from localStorage or MongoDB backend)
  const [meals, setMeals] = useState<MealItem[]>(() => {
    try {
      const saved = localStorage.getItem('calories_meals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Sync meals to localStorage for client-side persistence and offline resilience
  useEffect(() => {
    try {
      localStorage.setItem('calories_meals', JSON.stringify(meals));
    } catch {
      // Ignore localStorage write error
    }
  }, [meals]);

  // Goal state persisted to localStorage and MongoDB
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

  // Synchronize with backend API on mount
  useEffect(() => {
    let isMounted = true;
    const syncWithBackend = async () => {
      try {
        const [goalRes, mealsRes] = await Promise.allSettled([
          apiClient.getActiveGoal(),
          apiClient.getMeals({ limit: 50 }),
        ]);
        if (!isMounted) return;
        if (goalRes.status === 'fulfilled' && goalRes.value?.goal) {
          setGoal(goalRes.value.goal);
        }
        if (mealsRes.status === 'fulfilled' && mealsRes.value?.meals?.length > 0) {
          setMeals(mealsRes.value.meals);
        }
      } catch {
        // Retain local defaults if server is unreachable
      }
    };
    syncWithBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Intercept uncaught API HTTP errors and present the branded error page
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object' && 'status' in reason) {
        const status = Number(reason.status);
        if ([400, 401, 402, 403, 404, 500, 503].includes(status)) {
          setActiveError({
            code: status as HttpErrorCode,
            message: (reason as { message?: string }).message || undefined,
          });
          event.preventDefault();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleDeleteMeal = async (mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
    try {
      await apiClient.deleteMeal(mealId);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const status = Number((err as { status: number }).status);
        if ([400, 401, 403, 404, 500, 503].includes(status)) {
          setActiveError({ code: status as HttpErrorCode, message: (err as { message?: string }).message });
        }
      }
    }
  };

  const handleSaveMeal = async (newMeal: MealItem) => {
    setMeals((prev) => [newMeal, ...prev]);
    try {
      await apiClient.createMeal(newMeal);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const status = Number((err as { status: number }).status);
        if ([400, 401, 403, 404, 500, 503].includes(status)) {
          setActiveError({ code: status as HttpErrorCode, message: (err as { message?: string }).message });
        }
      }
    }
  };

  const handleSaveGoal = async (updatedGoal: DailyGoal) => {
    setGoal(updatedGoal);
    try {
      await apiClient.putActiveGoal(updatedGoal);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const status = Number((err as { status: number }).status);
        if ([400, 401, 403, 404, 500, 503].includes(status)) {
          setActiveError({ code: status as HttpErrorCode, message: (err as { message?: string }).message });
        }
      }
    }
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

  // Dynamic rolling 7-day trend calculated from user's genuine meal entries
  const weeklyTrend = computeWeeklyTrend(meals, goal.dailyCaloriesKcal);

  // If an active HTTP error has been triggered, display the branded ErrorPage
  if (activeError) {
    return (
      <div className="calories-showcase-layout">
        <Header
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveError(null);
            setActiveTab(tab);
          }}
          onOpenAddMeal={() => handleOpenAddMeal('Breakfast')}
          onOpenAIScan={() => {
            setActiveError(null);
            setActiveTab('ai-scan');
          }}
          userName={userProfile.name}
          onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
        />

        <main className="calories-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
          <ErrorPage
            code={activeError.code}
            customMessage={activeError.message}
            onNavigateDashboard={() => setActiveError(null)}
            onRetry={() => {
              setActiveError(null);
              window.location.reload();
            }}
          />
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
    );
  }

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
          weeklyTrend={weeklyTrend}
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
                onSaveGoal={handleSaveGoal}
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
                weeklyTrend={weeklyTrend}
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
                    weeklyTrend,
                  })
                }
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
