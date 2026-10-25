import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient, type ChatNutritionMessage } from '../../api/apiClient.js';
import type { DailyGoal, MealItem, MealType } from '../../types/nutrition.js';
import { Icon } from '../ui/Icon.js';

export interface NutritionChatAssistantProps {
  userName?: string;
  activeGoal?: DailyGoal | null;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFat?: number;
  waterIntakeMl?: number;
  selectedDate?: string;
  allergies?: string[];
  onLogWater?: (amountMl: number, note?: string) => void;
  onLogMeal?: (meal: MealItem) => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let messageSeq = 0;
function createMessageId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

let aiMealCounter = 0;
function getMealTypeFromCurrentHour(): MealType {
  const hr = new Date().getHours();
  if (hr < 11) return 'Breakfast';
  if (hr < 16) return 'Lunch';
  if (hr < 21) return 'Dinner';
  return 'Snacks';
}

function buildAiLoggedMeal(
  displayFoodName: string,
  targetMealType: MealType,
  qty: number,
  estUnit: string,
  estCalories: number,
  estProtein: number,
  estCarbs: number,
  estFat: number
): MealItem {
  aiMealCounter += 1;
  const now = new Date();
  return {
    id: `meal_ai_${now.getTime()}_${aiMealCounter}`,
    userId: '',
    foodName: displayFoodName,
    mealType: targetMealType,
    eatenAt: now.toISOString(),
    quantity: {
      amount: qty,
      unit: estUnit,
    },
    nutrition: {
      caloriesKcal: estCalories,
      proteinG: estProtein,
      carbsG: estCarbs,
      fatG: estFat,
    },
    source: 'ai',
    notes: 'Logged via Calories AI Nutrition Assistant',
  };
}

interface QuickFoodEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

const COMMON_FOOD_ESTIMATES: Record<string, QuickFoodEstimate> = {
  'masala dosa': { calories: 210, protein: 4, carbs: 32, fat: 8, unit: 'piece' },
  'plain dosa': { calories: 150, protein: 3, carbs: 26, fat: 4, unit: 'piece' },
  'dosa': { calories: 180, protein: 4, carbs: 29, fat: 6, unit: 'piece' },
  'idli': { calories: 65, protein: 2, carbs: 12, fat: 0.5, unit: 'piece' },
  'vada': { calories: 140, protein: 3, carbs: 14, fat: 8, unit: 'piece' },
  'sambar': { calories: 80, protein: 3, carbs: 12, fat: 2, unit: 'bowl' },
  'chutney': { calories: 50, protein: 1, carbs: 3, fat: 4, unit: 'tbsp' },
  'egg': { calories: 75, protein: 6, carbs: 1, fat: 5, unit: 'egg' },
  'boiled egg': { calories: 75, protein: 6, carbs: 1, fat: 5, unit: 'egg' },
  'fried egg': { calories: 90, protein: 6, carbs: 1, fat: 7, unit: 'egg' },
  'omelette': { calories: 160, protein: 12, carbs: 2, fat: 12, unit: 'serving' },
  'roti': { calories: 100, protein: 3, carbs: 18, fat: 1.5, unit: 'piece' },
  'chapati': { calories: 100, protein: 3, carbs: 18, fat: 1.5, unit: 'piece' },
  'naan': { calories: 260, protein: 8, carbs: 45, fat: 5, unit: 'piece' },
  'paratha': { calories: 230, protein: 5, carbs: 30, fat: 10, unit: 'piece' },
  'rice': { calories: 200, protein: 4, carbs: 44, fat: 0.5, unit: 'cup' },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.5, unit: '100g' },
  'chicken salad': { calories: 320, protein: 30, carbs: 12, fat: 16, unit: 'bowl' },
  'salad': { calories: 120, protein: 3, carbs: 10, fat: 7, unit: 'bowl' },
  'oats': { calories: 150, protein: 5, carbs: 27, fat: 3, unit: 'bowl' },
  'oatmeal': { calories: 150, protein: 5, carbs: 27, fat: 3, unit: 'bowl' },
  'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'medium' },
  'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'medium' },
  'greek yogurt': { calories: 120, protein: 16, carbs: 6, fat: 2, unit: 'cup' },
  'protein shake': { calories: 160, protein: 28, carbs: 4, fat: 2.5, unit: 'scoop' },
  'biryani': { calories: 450, protein: 22, carbs: 55, fat: 15, unit: 'plate' },
  'paneer': { calories: 265, protein: 18, carbs: 4, fat: 20, unit: '100g' },
  'dal': { calories: 180, protein: 9, carbs: 26, fat: 4, unit: 'bowl' },
  'pizza': { calories: 280, protein: 12, carbs: 35, fat: 10, unit: 'slice' },
  'sandwich': { calories: 300, protein: 14, carbs: 32, fat: 11, unit: 'sandwich' },
};

