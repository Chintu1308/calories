import React, { useState, useEffect } from 'react';
import { Header, type NavTabId } from './components/layout/Header.js';
import { DashboardShell, type DashboardViewState } from './components/layout/DashboardShell.js';
import { MealsPage } from './pages/MealsPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AIScanPage } from './pages/AIScanPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { ErrorPage, type HttpErrorCode } from './components/errors/ErrorPage.js';
import { AddMealModal } from './components/meals/AddMealModal.js';
import { AuthOnboardingModal, type AuthModalMode } from './components/auth/AuthOnboardingModal.js';
import { CaloriesLogo, CaloriesTagline } from './components/ui/index.js';
import type { MealItem, MealType, DailyGoal, DayNutritionalSummary, UserProfile, SupplementItem } from './types/nutrition.js';
import { exportNutritionReportPdf } from './utils/exportPdf.js';
import { computeWeeklyTrend } from './utils/trendCalculator.js';
import { apiClient, getStoredToken, setStoredToken } from './api/apiClient.js';
import './App.css';

const DEFAULT_INITIAL_GOAL: DailyGoal = {
  dailyCaloriesKcal: 2000,
  proteinGrams: 150,
  carbohydrateGrams: 200,
  fatGrams: 65,
  targetWeight: 70,
  weightUnit: 'kg',
  title: 'Daily Nutrition Target',
};

