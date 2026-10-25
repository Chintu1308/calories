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
import { TermsPrivacyModal } from './components/auth/TermsPrivacyModal.js';
import { NutritionChatAssistant } from './components/chat/NutritionChatAssistant.js';
import { CaloriesLogo, CaloriesTagline } from './components/ui/index.js';
import type { MealItem, MealType, DailyGoal, DayNutritionalSummary, UserProfile, SupplementItem, WaterLogEntry, SupplementLogEntry } from './types/nutrition.js';
import { exportNutritionReportPdf } from './utils/exportPdf.js';
import { computeWeeklyTrend } from './utils/trendCalculator.js';
import {
  getNotificationPermission,
  requestNotificationPermission,
  checkAndSendMissedReminders,
} from './utils/notificationService.js';
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

function mapApiUserToProfile(u: any, prev?: UserProfile | null): UserProfile {
  const mappedSupplements: SupplementItem[] = (u.supplements || []).map((s: any) => ({
    id: s.id || `supp_${Math.random().toString(36).substring(2, 7)}`,
    name: s.name,
    dosage: s.dosage,
    timing: (s.timing as SupplementItem['timing']) || 'Morning',
    notes: s.notes,
  }));

  const targetW = u.targetWeightKg !== undefined ? u.targetWeightKg : prev?.targetWeightKg || 70;
  const targetWks = u.targetWeeks !== undefined ? u.targetWeeks : prev?.targetWeeks || 8;
  const d = new Date();
  d.setDate(d.getDate() + targetWks * 7);

  return {
    id: u._id || u.id || prev?.id || '',
    name: u.name || prev?.name || 'User',
    email: u.email || prev?.email || '',
    heightCm: u.heightCm || prev?.heightCm || 175,
    currentWeightKg: u.currentWeightKg || prev?.currentWeightKg || 75,
    targetWeightKg: targetW,
    targetWeeks: targetWks,
    targetDate: d.toISOString().split('T')[0],
    activityLevel: prev?.activityLevel || 'moderate',
    allergies: u.allergies || prev?.allergies || [],
    supplements: mappedSupplements.length > 0 ? mappedSupplements : prev?.supplements || [],
    primaryGoal: (u.primaryGoal as UserProfile['primaryGoal']) || prev?.primaryGoal || 'fat_loss',
    termsAccepted: !!(u.termsAccepted ?? prev?.termsAccepted),
    termsAcceptedAt: u.termsAcceptedAt || prev?.termsAcceptedAt || undefined,
    supabaseId: u.supabaseId || prev?.supabaseId || undefined,
  };
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMealLocalDateString(eatenAt?: string | Date): string {
  if (!eatenAt) return '';
  try {
    const d = new Date(eatenAt);
    if (isNaN(d.getTime())) return '';
    return getLocalDateString(d);
  } catch {
    return '';
  }
}

function formatDisplayDate(offset: number): string {
  const target = new Date();
  target.setDate(target.getDate() - offset);

  const formatted = target.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (offset === 0) {
    return `Today (${formatted})`;
  }
  if (offset === 1) {
    return `Yesterday (${formatted})`;
  }
  return formatted;
}

function computeDateBounds(offset: number): { selectedDateString: string; todayString: string } {
  const selectedDateObj = new Date();
  selectedDateObj.setDate(selectedDateObj.getDate() - offset);
  const selectedDateString = getLocalDateString(selectedDateObj);
  const todayString = getLocalDateString(new Date());
  return { selectedDateString, todayString };
}

const DEFAULT_SUPPLEMENTS: SupplementItem[] = [
  { id: 'supp_creatine', name: 'Creatine Monohydrate', dosage: '5g', timing: 'Morning', notes: 'Daily cellular hydration & power' },
  { id: 'supp_vitd', name: 'Vitamin D3 & K2', dosage: '2000 IU', timing: 'Morning', notes: 'Bone density and immune regulation' },
  { id: 'supp_omega3', name: 'Omega-3 Fish Oil', dosage: '1000mg', timing: 'Evening', notes: 'Cardiovascular and anti-inflammatory' },
];

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
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);

  // Error boundary state: renders error screen only when an actual error occurs
  const [activeError, setActiveError] = useState<{
    code: HttpErrorCode;
    message?: string;
  } | null>(null);

  // In-app notification toast state (ensures reminders are never missed)
  const [inAppToast, setInAppToast] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const handleInAppNotif = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string }>;
      if (customEvent.detail) {
        setInAppToast({
          title: customEvent.detail.title,
          body: customEvent.detail.body,
        });
        setTimeout(() => {
          setInAppToast((current) => (current?.title === customEvent.detail.title ? null : current));
        }, 6000);
      }
    };

    window.addEventListener('calories:notification', handleInAppNotif);
    return () => window.removeEventListener('calories:notification', handleInAppNotif);
  }, []);

  // Real meal entries state (hydrated from localStorage or MongoDB backend)
  const [meals, setMeals] = useState<MealItem[]>(() => {
    try {
      const saved = localStorage.getItem('calories_meals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((m: any) => ({
            ...m,
            id: m.id || m._id || (typeof m._id === 'object' ? String(m._id) : `meal_${Date.now()}`),
          }));
        }
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

  // Water logging state persisted to localStorage
  const [waterLogs, setWaterLogs] = useState<WaterLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('calories_water_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('calories_water_logs', JSON.stringify(waterLogs));
    } catch {
      // ignore
    }
  }, [waterLogs]);

  // Supplement intake logging state persisted to localStorage
  const [supplementLogs, setSupplementLogs] = useState<SupplementLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('calories_supplement_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('calories_supplement_logs', JSON.stringify(supplementLogs));
    } catch {
      // ignore
    }
  }, [supplementLogs]);

  // Browser notification permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  // Modal dialog states
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealType>('Breakfast');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('edit_profile');

  // Dynamic calculations from meals
  const currentDateLabel = formatDisplayDate(selectedDateOffset);

  // Selected date bounds for dashboard filtering
  const { selectedDateString, todayString } = React.useMemo(
    () => computeDateBounds(selectedDateOffset),
    [selectedDateOffset]
  );

  // Filter meals for the selected date on Dashboard
  const selectedDayMeals = meals.filter(
    (m) => getMealLocalDateString(m.eatenAt) === selectedDateString
  );

  // Filter meals for today (for remaining budget in goals & AI scanner)
  const todayMeals = meals.filter(
    (m) => getMealLocalDateString(m.eatenAt) === todayString
  );

  // Selected day water logs & totals
  const selectedDayWater = waterLogs.filter(
    (w) => getMealLocalDateString(w.loggedAt) === selectedDateString
  );
  const totalWaterConsumedMl = selectedDayWater.reduce((acc, w) => acc + w.amountMl, 0);

  // Selected day supplement logs
  const selectedDaySupplementLogs = supplementLogs.filter(
    (s) => getMealLocalDateString(s.loggedAt) === selectedDateString
  );

  // User supplements (with fallback defaults if user has none configured)
  const activeUserSupplements =
    userProfile?.supplements && userProfile.supplements.length > 0
      ? userProfile.supplements
      : DEFAULT_SUPPLEMENTS;

  const selectedDayCalories = selectedDayMeals.reduce((acc, m) => acc + (m.nutrition?.caloriesKcal || 0), 0);
  const selectedDayProtein = selectedDayMeals.reduce((acc, m) => acc + (m.nutrition?.proteinG || 0), 0);
  const selectedDayCarbs = selectedDayMeals.reduce((acc, m) => acc + (m.nutrition?.carbsG || 0), 0);
  const selectedDayFat = selectedDayMeals.reduce((acc, m) => acc + (m.nutrition?.fatG || 0), 0);

  const todayCalories = todayMeals.reduce((acc, m) => acc + (m.nutrition?.caloriesKcal || 0), 0);
  const todayProtein = todayMeals.reduce((acc, m) => acc + (m.nutrition?.proteinG || 0), 0);
  const todayCarbs = todayMeals.reduce((acc, m) => acc + (m.nutrition?.carbsG || 0), 0);
  const todayFat = todayMeals.reduce((acc, m) => acc + (m.nutrition?.fatG || 0), 0);

  const remainingCalories = Math.max(0, goal.dailyCaloriesKcal - todayCalories);
  const remainingProtein = Math.max(0, goal.proteinGrams - todayProtein);
  const remainingCarbs = Math.max(0, goal.carbohydrateGrams - todayCarbs);
  const remainingFat = Math.max(0, goal.fatGrams - todayFat);

  const daySummary: DayNutritionalSummary = {
    consumedCalories: selectedDayCalories,
    targetCalories: goal.dailyCaloriesKcal,
    consumedProtein: selectedDayProtein,
    targetProtein: goal.proteinGrams,
    consumedCarbs: selectedDayCarbs,
    targetCarbs: goal.carbohydrateGrams,
    consumedFat: selectedDayFat,
    targetFat: goal.fatGrams,
    waterIntakeMl: totalWaterConsumedMl,
    targetWaterMl: 3000,
    currentWeightKg: userProfile?.currentWeightKg || 74.2,
    targetWeightKg: goal.targetWeight || userProfile?.targetWeightKg || 70.0,
  };

  const handlePrevDay = () => {
    setSelectedDateOffset((prev) => prev + 1);
  };

  const handleNextDay = () => {
    setSelectedDateOffset((prev) => Math.max(0, prev - 1));
  };

  const handleToday = () => {
    setSelectedDateOffset(0);
  };

  const handleOpenAddMeal = (category: MealType = 'Breakfast') => {
    setEditingMeal(null);
    setSelectedCategory(category);
    setIsAddMealOpen(true);
  };

  const handleOpenEditMeal = (meal: MealItem) => {
    setEditingMeal(meal);
    setSelectedCategory(meal.mealType);
    setIsAddMealOpen(true);
  };

  // Water logging handlers
  const handleLogWater = (amountMl: number, note?: string) => {
    const now = new Date();
    const parts = selectedDateString.split('-').map(Number);
    const loggedAtDate = new Date(parts[0] || now.getFullYear(), (parts[1] || 1) - 1, parts[2] || now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

    const entry: WaterLogEntry = {
      id: `water_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountMl,
      loggedAt: loggedAtDate.toISOString(),
      note,
    };
    setWaterLogs((prev) => [entry, ...prev]);
  };

  const handleDeleteWaterLog = (id: string) => {
    setWaterLogs((prev) => prev.filter((w) => w.id !== id));
  };

  // Supplement toggle handler
  const handleToggleSupplement = (supplement: SupplementItem) => {
    const isAlreadyTaken = selectedDaySupplementLogs.some(
      (log) => log.supplementId === supplement.id && log.taken
    );

    if (isAlreadyTaken) {
      setSupplementLogs((prev) =>
        prev.filter(
          (log) =>
            !(
              log.supplementId === supplement.id &&
              getMealLocalDateString(log.loggedAt) === selectedDateString
            )
        )
      );
    } else {
      const now = new Date();
      const parts = selectedDateString.split('-').map(Number);
      const loggedAtDate = new Date(parts[0] || now.getFullYear(), (parts[1] || 1) - 1, parts[2] || now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

      const newLog: SupplementLogEntry = {
        id: `supplog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        supplementId: supplement.id,
        name: supplement.name,
        dosage: supplement.dosage,
        timing: supplement.timing,
        loggedAt: loggedAtDate.toISOString(),
        taken: true,
      };
      setSupplementLogs((prev) => [newLog, ...prev]);
    }
  };

  // Periodically evaluate reminders for missed meals, supplements, and water
  useEffect(() => {
    if (!isAuthenticated) return;

    const runRemindersCheck = () => {
      const todayWater = waterLogs.filter((w) => getMealLocalDateString(w.loggedAt) === todayString);
      const todaySupps = supplementLogs.filter((s) => getMealLocalDateString(s.loggedAt) === todayString);

      checkAndSendMissedReminders({
        meals: todayMeals,
        userSupplements: activeUserSupplements,
        supplementLogs: todaySupps,
        waterLogs: todayWater,
      });
    };

    runRemindersCheck();
    const intervalId = setInterval(runRemindersCheck, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runRemindersCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, todayMeals, activeUserSupplements, supplementLogs, waterLogs, todayString]);

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
          setUserProfile((prev) => mapApiUserToProfile(u, prev));
        } else if (meRes.status === 'rejected' && (meRes.reason as { status?: number })?.status === 401) {
          handleLogout();
          return;
        }

        if (goalRes.status === 'fulfilled' && goalRes.value?.goal) {
          setGoal(goalRes.value.goal);
        }
        if (mealsRes.status === 'fulfilled' && mealsRes.value?.meals) {
          const normalized = mealsRes.value.meals.map((m: any) => ({
            ...m,
            id: m.id || m._id || (typeof m._id === 'object' ? String(m._id) : `meal_${Date.now()}`),
          }));
          setMeals(normalized);
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
    setMeals((prev) => prev.filter((m) => m.id !== mealId && (m as any)._id !== mealId));
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

  const handleUpdateMeal = async (mealId: string, updatedFields: Partial<MealItem>) => {
    // Optimistically update state
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId || (m as any)._id === mealId
          ? {
              ...m,
              ...updatedFields,
              quantity: { ...m.quantity, ...(updatedFields.quantity || {}) },
              nutrition: { ...m.nutrition, ...(updatedFields.nutrition || {}) },
            }
          : m
      )
    );
    try {
      const res = await apiClient.updateMeal(mealId, updatedFields);
      if (res?.meal) {
        setMeals((prev) =>
          prev.map((m) =>
            m.id === mealId || (m as any)._id === mealId
              ? { ...res.meal, id: res.meal.id || (res.meal as any)._id || mealId }
              : m
          )
        );
      }
    } catch (err: unknown) {
      console.warn('[Calories] Failed to update meal on backend:', err);
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
    // Optimistically add to state
    setMeals((prev) => [newMeal, ...prev]);
    try {
      const res = await apiClient.createMeal(newMeal);
      if (res?.meal) {
        // Reconcile client meal with backend-persisted meal
        setMeals((prev) =>
          prev.map((m) =>
            m.id === newMeal.id
              ? { ...res.meal, id: res.meal.id || (res.meal as any)._id || newMeal.id }
              : m
          )
        );
      }
    } catch (err: unknown) {
      console.warn('[Calories] Failed to save meal to backend:', err);
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
    setUserProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        targetWeightKg: updatedGoal.targetWeight !== undefined ? updatedGoal.targetWeight : prev.targetWeightKg,
        targetWeeks: updatedGoal.targetWeeks !== undefined ? updatedGoal.targetWeeks : prev.targetWeeks,
        targetDate: updatedGoal.targetDate || prev.targetDate,
      };
    });

    try {
      const res = await apiClient.putActiveGoal(updatedGoal);
      if (res?.goal) {
        setGoal(res.goal);
      }
      if (res?.user) {
        setUserProfile((prev) => mapApiUserToProfile(res.user, prev));
      }
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

  const handleSaveUserProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (updatedProfile.targetWeightKg) {
      setGoal((prev) => ({
        ...prev,
        targetWeight: updatedProfile.targetWeightKg,
        targetWeeks: updatedProfile.targetWeeks,
        targetDate: updatedProfile.targetDate,
      }));
    }

    try {
      const res = await apiClient.updateProfile({
        name: updatedProfile.name,
        heightCm: updatedProfile.heightCm,
        currentWeightKg: updatedProfile.currentWeightKg,
        targetWeightKg: updatedProfile.targetWeightKg,
        targetWeeks: updatedProfile.targetWeeks,
        allergies: updatedProfile.allergies,
        supplements: updatedProfile.supplements,
        primaryGoal: updatedProfile.primaryGoal,
      });

      if (res?.user) {
        setUserProfile((prev) => mapApiUserToProfile(res.user, prev));
      }
      if (res?.goal) {
        setGoal(res.goal);
      }
    } catch (err: unknown) {
      console.warn('[Profile Save] Failed to persist profile to MongoDB:', err);
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
          <div className="calories-footer-tagline-wrap">
            <div className="calories-footer-tagline-pill">
              <CaloriesTagline height={26} />
            </div>
          </div>
          <div className="calories-footer-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CaloriesLogo size="sm" variant="image" />
              <span className="calories-footer-text">
                Calories Platform - Complete Editorial Health-Tech Suite Verified.
              </span>
            </div>
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
          meals={selectedDayMeals}
          weeklyTrend={weeklyTrend}
          onAddMeal={handleOpenAddMeal}
          onEditMeal={handleOpenEditMeal}
          onDeleteMeal={handleDeleteMeal}
          onOpenAIScan={() => setActiveTab('ai-scan')}
          userName={userProfile?.name || 'User'}
          onOpenAuthModal={() => handleOpenAuthModal('edit_profile')}
          onLogout={handleLogout}
          waterLogs={selectedDayWater}
          onLogWater={handleLogWater}
          onDeleteWaterLog={handleDeleteWaterLog}
          userSupplements={activeUserSupplements}
          supplementLogs={selectedDaySupplementLogs}
          onToggleSupplement={handleToggleSupplement}
          onAddSupplement={() => handleOpenAuthModal('edit_profile')}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={handleRequestNotificationPermission}
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
                onEditMeal={handleOpenEditMeal}
                onDeleteMeal={handleDeleteMeal}
                onOpenAIScan={() => setActiveTab('ai-scan')}
                onBatchImportMeals={(importedMeals) => {
                  setMeals((prev) => [...importedMeals, ...prev]);
                }}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsPage
                currentGoal={goal}
                onSaveGoal={handleSaveGoal}
                currentWeightKg={userProfile?.currentWeightKg}
                consumedCalories={todayCalories}
                consumedProtein={todayProtein}
                consumedCarbs={todayCarbs}
                consumedFat={todayFat}
                onQuickLogMeal={handleSaveMeal}
                userProfile={userProfile || undefined}
                onUpdateProfile={handleSaveUserProfile}
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
                onCommitMeal={handleSaveMeal}
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
                onLogout={handleLogout}
              />
            )}
          </main>

          <footer className="calories-footer">
            <div className="calories-footer-tagline-wrap">
              <div className="calories-footer-tagline-pill">
                <CaloriesTagline height={26} />
              </div>
            </div>
            <div className="calories-footer-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CaloriesLogo size="sm" variant="image" />
                <span className="calories-footer-text">
                  Calories Platform - Complete Editorial Health-Tech Suite Verified.
                </span>
              </div>
              <span className="calories-footer-domain">calories.bhhc.me</span>
            </div>
          </footer>
        </div>
      )}

      {/* DIRECT VALUES ADD / EDIT MEAL MODAL */}
      <AddMealModal
        isOpen={isAddMealOpen}
        onClose={() => {
          setIsAddMealOpen(false);
          setEditingMeal(null);
        }}
        defaultCategory={selectedCategory}
        defaultDateString={selectedDateString}
        initialMeal={editingMeal}
        onSaveMeal={handleSaveMeal}
        onUpdateMeal={handleUpdateMeal}
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

      {/* AI NUTRITION CHAT ASSISTANT (BONUS FEATURE) */}
      {userProfile && (
        <NutritionChatAssistant
          userName={userProfile.name}
          activeGoal={goal}
          consumedCalories={daySummary.consumedCalories}
          consumedProtein={daySummary.consumedProtein}
          consumedCarbs={daySummary.consumedCarbs}
          consumedFat={daySummary.consumedFat}
          waterIntakeMl={daySummary.waterIntakeMl}
          selectedDate={selectedDateString}
          allergies={userProfile.allergies}
          onLogWater={handleLogWater}
          onLogMeal={handleSaveMeal}
        />
      )}

      {/* MANDATORY TERMS & PRIVACY CONSENT GATE */}
      {isAuthenticated && userProfile && !userProfile.termsAccepted && (
        <TermsPrivacyModal
          isOpen={true}
          userName={userProfile.name}
          onAccepted={(termsAcceptedAt) => {
            setUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    termsAccepted: true,
                    termsAcceptedAt,
                  }
                : null
            );
          }}
        />
      )}

      {/* IN-APP NOTIFICATION TOAST ALERT */}
      {inAppToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 999999,
            backgroundColor: '#152238',
            color: '#FAF9F6',
            padding: '14px 18px',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            border: '1px solid #285B46',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '380px',
          }}
        >
          <div style={{ fontSize: '20px' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#BFD8C2' }}>
              {inAppToast.title}
            </div>
            <div style={{ fontSize: '12px', color: '#EDE5D8', marginTop: '2px', lineHeight: 1.4 }}>
              {inAppToast.body}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInAppToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A0AEC0',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default App;
