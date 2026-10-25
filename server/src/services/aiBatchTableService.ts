import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Meal, type MealType } from '../models/Meal.js';
import { NUTRITION_DATASET } from '../data/nutritionDataset.js';

export interface ParsedBatchMeal {
  tempId: string;
  date: string; // YYYY-MM-DD
  eatenAt: string; // ISO date-time string
  mealType: MealType;
  foodName: string;
  quantity: { amount: number; unit: string };
  nutrition: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  notes?: string;
}

export interface BatchExtractTableResult {
  success: boolean;
  message: string;
  totalParsed: number;
  distinctDates: string[];
  meals: ParsedBatchMeal[];
  committedMeals?: any[];
}

/**
 * Normalizes varied date strings (e.g., "2026-10-20", "20/10/2026", "Oct 20", "today", "yesterday")
 * into a canonical YYYY-MM-DD date string.
 */
export function normalizeDate(dateStr: string, referenceDate: Date = new Date()): string {
  const trimmed = dateStr.trim().toLowerCase();
  const ref = new Date(referenceDate);

  if (trimmed === 'today' || !trimmed) {
    return ref.toISOString().split('T')[0]!;
  }

  if (trimmed === 'yesterday') {
    ref.setDate(ref.getDate() - 1);
    return ref.toISOString().split('T')[0]!;
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Month Name formats e.g. "Oct 20", "20 Oct", "October 20, 2026"
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    // If year is default 2001 or missing, supply reference year
    if (parsedDate.getFullYear() < 2020) {
      parsedDate.setFullYear(ref.getFullYear());
    }
    return parsedDate.toISOString().split('T')[0]!;
  }

  return ref.toISOString().split('T')[0]!;
}

/**
 * Normalizes varied meal type strings into strictly supported types.
 */
export function normalizeMealType(typeStr: string, foodName?: string): MealType {
  const lower = (typeStr || '').trim().toLowerCase();
  if (lower.includes('break') || lower.includes('morn')) return 'Breakfast';
  if (lower.includes('lunch') || lower.includes('noon')) return 'Lunch';
  if (lower.includes('din') || lower.includes('supper') || lower.includes('night')) return 'Dinner';
  if (lower.includes('snack') || lower.includes('tea') || lower.includes('eve')) return 'Snacks';
  if (lower.includes('brunch')) return 'Breakfast';

  // Infer from food if available
  if (foodName) {
    const fLower = foodName.toLowerCase();
    if (fLower.includes('dosa') || fLower.includes('idli') || fLower.includes('oat') || fLower.includes('pancake') || fLower.includes('cereal') || fLower.includes('egg')) {
      return 'Breakfast';
    }
    if (fLower.includes('salad') || fLower.includes('sandwich') || fLower.includes('wrap') || fLower.includes('curry') || fLower.includes('rice') || fLower.includes('biryani')) {
      return 'Lunch';
    }
  }

  return 'Lunch';
}

/**
 * Estimates missing nutritional values (calories, protein, carbs, fat)
 * using the curated nutritional dataset.
 */