export const App: React.FC = () => {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('calories_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(token && userProfile);

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

  // Sync meals to localStorage for client-side persistence
  useEffect(() => {
    if (isAuthenticated) {
      try {
        localStorage.setItem('calories_meals', JSON.stringify(meals));
      } catch {
        // Ignore localStorage write error
      }
    }
  }, [meals, isAuthenticated]);

  // Goal state persisted to localStorage and MongoDB
  const [goal, setGoal] = useState<DailyGoal>(() => {
    try {
      const saved = localStorage.getItem('calories_daily_goal');
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_GOAL;
    } catch {
      return DEFAULT_INITIAL_GOAL;
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      try {
        localStorage.setItem('calories_daily_goal', JSON.stringify(goal));
      } catch {
        // Ignore localStorage write error
      }
    }
  }, [goal, isAuthenticated]);

  // Persist userProfile to localStorage when updated
  useEffect(() => {
    if (userProfile) {
      try {
        localStorage.setItem('calories_user_profile', JSON.stringify(userProfile));
      } catch {
        // Ignore localStorage write error
      }
    }
  }, [userProfile]);

  // Logout handler
  const handleLogout = () => {
    apiClient.logout();
    setToken(null);
    setUserProfile(null);
    setMeals([]);
    try {
      localStorage.removeItem('calories_user_profile');
      localStorage.removeItem('calories_meals');
      localStorage.removeItem('calories_daily_goal');
    } catch {
      // Ignore storage clear error
    }
  };

  // Modal dialog states
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MealType>('Breakfast');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('edit_profile');

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
    currentWeightKg: userProfile?.currentWeightKg || 74.2,
    targetWeightKg: userProfile?.targetWeightKg || goal.targetWeight || 70.0,
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

  // Synchronize with backend API on mount ONLY when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const syncWithBackend = async () => {
      try {
        const [meRes, goalRes, mealsRes] = await Promise.allSettled([
          apiClient.getMe(),
          apiClient.getActiveGoal(),
          apiClient.getMeals({ limit: 50 }),
        ]);

        if (!isMounted) return;

        // Verify session validity
        if (meRes.status === 'fulfilled' && meRes.value?.user) {
          const u = meRes.value.user;
          const mappedSupplements: SupplementItem[] = (u.supplements || []).map((s) => ({
            id: s.id,
            name: s.name,
            dosage: s.dosage,
            timing: (s.timing as SupplementItem['timing']) || 'Morning',
            notes: s.notes,
          }));

          setUserProfile((prev) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            heightCm: u.heightCm || prev?.heightCm || 175,
            currentWeightKg: u.currentWeightKg || prev?.currentWeightKg || 75,
            targetWeightKg: u.targetWeightKg || prev?.targetWeightKg || 70,
            targetWeeks: u.targetWeeks || prev?.targetWeeks || 8,
            targetDate: prev?.targetDate || new Date().toISOString().split('T')[0],
            activityLevel: prev?.activityLevel || 'moderate',
            allergies: u.allergies || prev?.allergies || [],
            supplements: mappedSupplements.length > 0 ? mappedSupplements : prev?.supplements || [],
            primaryGoal: (u.primaryGoal as UserProfile['primaryGoal']) || prev?.primaryGoal || 'fat_loss',
          }));
        } else if (meRes.status === 'rejected' && (meRes.reason as { status?: number })?.status === 401) {
          handleLogout();
          return;
        }

        if (goalRes.status === 'fulfilled' && goalRes.value?.goal) {
          setGoal(goalRes.value.goal);
        }
        if (mealsRes.status === 'fulfilled' && mealsRes.value?.meals) {
          setMeals(mealsRes.value.meals);
        }
      } catch (err) {
        console.warn('[Calories Client] Backend sync offline notice:', err);
      }
    };

    syncWithBackend();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Intercept uncaught API HTTP errors and present the branded error page
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object' && 'status' in reason) {
        const status = Number(reason.status);
        if (status === 401) {
          // Session expired or unauthenticated, return smoothly to login
          handleLogout();
          event.preventDefault();
          return;
        }

        if ([400, 402, 403, 404, 500, 503].includes(status)) {
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
        if (status === 401) {
          handleLogout();
          return;
        }
        if ([400, 403, 404, 500, 503].includes(status)) {
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
        if (status === 401) {
          handleLogout();
          return;
        }
        if ([400, 403, 404, 500, 503].includes(status)) {
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
        if (status === 401) {
          handleLogout();
          return;
        }
        if ([400, 403, 404, 500, 503].includes(status)) {
          setActiveError({ code: status as HttpErrorCode, message: (err as { message?: string }).message });
        }
      }
    }
  };

  const handleOpenAuthModal = (mode: AuthModalMode = 'edit_profile') => {
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

  // If user is not authenticated, render the Auth/Sign-in Gate (NO dashboard shown without login)
  if (!isAuthenticated) {
    return (
      <AuthPage
        onAuthSuccess={(profile, newToken) => {
          setStoredToken(newToken);
          setToken(newToken);
          setUserProfile(profile);
          try {
            localStorage.setItem('calories_user_profile', JSON.stringify(profile));
          } catch {
            // Ignore storage error
          }
        }}
      />
    );
  }

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
          userName={userProfile?.name || 'User'}
          onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
          onLogout={handleLogout}
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
              Calories Platform - Complete Editorial Health-Tech Suite Verified.
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
          userName={userProfile?.name || 'User'}
          onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
          onLogout={handleLogout}
        />
      ) : (
        <div className="calories-showcase-layout">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenAddMeal={() => handleOpenAddMeal('Breakfast')}
            onOpenAIScan={() => setActiveTab('ai-scan')}
            userName={userProfile?.name || 'User'}
            onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
            onLogout={handleLogout}
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
                currentWeightKg={userProfile?.currentWeightKg}
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
                userProfile={userProfile || undefined}
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
                userAllergies={userProfile?.allergies || []}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                meals={meals}
                goal={goal}
                userProfile={userProfile || undefined}
                onEditProfile={() => handleOpenAuthModal('edit_profile')}
                onExportPdf={() =>
                  exportNutritionReportPdf({
                    userProfile: userProfile || {
                      id: '',
                      name: 'User',
                      email: '',
                      heightCm: 175,
                      currentWeightKg: 75,
                      targetWeightKg: 70,
                      targetWeeks: 8,
                      targetDate: new Date().toISOString().split('T')[0],
                      activityLevel: 'moderate',
                      allergies: [],
                      supplements: [],
                      primaryGoal: 'fat_loss',
                    },
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
              <CaloriesTagline />
              <CaloriesLogo size="sm" variant="image" />
              <span className="calories-footer-text">
                Calories Platform - Complete Editorial Health-Tech Suite Verified.
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

      {/* USER EDIT PROFILE MODAL */}
      {userProfile && (
        <AuthOnboardingModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          currentProfile={userProfile}
          onSaveProfile={handleSaveUserProfile}
          onAuthSuccess={(name) => {
            setUserProfile((prev) => (prev ? { ...prev, name } : null));
          }}
        />
      )}
    </>
  );
};

export default App;
