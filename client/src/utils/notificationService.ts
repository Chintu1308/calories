/**
 * Browser Notification Service for Calories Platform
 * Sends contextual reminders for missed meals, supplements, and water intake.
 */

import type { MealItem, SupplementItem, SupplementLogEntry, WaterLogEntry } from '../types/nutrition.js';

export interface ReminderPreferences {
  enabled: boolean;
  meals: boolean;
  supplements: boolean;
  water: boolean;
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  enabled: true,
  meals: true,
  supplements: true,
  water: true,
};

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (err) {
    console.warn('[Calories] Failed to request notification permission:', err);
    return false;
  }
}

export function getReminderPreferences(): ReminderPreferences {
  try {
    const saved = localStorage.getItem('calories_reminder_preferences');
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return DEFAULT_PREFERENCES;
}

export function setReminderPreferences(prefs: ReminderPreferences): void {
  try {
    localStorage.setItem('calories_reminder_preferences', JSON.stringify(prefs));
  } catch {
    // ignore storage error
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      badge: '/icons/calories.svg',
      icon: '/icons/calories.svg',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('[Calories] Error creating Notification:', err);
    return null;
  }
}

export function sendTestNotification(): boolean {
  if (!isNotificationSupported()) {
    alert('Browser notifications are not supported in your browser.');
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  sendBrowserNotification('Calories Reminders Active 🥗', {
    body: 'Browser alerts are working! We will notify you if you forget to log a meal or supplement.',
    tag: 'calories-test',
  });
  return true;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function wasReminderSentToday(reminderKey: string, todayStr: string): boolean {
  try {
    return localStorage.getItem(`calories_reminder_${reminderKey}_${todayStr}`) === 'true';
  } catch {
    return false;
  }
}

function markReminderSentToday(reminderKey: string, todayStr: string): void {
  try {
    localStorage.setItem(`calories_reminder_${reminderKey}_${todayStr}`, 'true');
  } catch {
    // ignore storage error
  }
}

export interface CheckRemindersParams {
  meals: MealItem[];
  userSupplements: SupplementItem[];
  supplementLogs: SupplementLogEntry[];
  waterLogs: WaterLogEntry[];
}

/**
 * Checks for missing meals, supplements, and water intake according to schedule.
 * Fires a single appropriate notification if an item was missed and hasn't been notified today.
 */
export function checkAndSendMissedReminders(params: CheckRemindersParams): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const prefs = getReminderPreferences();
  if (!prefs.enabled) return;

  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = getTodayString();

  // 1. MEAL REMINDERS
  if (prefs.meals) {
    // Breakfast reminder: after 10:30 AM
    if (currentHour >= 10 && !wasReminderSentToday('breakfast', todayStr)) {
      const hasBreakfast = params.meals.some(
        (m) => m.mealType === 'Breakfast' || m.mealType === 'Brunch'
      );
      if (!hasBreakfast) {
        sendBrowserNotification('Breakfast Reminder 🍳', {
          body: "You haven't logged Breakfast yet. Keep your nutrition on target by logging your morning meal!",
          tag: `breakfast-${todayStr}`,
        });
        markReminderSentToday('breakfast', todayStr);
        return; // Send at most one notification per cycle to avoid spamming
      }
    }

    // Lunch reminder: after 2:00 PM (14:00)
    if (currentHour >= 14 && !wasReminderSentToday('lunch', todayStr)) {
      const hasLunch = params.meals.some((m) => m.mealType === 'Lunch');
      if (!hasLunch) {
        sendBrowserNotification('Lunch Reminder 🥗', {
          body: "Time for a lunch check! You haven't recorded a midday meal yet.",
          tag: `lunch-${todayStr}`,
        });
        markReminderSentToday('lunch', todayStr);
        return;
      }
    }

    // Dinner reminder: after 8:30 PM (20:30)
    if (currentHour >= 20 && !wasReminderSentToday('dinner', todayStr)) {
      const hasDinner = params.meals.some((m) => m.mealType === 'Dinner');
      if (!hasDinner) {
        sendBrowserNotification('Dinner Reminder 🍲', {
          body: "Wrap up your daily calorie budget. Don't forget to log your dinner before bed!",
          tag: `dinner-${todayStr}`,
        });
        markReminderSentToday('dinner', todayStr);
        return;
      }
    }
  }

  // 2. SUPPLEMENT REMINDERS
  if (prefs.supplements && params.userSupplements.length > 0) {
    // Morning supplements: after 11:00 AM
    if (currentHour >= 11 && !wasReminderSentToday('morning_supplements', todayStr)) {
      const morningSupps = params.userSupplements.filter(
        (s) => s.timing === 'Morning' || s.timing === 'With Meals'
      );
      const unloggedMorning = morningSupps.filter(
        (s) => !params.supplementLogs.some((log) => log.supplementId === s.id && log.taken)
      );

      if (unloggedMorning.length > 0) {
        const names = unloggedMorning.map((s) => s.name).join(', ');
        sendBrowserNotification('Morning Supplements Reminder 💊', {
          body: `Have you taken your daily supplements yet? Missing: ${names}.`,
          tag: `supp-morning-${todayStr}`,
        });
        markReminderSentToday('morning_supplements', todayStr);
        return;
      }
    }

    // Evening / Night supplements: after 8:00 PM (20:00)
    if (currentHour >= 20 && !wasReminderSentToday('evening_supplements', todayStr)) {
      const eveningSupps = params.userSupplements.filter(
        (s) => s.timing === 'Evening' || s.timing === 'Post-Workout'
      );
      const unloggedEvening = eveningSupps.filter(
        (s) => !params.supplementLogs.some((log) => log.supplementId === s.id && log.taken)
      );

      if (unloggedEvening.length > 0) {
        const names = unloggedEvening.map((s) => s.name).join(', ');
        sendBrowserNotification('Evening Supplements 🌙', {
          body: `Evening supplement check: Don't forget your ${names}.`,
          tag: `supp-evening-${todayStr}`,
        });
        markReminderSentToday('evening_supplements', todayStr);
        return;
      }
    }
  }

  // 3. HYDRATION REMINDER
  if (prefs.water) {
    // Afternoon water check: after 3:30 PM (15:00)
    if (currentHour >= 15 && !wasReminderSentToday('water_afternoon', todayStr)) {
      const totalWater = params.waterLogs.reduce((acc, w) => acc + w.amountMl, 0);
      if (totalWater < 1500) {
        sendBrowserNotification('Hydration Check 💧', {
          body: `You have logged ${totalWater} ml of water so far today. Remember to drink a glass of water!`,
          tag: `water-${todayStr}`,
        });
        markReminderSentToday('water_afternoon', todayStr);
        return;
      }
    }
  }
}