export function estimateMissingNutrition(
  foodName: string,
  qtyAmount: number = 1
): { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number } {
  const fLower = foodName.toLowerCase();

  // Search dataset for direct or partial match
  const matched = NUTRITION_DATASET.find((item) => {
    const itemLower = item.name.toLowerCase();
    return itemLower.includes(fLower) || fLower.includes(itemLower);
  });

  if (matched) {
    const factor = Math.max(0.5, Math.min(qtyAmount, 5));
    return {
      caloriesKcal: Math.round(matched.calories * factor),
      proteinG: Math.round(matched.protein * factor),
      carbsG: Math.round(matched.carbs * factor),
      fatG: Math.round(matched.fat * factor),
    };
  }

  // Keyword heuristic fallback
  if (fLower.includes('dosa')) return { caloriesKcal: 210 * qtyAmount, proteinG: 5 * qtyAmount, carbsG: 32 * qtyAmount, fatG: 7 * qtyAmount };
  if (fLower.includes('idli')) return { caloriesKcal: 70 * qtyAmount, proteinG: 2 * qtyAmount, carbsG: 14 * qtyAmount, fatG: 1 * qtyAmount };
  if (fLower.includes('egg')) return { caloriesKcal: 78 * qtyAmount, proteinG: 6 * qtyAmount, carbsG: 1 * qtyAmount, fatG: 5 * qtyAmount };
  if (fLower.includes('chicken')) return { caloriesKcal: 220 * qtyAmount, proteinG: 30 * qtyAmount, carbsG: 2 * qtyAmount, fatG: 8 * qtyAmount };
  if (fLower.includes('rice')) return { caloriesKcal: 200 * qtyAmount, proteinG: 4 * qtyAmount, carbsG: 44 * qtyAmount, fatG: 1 * qtyAmount };
  if (fLower.includes('paneer') || fLower.includes('tofu')) return { caloriesKcal: 240 * qtyAmount, proteinG: 18 * qtyAmount, carbsG: 6 * qtyAmount, fatG: 16 * qtyAmount };
  if (fLower.includes('salad')) return { caloriesKcal: 150 * qtyAmount, proteinG: 4 * qtyAmount, carbsG: 12 * qtyAmount, fatG: 8 * qtyAmount };

  // Generic reasonable baseline per serving
  return {
    caloriesKcal: 250 * Math.max(1, qtyAmount),
    proteinG: 10 * Math.max(1, qtyAmount),
    carbsG: 30 * Math.max(1, qtyAmount),
    fatG: 8 * Math.max(1, qtyAmount),
  };
}

/**
 * Deterministic offline table parser for CSV, Markdown tables, and structured lines.
 * Operates without external API dependency.
 */
