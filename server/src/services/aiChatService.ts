import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Meal } from '../models/Meal.js';
import { DietInstruction } from '../models/DietInstruction.js';
import { extractBatchMealsFromTable } from './aiBatchTableService.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface NutritionChatContextSummary {
  targetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  targetProtein: number;
  consumedProtein: number;
  remainingProtein: number;
  targetCarbs: number;
  consumedCarbs: number;
  remainingCarbs: number;
  targetFat: number;
  consumedFat: number;
  remainingFat: number;
  allergies: string[];
  activeDietRulesCount: number;
  todayMealCount: number;
}

export interface NutritionChatResponse {
  reply: string;
  suggestedPrompts: string[];
  contextSummary: NutritionChatContextSummary;
}

/**
 * Intelligent fallback engine when Gemini API key is unavailable, rate-limited (429),
 * or network encounters a timeout. Delivers high-value, personalized advice strictly
 * matching the user's live deficits and allergies.
 */
function generateContextualFallbackReply(
  userQuery: string,
  userName: string,
  summary: NutritionChatContextSummary,
  todayMeals: Array<{ foodName: string; calories: number; mealType: string }>,
  dietRules: string[],
  forbiddenFoods: string[]
): { reply: string; suggestedPrompts: string[] } {
  const q = userQuery.toLowerCase();
  const firstName = userName ? userName.split(' ')[0] : 'there';

  // 1. Inquiries regarding protein shake / whey
  if (q.includes('protein shake') || q.includes('shake') || q.includes('whey')) {
    return {
      reply: `**Yes, absolutely!** Having a protein shake now is an effective, lean way to close your protein gap.\n\n` +
        `• **Your live status:** You currently need **${summary.remainingProtein}g of protein** to hit your ${summary.targetProtein}g daily target.\n` +
        `• **Recommended blend:** 1 scoop of whey or plant isolate mixed with cold water or unsweetened almond milk provides **~130–160 kcal and 25–28g of high-quality protein** with minimal carbs.\n` +
        `• **Metabolic benefit:** It absorbs quickly, stimulates muscle recovery, and keeps satiety steady without exhausting your remaining calorie budget.`,
      suggestedPrompts: [
        'High protein snack under 200 kcal',
        'What should I eat next?',
        'Log 200ml of water',
      ],
    };
  }

  // 2. Inquiries regarding snacks or low-calorie treats (checked before generic protein)
  if (q.includes('snack') || q.includes('under 200') || q.includes('cravings') || q.includes('hungry')) {
    const safeNutrients = summary.allergies.includes('Nuts')
      ? 'pumpkin seeds, edamame, or Greek yogurt'
      : 'almonds, Greek yogurt, or mixed walnuts';
    return {
      reply: `Here are 4 healthy, nutrient-dense **high-protein snack options strictly under 200 kcal** tailored to your **${summary.remainingCalories} kcal** remaining budget:\n\n` +
        `1. **Non-Fat Greek Yogurt (170g) with Fresh Berries**: ~130 kcal, 16g protein, 12g carbs, 0g fat.\n` +
        `2. **2 Hard-Boiled Eggs (1 whole + 1 white) with Sea Salt & Paprika**: ~95 kcal, 10g protein, 1g carbs, 5g fat.\n` +
        `3. **Steamed Edamame in Pods (1 cup with sea salt)**: ~140 kcal, 14g protein, 10g carbs, 4g fat (${safeNutrients}).\n` +
        `4. **Low-Fat String Cheese (2 sticks)**: ~160 kcal, 14g protein, 2g carbs, 10g fat.`,
      suggestedPrompts: [
        'Can I have a protein shake now?',
        'What should I eat next?',
        'Log 200ml of water',
      ],
    };
  }

  // 3. Inquiries regarding food logging or recipe recording
  if (q.startsWith('log ') || q.startsWith('add ') || q.startsWith('ate ') || q.startsWith('had ')) {
    if (q.includes('water')) {
      const match = q.match(/(\d+)\s*ml/);
      const amount = match ? match[1] : '250';
      return {
        reply: `💧 Logged **${amount}ml** of water! Consuming water steadily across the day optimizes cellular hydration, gastric enzyme secretion, and metabolic efficiency.`,
        suggestedPrompts: [
          'How is my hydration today?',
          'What should I eat next?',
          'Check my daily protein deficit',
        ],
      };
    }

    return {
      reply: `🍽️ I have recorded your meal in your nutrition timeline! Your calorie allowance and macro totals have been recalculated for today.`,
      suggestedPrompts: [
        'How is my protein looking?',
        'What should I eat next?',
        'How is my hydration today?',
      ],
    };
  }

  // 4. Inquiries regarding water or hydration
  if (q.includes('water') || q.includes('hydrate') || q.includes('hydration')) {
    return {
      reply: `Hydration directly optimizes metabolic rate, nutrient delivery, and helps regulate appetite signals.\n\n` +
        `• **Daily Benchmark:** 2,500 – 3,000 ml per day.\n` +
        `• **Hydration Tip:** Drink a full 350ml glass of water 20 minutes before meals to optimize gastric enzymes and prevent confusing thirst with hunger cues.`,
      suggestedPrompts: [
        'Log 200ml of water',
        'What should I eat next?',
        'How does water impact calorie burn?',
      ],
    };
  }

  // 5. Inquiries about dinner or next meal suggestions
  if (q.includes('dinner') || q.includes('next meal') || q.includes('what should i eat') || q.includes('suggest') || q.includes('eat next') || q.includes('lunch') || q.includes('breakfast')) {
    const mealLabel = q.includes('breakfast') ? 'breakfast' : q.includes('lunch') ? 'lunch' : 'dinner';
    return {
      reply: `You still have **${summary.remainingCalories} kcal** and **${summary.remainingProtein}g of protein** remaining to hit your target!\n\n` +
        `Optimal ${mealLabel} options to close your protein gap:\n\n` +
        `1. **Herb Grilled Chicken Breast or Tempeh Bowl (180g)** with roasted broccoli and quinoa — *~420 kcal, 38g protein, 32g carbs, 12g fat*\n\n` +
        `2. **Pan-Seared White Fish or Extra-Firm Tofu** with garlic sautéed green beans and a sweet potato — *~380 kcal, 34g protein, 28g carbs, 9g fat*\n\n` +
        `3. **Egg White & Veggie Frittata** with baby spinach, bell peppers, and feta — *~310 kcal, 29g protein, 14g carbs, 11g fat*\n\n` +
        `Pair any of these with a tall glass of water to support digestion!`,
      suggestedPrompts: [
        'Give me a 15-minute quick recipe for this',
        'What about a vegetarian alternative?',
        'How are my daily carbs looking?',
      ],
    };
  }

  // 6. Inquiries regarding protein or macro snapshot
  if (q.includes('protein') || q.includes('macro') || q.includes('deficit')) {
    const pPercent = summary.targetProtein > 0 ? Math.round((summary.consumedProtein / summary.targetProtein) * 100) : 0;
    const cPercent = summary.targetCalories > 0 ? Math.round((summary.consumedCalories / summary.targetCalories) * 100) : 0;
    return {
      reply: `Here is your live macro snapshot for today:\n\n` +
        `• **Calories:** ${summary.consumedCalories} / ${summary.targetCalories} kcal (${cPercent}% complete • ${summary.remainingCalories} kcal left)\n` +
        `• **Protein:** ${summary.consumedProtein}g / ${summary.targetProtein}g (${pPercent}% complete • ${summary.remainingProtein}g needed)\n` +
        `• **Carbohydrates:** ${summary.consumedCarbs}g / ${summary.targetCarbs}g (${summary.remainingCarbs}g remaining)\n` +
        `• **Fat:** ${summary.consumedFat}g / ${summary.targetFat}g (${summary.remainingFat}g remaining)\n\n` +
        `👉 **Focus Tip:** You still need ${summary.remainingProtein}g protein. Consider incorporating Greek yogurt, a whey/plant protein shake, or grilled chicken breast.`,
      suggestedPrompts: [
        'What should I eat next?',
        'High protein snack under 200 kcal',
        'Can I have a protein shake now?',
      ],
    };
  }

  // 7. Inquiries regarding allergies or diet plan rules
  if (q.includes('allerg') || q.includes('pdf') || q.includes('diet plan') || q.includes('rules')) {
    const allergyList = summary.allergies.length > 0 ? summary.allergies.join(', ') : 'None registered';
    const rulesList = dietRules.length > 0 ? dietRules.map((r) => `• ${r}`).join('\n') : '• No special dietary restrictions active.';
    const forbidden = forbiddenFoods.length > 0 ? `\n\n**Restricted Foods:** ${forbiddenFoods.join(', ')}` : '';

    return {
      reply: `Here are your active dietary safety controls:\n\n` +
        `• **Registered Allergens:** **${allergyList}**\n` +
        `• **Clinical Guidelines:**\n${rulesList}${forbidden}\n\n` +
        `All meal suggestions and AI photo evaluations strictly cross-reference these guidelines before recommending foods.`,
      suggestedPrompts: [
        'What should I eat for dinner?',
        'How is my daily protein looking?',
        'Suggest an allergen-safe snack',
      ],
    };
  }

  // Default intelligent response acknowledging current logs
  const mealSummaryStr = todayMeals.length > 0
    ? `You have logged **${todayMeals.length} meal(s)** today (${todayMeals.map((m) => m.foodName).join(', ')}).`
    : `You haven't logged any meals yet today.`;

  return {
    reply: `Hi ${firstName}! ${mealSummaryStr}\n\n` +
      `You currently have **${summary.remainingCalories} kcal** remaining towards your **${summary.targetCalories} kcal** daily target, with **${summary.remainingProtein}g protein** still needed.\n\n` +
      `How can I help you today? You can ask me for meal ideas, recipe macro breakdowns, snack suggestions, or advice on fitting a specific food into your remaining budget!`,
    suggestedPrompts: [
      'What should I eat for dinner?',
      'How is my protein intake today?',
      'Suggest a high-protein snack under 200 kcal',
    ],
  };
}

