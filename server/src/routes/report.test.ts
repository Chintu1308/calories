import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { Meal } from '../models/Meal.js';
import { Goal } from '../models/Goal.js';
import { generateToken } from '../utils/security.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

const userAId = new mongoose.Types.ObjectId().toString();
const userBId = new mongoose.Types.ObjectId().toString();

const tokenA = generateToken({ userId: userAId, email: 'user.reports.a@example.com' });
const tokenB = generateToken({ userId: userBId, email: 'user.reports.b@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed User A's Goal
  await Goal.create({
    userId: userAId,
    title: 'Editorial Target',
    dailyCaloriesKcal: 2200,
    proteinGrams: 150,
    carbohydrateGrams: 220,
    fatGrams: 70,
    isActive: true,
  });

  // Seed meals for User A across 3 days
  const d1 = new Date('2026-10-22T10:00:00.000Z');
  const d2 = new Date('2026-10-23T12:00:00.000Z');
  const d3 = new Date('2026-10-24T18:00:00.000Z');

  await Meal.insertMany([
    {
      userId: userAId,
      foodName: 'Avocado Toast & Eggs',
      mealType: 'Breakfast',
      eatenAt: d1,
      quantity: { amount: 1, unit: 'portion' },
      nutrition: { caloriesKcal: 450, proteinG: 22, carbsG: 35, fatG: 25 },
      micronutrients: [
        { name: 'Potassium', amount: 500, unit: 'mg' },
        { name: 'Vitamin C', amount: 12, unit: 'mg' },
      ],
      source: 'manual',
    },
    {
      userId: userAId,
      foodName: 'Grilled Salmon Quinoa Bowl',
      mealType: 'Lunch',
      eatenAt: d2,
      quantity: { amount: 350, unit: 'g' },
      nutrition: { caloriesKcal: 650, proteinG: 45, carbsG: 50, fatG: 30 },
      micronutrients: [
        { name: 'Potassium', amount: 620, unit: 'mg' },
        { name: 'Iron', amount: 3.5, unit: 'mg' },
      ],
      source: 'manual',
    },
    {
      userId: userAId,
      foodName: 'Protein Shake',
      mealType: 'Snacks',
      eatenAt: d3,
      quantity: { amount: 300, unit: 'ml' },
      nutrition: { caloriesKcal: 250, proteinG: 30, carbsG: 10, fatG: 3 },
      // Micronutrients omitted to verify honest absence semantics
      source: 'manual',
    },
  ]);
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await mongoose.disconnect();
  await mongod.stop();
});

test('Report endpoints require valid Bearer token (401)', async () => {
  const resWeekly = await fetch(`${baseUrl}/api/v1/reports/weekly-calories`);
  assert.equal(resWeekly.status, 401);

  const resMacros = await fetch(`${baseUrl}/api/v1/reports/macros`);
  assert.equal(resMacros.status, 401);

  const resMicro = await fetch(`${baseUrl}/api/v1/reports/micronutrients`);
  assert.equal(resMicro.status, 401);

  const resGoals = await fetch(`${baseUrl}/api/v1/reports/goals`);
  assert.equal(resGoals.status, 401);
});

test('GET /api/v1/reports/weekly-calories aggregates 7-day chronological totals with goal comparison', async () => {
  const res = await fetch(`${baseUrl}/api/v1/reports/weekly-calories?weekStart=2026-10-20`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    startDate: string;
    targetCalories: number;
    days: Array<{ date: string; caloriesKcal: number; targetCalories: number; mealCount: number }>;
  };

  assert.equal(data.targetCalories, 2200);
  assert.equal(data.days.length, 7);

  // Day 2026-10-22 has 450 kcal
  const day22 = data.days.find((d) => d.date === '2026-10-22');
  assert.ok(day22);
  assert.equal(day22.caloriesKcal, 450);
  assert.equal(day22.mealCount, 1);

  // Day 2026-10-23 has 650 kcal
  const day23 = data.days.find((d) => d.date === '2026-10-23');
  assert.ok(day23);
  assert.equal(day23.caloriesKcal, 650);
  assert.equal(day23.mealCount, 1);
});