export function parseTableOffline(rawText: string, referenceDate: Date = new Date()): ParsedBatchMeal[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const results: ParsedBatchMeal[] = [];
  let currentDate = normalizeDate('', referenceDate);
  let idCounter = 1;

  for (const line of lines) {
    // Skip markdown header separators e.g. |---|---|---|
    if (/^[|\s\-:]+$/.test(line)) continue;

    // 1. Pipe-separated Markdown table row: | 2026-10-20 | Breakfast | Food | ...
    if (line.includes('|')) {
      const cols = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => {
          // Ignore leading and trailing empty splits from outer pipes
          if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
          return true;
        });

      if (cols.length >= 2) {
        // Skip header row if it contains keywords like "date" and "food"
        const headerTest = cols.join(' ').toLowerCase();
        if ((headerTest.includes('date') || headerTest.includes('day')) && (headerTest.includes('meal') || headerTest.includes('food') || headerTest.includes('item'))) {
          continue;
        }

        let rowDate = currentDate;
        let mealTypeStr = '';
        let foodName = '';
        let quantityStr = '1 serving';
        let calStr = '';
        let protStr = '';
        let carbStr = '';
        let fatStr = '';

        // Check if first column is date
        if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|today|yesterday|[a-zA-Z]{3,9}\s+\d{1,2}/i.test(cols[0] || '')) {
          rowDate = normalizeDate(cols[0] || '', referenceDate);
          currentDate = rowDate;
          mealTypeStr = cols[1] || '';
          foodName = cols[2] || cols[1] || '';
          quantityStr = cols[3] || '1 serving';
          calStr = cols[4] || '';
          protStr = cols[5] || '';
          carbStr = cols[6] || '';
          fatStr = cols[7] || '';
        } else {
          // First column might be meal type or food
          mealTypeStr = cols[0] || '';
          foodName = cols[1] || '';
          quantityStr = cols[2] || '1 serving';
          calStr = cols[3] || '';
          protStr = cols[4] || '';
          carbStr = cols[5] || '';
          fatStr = cols[6] || '';
        }

        if (!foodName || foodName.toLowerCase() === 'food' || foodName.toLowerCase() === 'item') continue;

        const mealType = normalizeMealType(mealTypeStr, foodName);
        const qtyAmount = parseFloat(quantityStr) || 1;
        const qtyUnit = quantityStr.replace(/^[\d.\s]+/, '').trim() || 'serving';

        const calNum = parseFloat(calStr);
        const protNum = parseFloat(protStr);
        const carbNum = parseFloat(carbStr);
        const fatNum = parseFloat(fatStr);

        const nutrition = (!isNaN(calNum) && calNum > 0)
          ? {
              caloriesKcal: Math.round(calNum),
              proteinG: !isNaN(protNum) ? Math.round(protNum) : 0,
              carbsG: !isNaN(carbNum) ? Math.round(carbNum) : 0,
              fatG: !isNaN(fatNum) ? Math.round(fatNum) : 0,
            }
          : estimateMissingNutrition(foodName, qtyAmount);

        // Calculate eatenAt ISO timestamp
        let hours = 12;
        if (mealType === 'Breakfast') hours = 8;
        else if (mealType === 'Lunch') hours = 13;
        else if (mealType === 'Dinner') hours = 19;
        else if (mealType === 'Snacks') hours = 16;

        const dateParts = rowDate.split('-').map(Number);
        const eatenAtDate = new Date(dateParts[0] || referenceDate.getFullYear(), (dateParts[1] || 1) - 1, dateParts[2] || referenceDate.getDate(), hours, 0, 0);

        results.push({
          tempId: `batch_${Date.now()}_${idCounter++}`,
          date: rowDate,
          eatenAt: eatenAtDate.toISOString(),
          mealType,
          foodName,
          quantity: { amount: qtyAmount, unit: qtyUnit },
          nutrition,
          notes: 'Parsed from table via AI Tabular Importer',
        });
      }
      continue;
    }

    // 2. CSV / Comma or Tab-separated line
    if (line.includes(',') || line.includes('\t')) {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      // Check header
      const headerTest = cols.join(' ').toLowerCase();
      if ((headerTest.includes('date') || headerTest.includes('day')) && (headerTest.includes('food') || headerTest.includes('item') || headerTest.includes('meal'))) {
        continue;
      }

      if (cols.length >= 2) {
        let rowDate = currentDate;
        let mealTypeStr = '';
        let foodName = '';
        let quantityStr = '1 serving';
        let calStr = '';
        let protStr = '';
        let carbStr = '';
        let fatStr = '';

        if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|today|yesterday/i.test(cols[0] || '')) {
          rowDate = normalizeDate(cols[0] || '', referenceDate);
          currentDate = rowDate;
          mealTypeStr = cols[1] || '';
          foodName = cols[2] || cols[1] || '';
          quantityStr = cols[3] || '1 serving';
          calStr = cols[4] || '';
          protStr = cols[5] || '';
          carbStr = cols[6] || '';
          fatStr = cols[7] || '';
        } else {
          mealTypeStr = cols[0] || '';
          foodName = cols[1] || '';
          quantityStr = cols[2] || '1 serving';
          calStr = cols[3] || '';
          protStr = cols[4] || '';
          carbStr = cols[5] || '';
          fatStr = cols[6] || '';
        }

        if (!foodName || foodName.toLowerCase() === 'food') continue;

        const mealType = normalizeMealType(mealTypeStr, foodName);
        const qtyAmount = parseFloat(quantityStr) || 1;
        const qtyUnit = quantityStr.replace(/^[\d.\s]+/, '').trim() || 'serving';

        const calNum = parseFloat(calStr);
        const protNum = parseFloat(protStr);
        const carbNum = parseFloat(carbStr);
        const fatNum = parseFloat(fatStr);

        const nutrition = (!isNaN(calNum) && calNum > 0)
          ? {
              caloriesKcal: Math.round(calNum),
              proteinG: !isNaN(protNum) ? Math.round(protNum) : 0,
              carbsG: !isNaN(carbNum) ? Math.round(carbNum) : 0,
              fatG: !isNaN(fatNum) ? Math.round(fatNum) : 0,
            }
          : estimateMissingNutrition(foodName, qtyAmount);

        let hours = 12;
        if (mealType === 'Breakfast') hours = 8;
        else if (mealType === 'Lunch') hours = 13;
        else if (mealType === 'Dinner') hours = 19;
        else if (mealType === 'Snacks') hours = 16;

        const dateParts = rowDate.split('-').map(Number);
        const eatenAtDate = new Date(dateParts[0] || referenceDate.getFullYear(), (dateParts[1] || 1) - 1, dateParts[2] || referenceDate.getDate(), hours, 0, 0);

        results.push({
          tempId: `batch_${Date.now()}_${idCounter++}`,
          date: rowDate,
          eatenAt: eatenAtDate.toISOString(),
          mealType,
          foodName,
          quantity: { amount: qtyAmount, unit: qtyUnit },
          nutrition,
          notes: 'Parsed from CSV via AI Tabular Importer',
        });
      }
      continue;
    }

    // 3. Colon or bullet structured format e.g. "2026-10-20 Breakfast: 2 Dosas (350 kcal)"
    const datePrefixMatch = line.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|today|yesterday)[\s:,-]+(.+)$/i);
    if (datePrefixMatch && datePrefixMatch[1] && datePrefixMatch[2]) {
      currentDate = normalizeDate(datePrefixMatch[1], referenceDate);
      const remainder = datePrefixMatch[2].trim();
      const mealMatch = remainder.match(/^(breakfast|lunch|dinner|snacks?)[\s:,-]+(.+)$/i);
      const mealTypeStr = mealMatch ? mealMatch[1] || '' : '';
      const foodPart = mealMatch ? mealMatch[2] || remainder : remainder;

      const calInParens = foodPart.match(/\(?(\d+)\s*kcal\)?/i);
      const cleanFoodName = foodPart.replace(/\(?\d+\s*kcal\)?/i, '').trim();

      const mealType = normalizeMealType(mealTypeStr, cleanFoodName);
      const calNum = calInParens ? parseFloat(calInParens[1] || '') : NaN;
      const nutrition = !isNaN(calNum) && calNum > 0
        ? { caloriesKcal: Math.round(calNum), proteinG: Math.round(calNum * 0.05), carbsG: Math.round(calNum * 0.12), fatG: Math.round(calNum * 0.03) }
        : estimateMissingNutrition(cleanFoodName, 1);

      let hours = 12;
      if (mealType === 'Breakfast') hours = 8;
      else if (mealType === 'Lunch') hours = 13;
      else if (mealType === 'Dinner') hours = 19;
      else if (mealType === 'Snacks') hours = 16;

      const dateParts = currentDate.split('-').map(Number);
      const eatenAtDate = new Date(dateParts[0] || referenceDate.getFullYear(), (dateParts[1] || 1) - 1, dateParts[2] || referenceDate.getDate(), hours, 0, 0);

      results.push({
        tempId: `batch_${Date.now()}_${idCounter++}`,
        date: currentDate,
        eatenAt: eatenAtDate.toISOString(),
        mealType,
        foodName: cleanFoodName,
        quantity: { amount: 1, unit: 'serving' },
        nutrition,
        notes: 'Parsed from free-form multi-date text via AI',
      });
    }
  }

  return results;
}

