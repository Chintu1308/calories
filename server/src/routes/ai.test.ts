import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Meal } from '../models/Meal.js';
import { generateToken } from '../utils/security.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

const userAId = new mongoose.Types.ObjectId().toString();
const tokenA = generateToken({ userId: userAId, email: 'user.ai.a@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed User A with fish allergy
  await User.create({
    _id: userAId,
    email: 'user.ai.a@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'AI Test User',
    heightCm: 175,
    currentWeightKg: 72,
    targetWeightKg: 68,
    allergies: ['Fish'],
  });

  // Seed User A active goal
  await Goal.create({
    userId: userAId,
    title: 'Daily Cut',
    dailyCaloriesKcal: 2000,
    proteinGrams: 160,
    carbohydrateGrams: 180,
    fatGrams: 60,
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

test('POST /api/v1/ai/extract requires valid Bearer token (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/extract`, {
    method: 'POST',
  });
  assert.equal(res.status, 401);
});

test('POST /api/v1/ai/extract rejects request with missing image attachment (400)', async () => {
  const formData = new FormData();

  const res = await fetch(`${baseUrl}/api/v1/ai/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });

  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(data.error.code, 'BAD_REQUEST');
  assert.ok(data.error.message.includes('image file'));
});

test('POST /api/v1/ai/extract extracts uncommitted nutritional proposal from meal photo', async () => {
  const initialMealCount = await Meal.countDocuments({ userId: userAId });

  // Create mock JPEG image binary blob
  const mockImageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const blob = new Blob([mockImageBytes], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('image', blob, 'mediterranean_salmon_bowl.jpg');

  const res = await fetch(`${baseUrl}/api/v1/ai/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    proposal: {
      foodName: string;
      mealType: string;
      nutrition: { caloriesKcal: number; proteinG: number };
      ingredients: string[];
      confidence: number;
    };
    contextualFit: {
      wouldExceedCalories: boolean;
      fittingEvaluation: string;
      allergenAlerts: string[];
      isGoodChoiceToday: boolean;
    };
    uncommittedNotice: string;
  };

  // 1. Verify proposal details
  assert.ok(data.proposal.foodName);
  assert.ok(data.proposal.nutrition.caloriesKcal > 0);
  assert.ok(data.proposal.nutrition.proteinG > 0);
  assert.ok(data.proposal.ingredients.length > 0);
  assert.ok(data.proposal.confidence >= 0.8);

  // 2. Verify contextual fit and allergen screening against user profile (User A has 'Fish' allergy)
  assert.ok(data.contextualFit.allergenAlerts.length > 0);
  assert.ok(data.contextualFit.allergenAlerts[0]?.includes('Fish'));
  assert.equal(data.contextualFit.isGoodChoiceToday, false);

  // 3. Verify uncommitted notice
  assert.ok(data.uncommittedNotice.includes('uncommitted AI proposal'));

  // 4. Critical Safety Invariant: AI extraction must NEVER persist to MongoDB automatically
  const finalMealCount = await Meal.countDocuments({ userId: userAId });
  assert.equal(finalMealCount, initialMealCount, 'AI extraction improperly saved a meal to MongoDB!');
});

test('POST /api/v1/ai/chat requires valid Bearer token (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What should I eat for dinner?' }),
  });
  assert.equal(res.status, 401);
});

test('POST /api/v1/ai/chat rejects request with empty message (400)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: '   ' }),
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(data.error.code, 'BAD_REQUEST');
  assert.ok(data.error.message.includes('cannot be empty'));
});

test('POST /api/v1/ai/chat returns intelligent contextual reply with deficit snapshot and prompt suggestions (200)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'What should I eat for dinner to reach my protein goal?',
    }),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    reply: string;
    suggestedPrompts: string[];
    contextSummary: {
      targetCalories: number;
      remainingCalories: number;
      targetProtein: number;
      remainingProtein: number;
      allergies: string[];
    };
  };

  assert.ok(data.reply.length > 20);
  assert.ok(Array.isArray(data.suggestedPrompts));
  assert.ok(data.suggestedPrompts.length > 0);
  assert.equal(data.contextSummary.targetCalories, 2000);
  assert.equal(data.contextSummary.targetProtein, 160);
  assert.deepEqual(data.contextSummary.allergies, ['Fish']);
});

test('POST /api/v1/ai/chat enforces strict tenant isolation between users', async () => {
  // Create User B with completely distinct goals and allergies
  const userBId = new mongoose.Types.ObjectId().toString();
  const tokenB = generateToken({ userId: userBId, email: 'user.ai.b@example.com' });

  await User.create({
    _id: userBId,
    email: 'user.ai.b@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'User B Nutritionist',
    heightCm: 188,
    currentWeightKg: 95,
    targetWeightKg: 90,
    allergies: ['Peanuts', 'Gluten'],
  });

  await Goal.create({
    userId: userBId,
    title: 'Muscle Bulk',
    dailyCaloriesKcal: 3200,
    proteinGrams: 220,
    carbohydrateGrams: 350,
    fatGrams: 85,
    isActive: true,
  });

  const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Show my daily macros' }),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    reply: string;
    contextSummary: {
      targetCalories: number;
      targetProtein: number;
      allergies: string[];
    };
  };

  // Assert User B receives User B's metrics with zero User A leakage
  assert.equal(data.contextSummary.targetCalories, 3200);
  assert.equal(data.contextSummary.targetProtein, 220);
  assert.deepEqual(data.contextSummary.allergies, ['Peanuts', 'Gluten']);
});
