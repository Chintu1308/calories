import type { DailyGoal, MealItem, MealType } from '../types/nutrition.js';

const envApiUrl = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL)
    : ''
).replace(/\/$/, '');

const API_BASE = `${envApiUrl}/api/v1`;

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    email: string;
    name: string;
    heightCm: number;
    currentWeightKg: number;
    targetWeightKg: number;
    targetWeeks: number;
    allergies: string[];
    supplements: Array<{ id: string; name: string; dosage: string; timing: string; notes?: string }>;
    primaryGoal: string;
  };
}

export interface PaginatedMealsResponse {
  meals: MealItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WeeklyCaloriesResponse {
  startDate: string;
  targetCalories: number;
  days: Array<{
    date: string;
    caloriesKcal: number;
    targetCalories: number;
    mealCount: number;
  }>;
}

export interface MacroReportResponse {
  groupBy: 'day' | 'week';
  data: Array<{
    period: string;
    proteinG: number;
    carbsG: number;
    fatG: number;
    caloriesKcal: number;
    energySplit: {
      proteinPct: number;
      carbsPct: number;
      fatPct: number;
    };
  }>;
}

export interface MicronutrientReportResponse {
  nutrients: Array<{
    name: string;
    totalAmount: number;
    unit: string;
    loggedCount: number;
  }>;
  totalDistinctNutrients: number;
}

export interface AiExtractionResponse {
  proposal: {
    foodName: string;
    mealType: MealType;
    quantity: { amount: number; unit: string };
    nutrition: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
    micronutrients?: Array<{ name: string; amount: number; unit: 'g' | 'mg' | 'mcg' | 'IU' }>;
    confidence: number;
    ingredients: string[];
    detectedAllergens: string[];
    isEstimate: boolean;
    notes: string;
  };
  contextualFit: {
    remainingCaloriesBefore: number;
    remainingProteinBefore: number;
    remainingCarbsBefore: number;
    remainingFatBefore: number;
    caloriesKcal: number;
    wouldExceedCalories: boolean;
    calorieFitStatus: 'optimal' | 'moderate' | 'excessive';
    fittingEvaluation: string;
    allergenAlerts: string[];
    isGoodChoiceToday: boolean;
  };
  uncommittedNotice: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Token management in localStorage
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('calories_auth_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('calories_auth_token', token);
    } else {
      localStorage.removeItem('calories_auth_token');
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Central HTTP fetch wrapper for typed API communication.
 * Automatically injects Bearer JWT authentication and handles JSON serialization.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: { error?: { message?: string; code?: string } } = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }
    const message = errorData.error?.message || `Request failed with HTTP ${response.status}`;
    throw new ApiError(message, response.status, errorData.error?.code);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  /**
   * Registers a new user account and stores the returned JWT token.
   * @param data User registration fields including email, password, and biometric targets.
   */
  async register(data: Record<string, unknown>): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  /**
   * Authenticates an existing user and returns a signed session token.
   * @param data Credentials (email, password)
   */
  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  /**
   * Fetches the current authenticated user's profile and settings.
   */
  async getMe(): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/auth/me');
  },

  /**
   * Clears the current user authentication session token.
   */
  logout(): void {
    setStoredToken(null);
  },

  /**
   * Retrieves the user's currently active nutrition and calorie goal.
   */
  async getActiveGoal(): Promise<{ goal: DailyGoal }> {
    return request<{ goal: DailyGoal }>('/goals');
  },

  /**
   * Upserts the user's active nutrition targets (calories, protein, carbs, fat, target weight).
   * @param goal The target nutritional specifications.
   */
  async putActiveGoal(goal: DailyGoal): Promise<{ goal: DailyGoal }> {
    return request<{ goal: DailyGoal }>('/goals', {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  },

  /**
   * Queries paginated meal entries with optional category and date window filters.
   * @param params Pagination and filtering options.
   */
  async getMeals(params: {
    page?: number;
    limit?: number;
    mealType?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedMealsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.mealType && params.mealType !== 'All') query.set('mealType', params.mealType);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const qs = query.toString();
    return request<PaginatedMealsResponse>(`/meals${qs ? `?${qs}` : ''}`);
  },

  /**
   * Creates and persists a new meal entry scoped strictly to the current user.
   * @param meal Meal data to record.
   */
  async createMeal(meal: Omit<MealItem, 'id'>): Promise<{ meal: MealItem }> {
    return request<{ meal: MealItem }>('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  },

  /**
   * Modifies an existing meal entry, enforcing multi-tenant isolation.
   * @param id The ObjectId of the meal.
   * @param meal The fields to update.
   */
  async updateMeal(id: string, meal: Partial<MealItem>): Promise<{ meal: MealItem }> {
    return request<{ meal: MealItem }>(`/meals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(meal),
    });
  },

  /**
   * Deletes a recorded meal entry belonging to the authenticated user.
   * @param id The ObjectId of the meal.
   */
  async deleteMeal(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/meals/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Queries chronological 7-day calorie totals compared against the daily goal.
   * @param weekStart Optional ISO date string for start of week window.
   */
  async getWeeklyCalories(weekStart?: string): Promise<WeeklyCaloriesResponse> {
    const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    return request<WeeklyCaloriesResponse>(`/reports/weekly-calories${qs}`);
  },

  /**
   * Calculates macronutrient energy split percentages grouped by day or week.
   * @param params Optional date range and grouping resolution.
   */
  async getMacros(params: { start?: string; end?: string; groupBy?: 'day' | 'week' } = {}): Promise<MacroReportResponse> {
    const query = new URLSearchParams();
    if (params.start) query.set('start', params.start);
    if (params.end) query.set('end', params.end);
    if (params.groupBy) query.set('groupBy', params.groupBy);
    const qs = query.toString();
    return request<MacroReportResponse>(`/reports/macros${qs ? `?${qs}` : ''}`);
  },

  /**
   * Aggregates tracked micronutrients across the selected time horizon.
   * @param params Optional start and end date bounds.
   */
  async getMicronutrients(params: { start?: string; end?: string } = {}): Promise<MicronutrientReportResponse> {
    const query = new URLSearchParams();
    if (params.start) query.set('start', params.start);
    if (params.end) query.set('end', params.end);
    const qs = query.toString();
    return request<MicronutrientReportResponse>(`/reports/micronutrients${qs ? `?${qs}` : ''}`);
  },

  /**
   * Uploads a food photo or nutrition label image for AI analysis and uncommitted macro extraction.
   * @param file The image file selected by the user.
   */
  async extractFromImage(file: File): Promise<AiExtractionResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return request<AiExtractionResponse>('/ai/extract', {
      method: 'POST',
      body: formData,
    });
  },
};