/**
 * Main batch tabular meal extractor.
 * Connects to Gemini AI with cascading models, with deterministic fallback for offline/test environments.
 * If autoCommit is true and a userId is provided, persists all extracted meals to MongoDB.
 */
export async function extractBatchMealsFromTable(
  rawText: string,
  userId?: string,
  autoCommit: boolean = false,
  offlineOnly: boolean = false
): Promise<BatchExtractTableResult> {
  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      message: 'Raw table text is empty.',
      totalParsed: 0,
      distinctDates: [],
      meals: [],
    };
  }

  const geminiKey = env.GEMINI_API_KEY;
  const now = new Date();
  const refDateStr = now.toISOString().split('T')[0]!;
  let parsedMeals: ParsedBatchMeal[] = [];

  // Try Gemini AI extraction if key is present and not explicitly running in offline/test mode
  if (!offlineOnly && geminiKey && !geminiKey.includes('placeholder') && env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test') {
    const prompt = `You are an expert nutritional data ingestion AI.
The user provides tabular meal data, Markdown table, CSV, TSV, or a multi-date meal log.
Extract EVERY single meal into a clean, normalized JSON array.

Reference Date Today is: ${refDateStr}.
Guidelines:
1. Normalize dates to ISO YYYY-MM-DD. If relative ("yesterday", "Monday"), compute relative to ${refDateStr}.
2. Normalize mealType strictly to one of: "Breakfast", "Lunch", "Dinner", "Snacks".
3. Extract clean food names and portion quantity { amount: number, unit: string }.
4. If calories (kcal), protein (g), carbs (g), or fat (g) are provided in the table, preserve them. If missing, estimate realistic nutritional values based on food name and portion.
5. Return strictly valid JSON without markdown fences matching this format:
{
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "Breakfast" | "Lunch" | "Dinner" | "Snacks",
      "foodName": "Food Name",
      "quantity": { "amount": 1, "unit": "serving" },
      "nutrition": {
        "caloriesKcal": 250,
        "proteinG": 12,
        "carbsG": 30,
        "fatG": 8
      },
      "notes": "Short note"
    }
  ]
}

Input Text:
${rawText}`;

    const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) {
            const clean = rawReply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            if (Array.isArray(parsed.meals) && parsed.meals.length > 0) {
              parsedMeals = parsed.meals.map((m: any, idx: number) => {
                const date = normalizeDate(m.date || refDateStr, now);
                const mealType = normalizeMealType(m.mealType || 'Lunch', m.foodName);
                let hours = 12;
                if (mealType === 'Breakfast') hours = 8;
                else if (mealType === 'Lunch') hours = 13;
                else if (mealType === 'Dinner') hours = 19;
                else if (mealType === 'Snacks') hours = 16;

                const parts = date.split('-').map(Number);
                const eatenAtDate = new Date(parts[0] || now.getFullYear(), (parts[1] || 1) - 1, parts[2] || now.getDate(), hours, 0, 0);

                return {
                  tempId: `batch_ai_${Date.now()}_${idx + 1}`,
                  date,
                  eatenAt: eatenAtDate.toISOString(),
                  mealType,
                  foodName: m.foodName || 'Food Item',
                  quantity: {
                    amount: typeof m.quantity?.amount === 'number' ? m.quantity.amount : 1,
                    unit: m.quantity?.unit || 'serving',
                  },
                  nutrition: {
                    caloriesKcal: Math.round(Number(m.nutrition?.caloriesKcal) || 200),
                    proteinG: Math.round(Number(m.nutrition?.proteinG) || 5),
                    carbsG: Math.round(Number(m.nutrition?.carbsG) || 25),
                    fatG: Math.round(Number(m.nutrition?.fatG) || 5),
                  },
                  notes: m.notes || 'Batch parsed via Gemini AI Tabular Importer',
                };
              });
              break;
            }
          }
        }
      } catch {
        clearTimeout(timeoutId);
        // Continue to next model or deterministic fallback
      }
    }
  }

  // Fallback to offline deterministic parser if Gemini didn't return valid results
  if (parsedMeals.length === 0) {
    parsedMeals = parseTableOffline(rawText, now);
  }

  const distinctDates = Array.from(new Set(parsedMeals.map((m) => m.date))).sort();

  // If autoCommit requested and userId provided, persist all parsed meals into MongoDB
  let committedDocs: any[] | undefined;
  if (autoCommit && userId && parsedMeals.length > 0) {
    const mealDocs = parsedMeals.map((item) => ({
      userId: new mongoose.Types.ObjectId(userId),
      foodName: item.foodName,
      mealType: item.mealType,
      eatenAt: new Date(item.eatenAt),
      quantity: item.quantity,
      nutrition: item.nutrition,
      source: 'ai' as const,
      notes: item.notes || 'Batch logged via AI Tabular Importer',
    }));

    committedDocs = await Meal.insertMany(mealDocs);
  }

  return {
    success: true,
    message: `Successfully parsed ${parsedMeals.length} meal(s) across ${distinctDates.length} distinct date(s).`,
    totalParsed: parsedMeals.length,
    distinctDates,
    meals: parsedMeals,
    committedMeals: committedDocs,
  };
}