test('GET /api/v1/reports/macros computes daily macro sums and energy percentage split', async () => {
  const res = await fetch(`${baseUrl}/api/v1/reports/macros?groupBy=day`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    groupBy: string;
    data: Array<{
      period: string;
      proteinG: number;
      carbsG: number;
      fatG: number;
      caloriesKcal: number;
      energySplit: { proteinPct: number; carbsPct: number; fatPct: number };
    }>;
  };

  assert.equal(data.groupBy, 'day');
  assert.equal(data.data.length, 3); // 3 distinct dates

  const entry22 = data.data.find((d) => d.period === '2026-10-22');
  assert.ok(entry22);
  assert.equal(entry22.proteinG, 22);
  assert.equal(entry22.carbsG, 35);
  assert.equal(entry22.fatG, 25);
  // Total macro kcal = 22*4 + 35*4 + 25*9 = 88 + 140 + 225 = 453 kcal
  // proteinPct = 88 / 453 = 19%
  // carbsPct = 140 / 453 = 31%
  // fatPct = 225 / 453 = 50%
  assert.equal(entry22.energySplit.proteinPct, 19);
  assert.equal(entry22.energySplit.carbsPct, 31);
  assert.equal(entry22.energySplit.fatPct, 50);
});

test('GET /api/v1/reports/macros supports groupBy=week', async () => {
  const res = await fetch(`${baseUrl}/api/v1/reports/macros?groupBy=week`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    groupBy: string;
    data: Array<{ period: string; proteinG: number; caloriesKcal: number }>;
  };

  assert.equal(data.groupBy, 'week');
  assert.ok(data.data.length >= 1);
  assert.ok(data.data[0]?.period.includes('W'));
});

test('GET /api/v1/reports/micronutrients aggregates reported micronutrients with honest absence semantics', async () => {
  const res = await fetch(`${baseUrl}/api/v1/reports/micronutrients`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    nutrients: Array<{ name: string; totalAmount: number; unit: string; loggedCount: number }>;
    totalDistinctNutrients: number;
  };

  assert.equal(data.totalDistinctNutrients, 3); // Potassium, Vitamin C, Iron

  // Potassium was logged twice (500 + 620 = 1120 mg)
  const pot = data.nutrients.find((n) => n.name === 'Potassium');
  assert.ok(pot);
  assert.equal(pot.totalAmount, 1120);
  assert.equal(pot.unit, 'mg');
  assert.equal(pot.loggedCount, 2);

  // Iron logged once (3.5 mg)
  const iron = data.nutrients.find((n) => n.name === 'Iron');
  assert.ok(iron);
  assert.equal(iron.totalAmount, 3.5);
  assert.equal(iron.unit, 'mg');
  assert.equal(iron.loggedCount, 1);
});

test('GET /api/v1/reports/goals compares actual average against active goal targets', async () => {
  const res = await fetch(`${baseUrl}/api/v1/reports/goals`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    actual: { avgCaloriesKcal: number; avgProteinG: number; daysLogged: number };
    goal: { dailyCaloriesKcal: number; proteinGrams: number };
    complianceRatePct: number;
  };

  assert.equal(data.actual.daysLogged, 3);
  // Total calories: 450 + 650 + 250 = 1350 / 3 = 450 avg kcal
  assert.equal(data.actual.avgCaloriesKcal, 450);
  assert.equal(data.goal.dailyCaloriesKcal, 2200);
  assert.ok(data.complianceRatePct >= 0 && data.complianceRatePct <= 100);
});

test('Strict Tenant Isolation: User B receives zeroed reports with zero User A leakage', async () => {
  const resWeeklyB = await fetch(`${baseUrl}/api/v1/reports/weekly-calories`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resWeeklyB.status, 200);
  const dataWeeklyB = (await resWeeklyB.json()) as { days: Array<{ caloriesKcal: number }> };
  for (const day of dataWeeklyB.days) {
    assert.equal(day.caloriesKcal, 0);
  }

  const resMacrosB = await fetch(`${baseUrl}/api/v1/reports/macros`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resMacrosB.status, 200);
  const dataMacrosB = (await resMacrosB.json()) as { data: unknown[] };
  assert.equal(dataMacrosB.data.length, 0);

  const resMicroB = await fetch(`${baseUrl}/api/v1/reports/micronutrients`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resMicroB.status, 200);
  const dataMicroB = (await resMicroB.json()) as { nutrients: unknown[]; totalDistinctNutrients: number };
  assert.equal(dataMicroB.totalDistinctNutrients, 0);
  assert.equal(dataMicroB.nutrients.length, 0);
});