export const NutritionChatAssistant: React.FC<NutritionChatAssistantProps> = ({
  userName = 'Friend',
  activeGoal,
  consumedCalories = 0,
  consumedProtein = 0,
  consumedCarbs = 0,
  consumedFat = 0,
  waterIntakeMl = 0,
  selectedDate,
  allergies = [],
  onLogWater,
  onLogMeal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const targetCalories = activeGoal?.dailyCaloriesKcal || 2000;
  const targetProtein = activeGoal?.proteinGrams || 150;
  const targetCarbs = activeGoal?.carbohydrateGrams || 200;
  const targetFat = activeGoal?.fatGrams || 65;

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const remainingProtein = Math.max(0, targetProtein - consumedProtein);

  // Initial welcome greeting
  const initialGreeting = useMemo<DisplayMessage>(() => ({
    id: 'msg-welcome',
    role: 'assistant',
    content: `Hi ${userName.split(' ')[0]}! I'm your **Calories AI Nutrition Assistant**.\n\n` +
      `Today you've logged **${consumedCalories} kcal** with **${remainingCalories} kcal** remaining towards your **${targetCalories} kcal** target (${remainingProtein}g protein needed).\n\n` +
      `How can I help you plan your next meal or balance your nutrients today?`,
    timestamp: getCurrentTimeString(),
    suggestedPrompts: [
      'What should I eat for dinner?',
      'High protein snack under 200 kcal',
      'Check my daily protein deficit',
      'How is my hydration today?',
    ],
  }), [userName, consumedCalories, remainingCalories, targetCalories, remainingProtein]);

  const [messages, setMessages] = useState<DisplayMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: DisplayMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: query,
      timestamp: getCurrentTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // 1. Check if the query is an action intent to log water (strictly requires explicit water keywords)
    const isExplicitWater = /\b(?:water|hydrate|hydration|glasses?\s+of\s+water)\b/i.test(query);
    const waterLogMatch = isExplicitWater && (
      query.match(/(?:log|add|drank|drink|track|have)\s+(\d+)\s*(?:ml)?(?:\s+(?:of\s+)?water)?/i)
      || query.match(/(\d+)\s*ml\s+(?:of\s+)?water/i)
      || query.match(/log\s+water\s*[:-]?\s*(\d+)/i)
      || query.match(/(?:log|add|drank|had)\s+(\d+)\s+glass(?:es)?/i)
    );

    if (waterLogMatch) {
      let amount = parseInt(waterLogMatch[1], 10);
      if (waterLogMatch[0].toLowerCase().includes('glass')) {
        amount = amount * 250;
      }
      if (amount > 0 && onLogWater) {
        onLogWater(amount, 'Logged via Calories AI Assistant');
        const newTotal = (waterIntakeMl || 0) + amount;
        const remaining = Math.max(0, 3000 - newTotal);
        const assistantMsg: DisplayMessage = {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: `💧 **Logged ${amount} ml of water!**\n\n` +
            `Your total water intake for today is now **${newTotal} ml** towards your **3,000 ml** target ` +
            `(${remaining > 0 ? `**${remaining} ml** remaining` : '🎉 daily target achieved!'}).\n\n` +
            `Drinking water regularly optimizes nutrient delivery, supports joint health, and keeps metabolic rate high.`,
          timestamp: getCurrentTimeString(),
          suggestedPrompts: [
            'How is my hydration today?',
            'Log another 250ml water',
            'What should I eat next?',
          ],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }
    }

    // 2. Check if the query is an action intent to log a food or meal (e.g. "log 2 masala dosas for breakfast", "add 1 apple", "log chicken salad for lunch")
    const isFoodLogIntent = !isExplicitWater && (
      query.match(/^(?:log|add|ate|had|track)\s+(.+)$/i)
    );

    if (isFoodLogIntent && isFoodLogIntent[1]) {
      let rawFood = isFoodLogIntent[1].trim();

      // Check for meal type in string (e.g. "for breakfast", "for lunch", "for dinner", "for snack")
      let targetMealType: MealType = 'Breakfast';
      const mealTypeMatch = rawFood.match(/\s+for\s+(breakfast|lunch|dinner|snacks?)$/i);
      if (mealTypeMatch) {
        const mt = mealTypeMatch[1].toLowerCase();
        if (mt.startsWith('lunch')) targetMealType = 'Lunch';
        else if (mt.startsWith('dinner')) targetMealType = 'Dinner';
        else if (mt.startsWith('snack')) targetMealType = 'Snacks';
        else targetMealType = 'Breakfast';
        rawFood = rawFood.replace(/\s+for\s+(breakfast|lunch|dinner|snacks?)$/i, '').trim();
      } else {
        // Infer from current hour
        targetMealType = getMealTypeFromCurrentHour();
      }

      // Check for quantity (e.g. "2 masala dosas", "1 bowl of oatmeal", "3 eggs")
      let qty = 1;
      let foodNameOnly = rawFood;
      const qtyMatch = rawFood.match(/^(\d+)\s*(?:pieces?|servings?|bowls?|cups?|plates?|glasses?|slices?|scoops?)?\s*(?:of\s+)?(.+)$/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10) || 1;
        foodNameOnly = qtyMatch[2].trim();
      }

      // Normalize food name for lookup
      const normFood = foodNameOnly.toLowerCase().replace(/s$/, '').replace(/es$/, '');
      const matchedKey = Object.keys(COMMON_FOOD_ESTIMATES).find(
        (k) => normFood.includes(k) || k.includes(normFood)
      );

      let estCalories = 280 * qty;
      let estProtein = 12 * qty;
      let estCarbs = 34 * qty;
      let estFat = 10 * qty;
      let estUnit = 'serving(s)';

      if (matchedKey) {
        const est = COMMON_FOOD_ESTIMATES[matchedKey];
        estCalories = Math.round(est.calories * qty);
        estProtein = Math.round(est.protein * qty);
        estCarbs = Math.round(est.carbs * qty);
        estFat = Math.round(est.fat * qty);
        estUnit = `${est.unit}(s)`;
      }

      const displayFoodName = foodNameOnly
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (onLogMeal) {
        const newMeal = buildAiLoggedMeal(
          displayFoodName,
          targetMealType,
          qty,
          estUnit,
          estCalories,
          estProtein,
          estCarbs,
          estFat
        );
        onLogMeal(newMeal);
      }

      const newRemainingCals = Math.max(0, remainingCalories - estCalories);
      const newRemainingProtein = Math.max(0, remainingProtein - estProtein);

      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `🍽️ **Logged ${qty} ${displayFoodName} for ${targetMealType}!**\n\n` +
          `• **Calories:** **${estCalories} kcal**\n` +
          `• **Protein:** **${estProtein}g**\n` +
          `• **Carbohydrates:** **${estCarbs}g**\n` +
          `• **Fat:** **${estFat}g**\n\n` +
          `Your daily nutrition dashboard has been updated. You now have **${newRemainingCals} kcal** and **${newRemainingProtein}g protein** remaining for today!`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'How is my total protein for today?',
          'Log 200ml of water',
          'What should I eat next?',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    const q = query.toLowerCase();

    // 3. Inquiries regarding protein shake / whey
    if (q.includes('protein shake') || q.includes('shake now') || (q.includes('can i have') && q.includes('shake'))) {
      const pNeeded = Math.max(0, targetProtein - consumedProtein);
      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `**Yes, absolutely!** Having a protein shake now is a convenient, lean way to close your protein gap.\n\n` +
          `• **Your live status:** You still need **${pNeeded}g of protein** today towards your **${targetProtein}g** target.\n` +
          `• **Recommended blend:** 1 scoop of whey or plant isolate with cold water or unsweetened almond milk yields **~130–160 kcal and 25–28g of pure protein** with minimal carbs.\n` +
          `• **Timing benefit:** Rapid amino acid absorption stimulates muscle protein synthesis and keeps appetite steady without exhausting your remaining calories.`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'Log 1 scoop protein shake for snack',
          'High protein snack under 200 kcal',
          'Log 200ml of water',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    // 4. Inquiries regarding high protein snacks under 200 kcal
    if (q.includes('snack') || q.includes('under 200') || q.includes('munch') || q.includes('cravings')) {
      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `Here are 4 healthy, nutrient-dense **high-protein snacks strictly under 200 kcal** tailored to your **${remainingCalories} kcal** remaining budget:\n\n` +
          `1. **Non-Fat Greek Yogurt (170g) with Fresh Berries**\n` +
          `   *~130 kcal • 16g protein • 12g carbs • 0g fat*\n\n` +
          `2. **2 Hard-Boiled Eggs (1 whole + 1 white) with Sea Salt & Paprika**\n` +
          `   *~95 kcal • 10g protein • 1g carbs • 5g fat*\n\n` +
          `3. **Steamed Edamame in Pods (1 cup with sea salt)**\n` +
          `   *~140 kcal • 14g protein • 10g carbs • 4g fat*\n\n` +
          `4. **Low-Fat String Cheese (2 sticks)**\n` +
          `   *~160 kcal • 14g protein • 2g carbs • 10g fat*`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'Can I have a protein shake now?',
          'What should I eat next?',
          'Log 200ml of water',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    // 5. Inquiries regarding what to eat next
    if (q.includes('eat next') || q.includes('what should i eat') || q.includes('next meal')) {
      const pNeeded = Math.max(0, targetProtein - consumedProtein);
      const cNeeded = Math.max(0, targetCalories - consumedCalories);
      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `You have **${cNeeded} kcal** and **${pNeeded}g of protein** remaining to hit your targets today.\n\n` +
          `**Top meal ideas to hit your targets:**\n` +
          `1. **Herb Grilled Chicken Breast or Tempeh Bowl (180g)** with roasted broccoli and quinoa - *~420 kcal, 38g protein, 32g carbs, 12g fat*\n\n` +
          `2. **Pan-Seared White Fish or Extra-Firm Tofu** with garlic sautéed green beans and a sweet potato - *~380 kcal, 34g protein, 28g carbs, 9g fat*\n\n` +
          `3. **Egg White & Veggie Frittata** with baby spinach, bell peppers, and feta - *~310 kcal, 29g protein, 14g carbs, 11g fat*\n\n` +
          `Pair any of these with a tall glass of water to support digestion!`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'Can I have a protein shake now?',
          'High protein snack under 200 kcal',
          'Log 200ml of water',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    // 6. Check if the query is specifically asking about today's live hydration status
    const isHydrationStatusQuery = /(?:hydration|hydrate|water)/i.test(query) &&
      /(?:how|status|today|did i|have i|intake|check|much)/i.test(query) &&
      !/(?:log|add|drank|track)/i.test(query);

    if (isHydrationStatusQuery) {
      if (!waterIntakeMl || waterIntakeMl === 0) {
        const assistantMsg: DisplayMessage = {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: `You haven't logged any water yet today (**0 ml / 3,000 ml** target).\n\n` +
            `• **Daily Benchmark:** 2,500 – 3,000 ml per day.\n` +
            `• **Action Tip:** Drink a full 350ml glass of water now to kickstart your metabolism and prevent confusing dehydration with hunger cues.`,
          timestamp: getCurrentTimeString(),
          suggestedPrompts: [
            'Log 200ml of water',
            'Log 500ml of water',
            'What should I eat next?',
          ],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const pct = Math.round((waterIntakeMl / 3000) * 100);
      const remaining = Math.max(0, 3000 - waterIntakeMl);
      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `Here is your live hydration status for today:\n\n` +
          `• **Logged Water:** **${waterIntakeMl} ml** / 3,000 ml (${pct}% of target)\n` +
          `• **Remaining:** **${remaining} ml** needed to reach optimal hydration\n\n` +
          (remaining > 0
            ? `💡 Keep a water bottle nearby and aim for 250–500ml every couple of hours.`
            : `🎉 Excellent job! You have reached your daily hydration goal.`),
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'Log 200ml of water',
          'Log 500ml of water',
          'What should I eat for dinner?',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    setIsLoading(true);

    // Build history payload for server
    const historyPayload: ChatNutritionMessage[] = messages
      .filter((m) => m.id !== 'msg-welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await apiClient.sendNutritionChat(
        query,
        historyPayload,
        selectedDate
      );

      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: response.reply,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: response.suggestedPrompts,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (_err) {
      console.warn('[NutritionChatAssistant] Service request failed:', _err);
      const fallbackErrorMsg: DisplayMessage = {
        id: createMessageId('assistant-err'),
        role: 'assistant',
        content: `I'm having a brief connection pause with the AI service. ` +
          `Based on your live numbers, you have **${remainingCalories} kcal** and **${remainingProtein}g protein** remaining today. ` +
          `Try a lean protein bowl with steamed vegetables or a cup of Greek yogurt!`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'What should I eat for dinner?',
          'Suggest a high-protein snack',
        ],
      };
      setMessages((prev) => [...prev, fallbackErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...initialGreeting,
        timestamp: getCurrentTimeString(),
      },
    ]);
  };

  // Safe lightweight renderer for markdown formatting in chat bubbles
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} style={{ height: '8px' }} />;
      }

      // Check if bullet point
      const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s+/, '') : line;

      // Simple regex for bold (**bold**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: 'inherit', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="nutrition-chat-bullet-row">
            <span className="nutrition-chat-bullet-dot">•</span>
            <div className="nutrition-chat-bullet-text">{renderedParts}</div>
          </div>
        );
      }

      return (
        <p key={idx} className="nutrition-chat-paragraph">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Pill */}
      {!isOpen && (
        <button
          type="button"
          className="nutrition-chat-launcher"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open AI Nutrition Assistant"
          title="Ask AI Nutritionist"
        >
          <div className="nutrition-chat-launcher-icon-wrap">
            <Icon name="leaf" size={20} />
            <span className="nutrition-chat-pulse-indicator" />
          </div>
          <span className="nutrition-chat-launcher-label">Ask Nutritionist AI</span>
          <span className="nutrition-chat-launcher-badge">{remainingCalories} kcal left</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className={`nutrition-chat-window ${isMinimized ? 'nutrition-chat-window-minimized' : ''}`}>
          {/* Header */}
          <div className="nutrition-chat-header">
            <div className="nutrition-chat-header-left">
              <div className="nutrition-chat-avatar">
                <Icon name="leaf" size={18} />
              </div>
              <div className="nutrition-chat-header-text">
                <div className="nutrition-chat-header-title">
                  <span>Calories AI Nutritionist</span>
                  <span className="nutrition-chat-status-pill">● Context Aware</span>
                </div>
                <div className="nutrition-chat-header-subtitle">
                  Aware of your goals, logged meals &amp; allergies
                </div>
              </div>
            </div>

            <div className="nutrition-chat-header-actions">
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={handleResetChat}
                title="Restart Conversation"
                aria-label="Restart Conversation"
              >
                ↺
              </button>
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▢' : '-'}
              </button>
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Live Context Bar */}
              <div className="nutrition-chat-context-bar">
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Calories:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedCalories} / {targetCalories} kcal
                    <strong style={{ color: '#285B46', marginLeft: '4px' }}>({remainingCalories} left)</strong>
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Protein:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedProtein}g / {targetProtein}g
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Carbs:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedCarbs}g / {targetCarbs}g
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Fat:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedFat}g / {targetFat}g
                  </span>
                </div>
                {waterIntakeMl > 0 && (
                  <>
                    <div className="nutrition-chat-context-divider" />
                    <div className="nutrition-chat-context-item">
                      <span className="nutrition-chat-context-label">Water:</span>
                      <span className="nutrition-chat-context-val">{waterIntakeMl} ml</span>
                    </div>
                  </>
                )}
                {allergies.length > 0 && (
                  <>
                    <div className="nutrition-chat-context-divider" />
                    <div className="nutrition-chat-context-item nutrition-chat-context-allergy">
                      <span className="nutrition-chat-context-label">Allergens:</span>
                      <span className="nutrition-chat-context-val">{allergies.join(', ')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Message List */}
              <div className="nutrition-chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`nutrition-chat-msg-row ${
                      msg.role === 'user' ? 'nutrition-chat-msg-user' : 'nutrition-chat-msg-assistant'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="nutrition-chat-msg-avatar">
                        <Icon name="leaf" size={14} />
                      </div>
                    )}
                    <div className="nutrition-chat-msg-body">
                      <div className="nutrition-chat-msg-bubble">
                        {renderFormattedText(msg.content)}
                      </div>
                      <span className="nutrition-chat-msg-time">{msg.timestamp}</span>

                      {/* Prompt Suggestions */}
                      {msg.role === 'assistant' && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                        <div className="nutrition-chat-chips-wrap">
                          <span className="nutrition-chat-chips-title">Suggested prompts:</span>
                          <div className="nutrition-chat-chips-list">
                            {msg.suggestedPrompts.map((prompt, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                className="nutrition-chat-chip"
                                onClick={() => handleSendMessage(prompt)}
                                disabled={isLoading}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="nutrition-chat-msg-row nutrition-chat-msg-assistant">
                    <div className="nutrition-chat-msg-avatar">
                      <Icon name="leaf" size={14} />
                    </div>
                    <div className="nutrition-chat-msg-body">
                      <div className="nutrition-chat-msg-bubble nutrition-chat-thinking">
                        <span className="nutrition-chat-dot" />
                        <span className="nutrition-chat-dot" />
                        <span className="nutrition-chat-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="nutrition-chat-input-bar">
                <input
                  ref={inputRef}
                  type="text"
                  className="nutrition-chat-input"
                  placeholder="Ask anything about today's meals, macros or recipes..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="nutrition-chat-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
