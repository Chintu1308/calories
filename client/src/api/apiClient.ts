import type { DailyGoal, MealItem, MealType } from '../types/nutrition.js';

const API_BASE = '/api/v1';

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
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  // Auth endpoints
  async register(data: Record<string, unknown>): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/auth/me');
  },

  logout(): void {
    setStoredToken(null);
  },

  // Goals endpoints
  async getActiveGoal(): Promise<{ goal: DailyGoal }> {
    return request<{ goal: DailyGoal }>('/goals');
  },

  async putActiveGoal(goal: DailyGoal): Promise<{ goal: DailyGoal }> {
    return request<{ goal: DailyGoal }>('/goals', {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  },

  // Meals endpoints
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

  async createMeal(meal: Omit<MealItem, 'id'>): Promise<{ meal: MealItem }> {
    return request<{ meal: MealItem }>('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  },

  async updateMeal(id: string, meal: Partial<MealItem>): Promise<{ meal: MealItem }> {
    return request<{ meal: MealItem }>(`/meals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(meal),
    });
  },

  async deleteMeal(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/meals/${id}`, {
      method: 'DELETE',
    });
  },

  // Reports endpoints
  async getWeeklyCalories(weekStart?: string): Promise<WeeklyCaloriesResponse> {
    const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    return request<WeeklyCaloriesResponse>(`/reports/weekly-calories${qs}`);
  },

  async getMacros(params: { start?: string; end?: string; groupBy?: 'day' | 'week' } = {}): Promise<MacroReportResponse> {
    const query = new URLSearchParams();
    if (params.start) query.set('start', params.start);
    if (params.end) query.set('end', params.end);
    if (params.groupBy) query.set('groupBy', params.groupBy);
    const qs = query.toString();
    return request<MacroReportResponse>(`/reports/macros${qs ? `?${qs}` : ''}`);
  },

  async getMicronutrients(params: { start?: string; end?: string } = {}): Promise<MicronutrientReportResponse> {
    const query = new URLSearchParams();
    if (params.start) query.set('start', params.start);
    if (params.end) query.set('end', params.end);
    const qs = query.toString();
    return request<MicronutrientReportResponse>(`/reports/micronutrients${qs ? `?${qs}` : ''}`);
  },

  // AI Vision Extraction endpoint
  async extractFromImage(file: File): Promise<AiExtractionResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return request<AiExtractionResponse>('/ai/extract', {
      method: 'POST',
      body: formData,
    });
  },
};