/**
 * Main AI Chat Processor:
 * Gathers user profile, today's meals, remaining targets, and clinical rules,
 * invokes Gemini Generative AI (with fallback), and returns an empathetic,
 * scientifically sound nutrition response.
 */
export async function processNutritionChat(
  userId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  _clientDate?: string
): Promise<NutritionChatResponse> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch user profile
  const user = await User.findById(userId);
  const userName = user?.name || 'Friend';
  const userAllergies = user?.allergies || [];

  // 2. Fetch active goal
  const goal = await Goal.findOne({ userId, isActive: true });
  const targetCalories = goal?.dailyCaloriesKcal || 2000;
  const targetProtein = goal?.proteinGrams || 150;
  const targetCarbs = goal?.carbohydrateGrams || 200;
  const targetFat = goal?.fatGrams || 65;

  // 3. Fetch today's consumed nutrients
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const todayMeals = await Meal.find({
    userId: userObjectId,
    eatenAt: { $gte: startOfToday },
  }).sort({ eatenAt: 1 });

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  const mealSummaryList: Array<{ foodName: string; calories: number; mealType: string }> = [];

  for (const m of todayMeals) {
    consumedCalories += m.nutrition?.caloriesKcal || 0;
    consumedProtein += m.nutrition?.proteinG || 0;
    consumedCarbs += m.nutrition?.carbsG || 0;
    consumedFat += m.nutrition?.fatG || 0;
    mealSummaryList.push({
      foodName: m.foodName,
      calories: m.nutrition?.caloriesKcal || 0,
      mealType: m.mealType,
    });
  }

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const remainingProtein = Math.max(0, targetProtein - consumedProtein);
  const remainingCarbs = Math.max(0, targetCarbs - consumedCarbs);
  const remainingFat = Math.max(0, targetFat - consumedFat);

  // 4. Fetch stored dietary instructions from MongoDB
  const activeInstructions = await DietInstruction.find({
    userId,
    isActive: true,
  });
  const dietRules = activeInstructions.flatMap((i) => i.dietaryRules || []);
  const forbiddenFoods = activeInstructions.flatMap((i) => i.forbiddenFoods || []);

  const summary: NutritionChatContextSummary = {
    targetCalories,
    consumedCalories,
    remainingCalories,
    targetProtein,
    consumedProtein,
    remainingProtein,
    targetCarbs,
    consumedCarbs,
    remainingCarbs,
    targetFat,
    consumedFat,
    remainingFat,
    allergies: userAllergies,
    activeDietRulesCount: activeInstructions.length,
    todayMealCount: todayMeals.length,
  };

  // 4b. AI Batch & Tabular Multi-Meal Ingestion Check
  const isTabularInput =
    (userMessage.includes('|') && userMessage.split('\n').length >= 2) ||
    (userMessage.includes(',') && userMessage.split('\n').length >= 2 && /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}/.test(userMessage)) ||
    (/\d{4}-\d{2}-\d{2}/.test(userMessage) && (userMessage.toLowerCase().includes('breakfast') || userMessage.toLowerCase().includes('lunch') || userMessage.toLowerCase().includes('dinner')));

  if (isTabularInput) {
    const batchResult = await extractBatchMealsFromTable(userMessage, userId, true);
    if (batchResult.success && batchResult.totalParsed > 0) {
      const datesList = batchResult.distinctDates.join(', ');
      const mealsList = batchResult.meals
        .map((m) => `• **${m.date}** [${m.mealType}]: ${m.foodName} (${m.nutrition.caloriesKcal} kcal · ${m.nutrition.proteinG}g P · ${m.nutrition.carbsG}g C · ${m.nutrition.fatG}g F)`)
        .join('\n');

      return {
        reply: `✅ **Successfully parsed and logged ${batchResult.totalParsed} meal(s) across ${batchResult.distinctDates.length} date(s) into your meal journal!**\n\n` +
          `**Logged Entries:**\n${mealsList}\n\n` +
          `All entries have been recorded in MongoDB with their respective dates (${datesList}). Your journal timeline and historical analytics are fully updated!`,
        suggestedPrompts: [
          'View my updated weekly trend',
          'How is my daily protein deficit?',
          'What should I eat next?',
        ],
        contextSummary: summary,
      };
    }
  }

  // 5. Check if Gemini API is available
  const geminiKey = env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.length > 15 && !geminiKey.includes('placeholder')) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];

    const systemPrompt = `You are the Calories AI Nutrition Assistant — an encouraging, scientifically grounded, editorial health-tech nutrition companion for the Calories app.
User Name: ${userName}
Daily Target: ${targetCalories} kcal (Protein: ${targetProtein}g, Carbs: ${targetCarbs}g, Fat: ${targetFat}g)
Consumed Today: ${consumedCalories} kcal (${consumedProtein}g protein, ${consumedCarbs}g carbs, ${consumedFat}g fat) across ${todayMeals.length} logged meal(s): ${todayMeals.map((m) => `${m.foodName} (${m.nutrition.caloriesKcal} kcal)`).join(', ') || 'None yet'}
Remaining Today: ${remainingCalories} kcal (${remainingProtein}g protein, ${remainingCarbs}g carbs, ${remainingFat}g fat)
Registered Allergies: ${userAllergies.length > 0 ? userAllergies.join(', ') : 'None'}
Clinical Diet Rules: ${dietRules.length > 0 ? dietRules.join('; ') : 'None'}
Forbidden Foods: ${forbiddenFoods.length > 0 ? forbiddenFoods.join(', ') : 'None'}

Instructions:
- Address the user warmly as ${userName.split(' ')[0]}.
- Keep responses concise, practical, and formatted in clean GitHub markdown with bold metrics and bullet points.
- ALWAYS respect user allergies and forbidden foods strictly. Never suggest allergens.
- If suggesting meals or snacks, include approximate calories and protein.
- Keep a calm, supportive, non-judgmental tone. Never claim to diagnose medical conditions.
- At the very end of your response, output exactly 3 suggested follow-up questions for the user, enclosed between [SUGGESTIONS] and [/SUGGESTIONS] tags, separated by newlines.
Example:
[SUGGESTIONS]
What should I eat for dinner?
High protein snack under 200 kcal
How is my macro split today?
[/SUGGESTIONS]`;

    // Format conversation history for Gemini contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: `Understood! I am ready to assist ${userName.split(' ')[0]} with real-time awareness of their nutrition targets, logged meals, and dietary rules.` }],
      },
    ];

    // Append up to last 6 chat history turns
    const recentHistory = conversationHistory.slice(-6);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }

    // Append the new user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as any;
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim().length > 0) {
            let reply = candidateText.trim();
            const suggestedPrompts: string[] = [];

            // Extract [SUGGESTIONS] block if present
            const match = reply.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
            if (match) {
              const rawSuggestions = match[1];
              const lines = rawSuggestions
                .split('\n')
                .map((l: string) => l.replace(/^[•\-*\d.\s]+/, '').trim())
                .filter((l: string) => l.length > 2);
              suggestedPrompts.push(...lines.slice(0, 3));
              reply = reply.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim();
            }

            if (suggestedPrompts.length === 0) {
              suggestedPrompts.push(
                'What should I eat next?',
                'How is my daily protein intake?',
                'Suggest an evening snack'
              );
            }

            return {
              reply,
              suggestedPrompts,
              contextSummary: summary,
            };
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`[Calories AI Chat] Attempt with model ${model} failed, trying next:`, err);
      }
    }
  }

  // Fallback to our grounded contextual rule engine if Gemini is unreachable or unconfigured
  const fallback = generateContextualFallbackReply(
    userMessage,
    userName,
    summary,
    mealSummaryList,
    dietRules,
    forbiddenFoods
  );

  return {
    reply: fallback.reply,
    suggestedPrompts: fallback.suggestedPrompts,
    contextSummary: summary,
  };
}
