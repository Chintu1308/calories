import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { DietInstruction } from '../models/DietInstruction.js';
import { generateToken } from '../utils/security.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

const userAId = new mongoose.Types.ObjectId().toString();
const tokenA = generateToken({ userId: userAId, email: 'rec.userA@example.com' });

const userBId = new mongoose.Types.ObjectId().toString();
const tokenB = generateToken({ userId: userBId, email: 'rec.userB@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed User A with 'Fish' and 'Shellfish' allergies, goal: 'fat_loss'
  await User.create({
    _id: userAId,
    email: 'rec.userA@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'Recommendation User A',
    heightCm: 180,
    currentWeightKg: 82,
    targetWeightKg: 75,
    primaryGoal: 'fat_loss',
    allergies: ['Fish', 'Shellfish'],
  });

  // Seed Goal for User A
  await Goal.create({
    userId: userAId,
    title: 'Fat Loss Phase',
    dailyCaloriesKcal: 1800,
    proteinGrams: 160,
    carbohydrateGrams: 150,
    fatGrams: 50,
    isActive: true,
  });

  // Seed User B without allergies, goal: 'muscle_gain'
  await User.create({
    _id: userBId,
    email: 'rec.userB@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'Recommendation User B',
    heightCm: 175,
    currentWeightKg: 68,
    targetWeightKg: 74,
    primaryGoal: 'muscle_gain',
    allergies: [],
  });

  // Seed Goal for User B
  await Goal.create({
    userId: userBId,
    title: 'Hypertrophy Phase',
    dailyCaloriesKcal: 2800,
    proteinGrams: 180,
    carbohydrateGrams: 350,
    fatGrams: 75,
    isActive: true,
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await mongoose.disconnect();
  await mongod.stop();
});

test('GET /api/v1/goals/recommendations requires authentication (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/goals/recommendations`);
  assert.equal(res.status, 401);
});

test('GET /api/v1/goals/recommendations returns dynamic proposals tailored to User A', async () => {
  const res = await fetch(`${baseUrl}/api/v1/goals/recommendations`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    remainingBudget: { caloriesKcal: number; proteinG: number };
    recommendations: Array<{
      id: string;
      foodName: string;
      nutrition: { caloriesKcal: number; proteinG: number };
      matchScore: number;
      reason: string;
      tags: string[];
    }>;
    modelInfo: { version: string; primaryGoal: string };
  };

  assert.ok(data.recommendations.length > 0);
  assert.equal(data.modelInfo.primaryGoal, 'fat_loss');

  // Verify STRICT ALLERGEN FILTERING: User A is allergic to Fish & Shellfish
  // Neither Salmon nor Shrimp may EVER appear in User A's recommendations
  for (const rec of data.recommendations) {
    assert.equal(rec.tags.includes('Fish'), false, `Leaked fish allergen: ${rec.foodName}`);
    assert.equal(rec.tags.includes('Shellfish'), false, `Leaked shellfish allergen: ${rec.foodName}`);
    assert.ok(!rec.foodName.toLowerCase().includes('salmon'), `Leaked salmon: ${rec.foodName}`);
    assert.ok(!rec.foodName.toLowerCase().includes('shrimp'), `Leaked shrimp: ${rec.foodName}`);
    assert.ok(rec.matchScore >= 60 && rec.matchScore <= 100);
    assert.ok(rec.reason.length > 0);
  }
});

test('GET /api/v1/goals/recommendations filters out foods restricted by active DietInstruction PDF', async () => {
  // Add a clinical PDF diet instruction for User A that restricts 'tofu' and 'curry'
  await DietInstruction.create({
    userId: userAId,
    fileName: 'elimination_diet.pdf',
    fileSizeBytes: 50000,
    summary: 'Clinical low-FODMAP and soy elimination',
    dietaryRules: ['Avoid unfermented soy products'],
    forbiddenFoods: ['tofu', 'curry'],
    recommendedFoods: ['chicken'],
    mealTimingNotes: [],
    isActive: true,
  });

  const res = await fetch(`${baseUrl}/api/v1/goals/recommendations`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    recommendations: Array<{ foodName: string; guidedByPdf?: boolean }>;
  };

  for (const rec of data.recommendations) {
    assert.ok(!rec.foodName.toLowerCase().includes('tofu'), `PDF forbidden food leaked: ${rec.foodName}`);
    assert.ok(!rec.foodName.toLowerCase().includes('curry'), `PDF forbidden food leaked: ${rec.foodName}`);
  }
});

test('Strict Tenant Isolation: User B receives distinct recommendations for muscle_gain', async () => {
  const res = await fetch(`${baseUrl}/api/v1/goals/recommendations`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    modelInfo: { primaryGoal: string };
    remainingBudget: { caloriesKcal: number };
    recommendations: Array<{ foodName: string }>;
  };

  assert.equal(data.modelInfo.primaryGoal, 'muscle_gain');
  assert.equal(data.remainingBudget.caloriesKcal, 2800);
  assert.ok(data.recommendations.length > 0);
});
