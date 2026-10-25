import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { generateToken } from '../utils/security.js';
import { User } from '../models/User.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

const userAId = new mongoose.Types.ObjectId().toString();
const userBId = new mongoose.Types.ObjectId().toString();

const tokenA = generateToken({ userId: userAId, email: 'user.a@example.com' });
const tokenB = generateToken({ userId: userBId, email: 'user.b@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await mongoose.disconnect();
  await mongod.stop();
});

test('GET /api/v1/goals requires valid Bearer authentication', async () => {
  // Test without authorization header
  const resNoAuth = await fetch(`${baseUrl}/api/v1/goals`);
  assert.equal(resNoAuth.status, 401);

  const bodyNoAuth = (await resNoAuth.json()) as { error: { code: string } };
  assert.equal(bodyNoAuth.error.code, 'UNAUTHORIZED');

  // Test with invalid token
  const resBadAuth = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: 'Bearer invalid.jwt.token' },
  });
  assert.equal(resBadAuth.status, 401);
});

test('GET /api/v1/goals returns 404 when no goal has been configured yet', async () => {
  const res = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(res.status, 404);

  const body = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.ok(body.error.message.includes('nutrition goal'));
});

test('PUT /api/v1/goals validates payload and rejects invalid inputs with 400', async () => {
  // Too low calories (< 500)
  const resLowCal = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dailyCaloriesKcal: 400,
      proteinGrams: 100,
      carbohydrateGrams: 150,
      fatGrams: 50,
    }),
  });
  assert.equal(resLowCal.status, 400);

  // Negative protein (< 0)
  const resNegProtein = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dailyCaloriesKcal: 2000,
      proteinGrams: -10,
      carbohydrateGrams: 150,
      fatGrams: 50,
    }),
  });
  assert.equal(resNegProtein.status, 400);

  // Excessive calories (> 10,000)
  const resHighCal = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dailyCaloriesKcal: 15000,
      proteinGrams: 120,
      carbohydrateGrams: 200,
      fatGrams: 60,
    }),
  });
  assert.equal(resHighCal.status, 400);
});

test('PUT /api/v1/goals creates initial nutrition goal for User A', async () => {
  const goalPayload = {
    title: 'Fat Loss Phase 1',
    dailyCaloriesKcal: 2150,
    proteinGrams: 160,
    carbohydrateGrams: 210,
    fatGrams: 65,
    targetWeight: 72.5,
    weightUnit: 'kg',
    targetWeeks: 8,
  };

  const res = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goalPayload),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    goal: {
      _id: string;
      userId: string;
      title: string;
      dailyCaloriesKcal: number;
      proteinGrams: number;
      carbohydrateGrams: number;
      fatGrams: number;
      targetWeight: number;
      weightUnit: string;
      isActive: boolean;
    };
  };

  assert.ok(data.goal._id);
  assert.equal(data.goal.userId, userAId);
  assert.equal(data.goal.title, 'Fat Loss Phase 1');
  assert.equal(data.goal.dailyCaloriesKcal, 2150);
  assert.equal(data.goal.proteinGrams, 160);
  assert.equal(data.goal.carbohydrateGrams, 210);
  assert.equal(data.goal.fatGrams, 65);
  assert.equal(data.goal.targetWeight, 72.5);
  assert.equal(data.goal.isActive, true);
});

test('GET /api/v1/goals retrieves persisted goal for User A', async () => {
  const res = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    goal: {
      userId: string;
      dailyCaloriesKcal: number;
      proteinGrams: number;
    };
  };

  assert.equal(data.goal.userId, userAId);
  assert.equal(data.goal.dailyCaloriesKcal, 2150);
  assert.equal(data.goal.proteinGrams, 160);
});

test('PUT /api/v1/goals updates User A goal in place (upsert idempotency)', async () => {
  const updatedPayload = {
    title: 'Strength Recomposition',
    dailyCaloriesKcal: 2350,
    proteinGrams: 175,
    carbohydrateGrams: 230,
    fatGrams: 70,
    targetWeight: 74.0,
    weightUnit: 'kg',
    targetWeeks: 12,
  };

  const res = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedPayload),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    goal: {
      dailyCaloriesKcal: number;
      proteinGrams: number;
      title: string;
    };
  };

  assert.equal(data.goal.dailyCaloriesKcal, 2350);
  assert.equal(data.goal.proteinGrams, 175);
  assert.equal(data.goal.title, 'Strength Recomposition');
});

test('Strict Tenant Isolation: User B cannot inspect or overwrite User A goal', async () => {
  // User B queries goals: should return 404 because User B hasn't set any goal yet
  const resB = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resB.status, 404);

  // User B sets their distinct goal
  const resBSet = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Marathon Fueling',
      dailyCaloriesKcal: 3200,
      proteinGrams: 140,
      carbohydrateGrams: 450,
      fatGrams: 80,
      targetWeight: 65.0,
    }),
  });
  assert.equal(resBSet.status, 200);

  // User A queries their goal: remains 2350 kcal
  const resACheck = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(resACheck.status, 200);
  const dataA = (await resACheck.json()) as { goal: { dailyCaloriesKcal: number; title: string } };
  assert.equal(dataA.goal.dailyCaloriesKcal, 2350);
  assert.equal(dataA.goal.title, 'Strength Recomposition');

  // User B queries their goal: gets 3200 kcal
  const resBCheck = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resBCheck.status, 200);
  const dataB = (await resBCheck.json()) as { goal: { dailyCaloriesKcal: number; title: string } };
  assert.equal(dataB.goal.dailyCaloriesKcal, 3200);
  assert.equal(dataB.goal.title, 'Marathon Fueling');
});

test('POST /api/v1/goals archives prior goal and GET /api/v1/goals/history returns chronological list', async () => {
  // User A posts a new goal
  const resPost = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Peak Cut Phase 2',
      dailyCaloriesKcal: 1900,
      proteinGrams: 180,
      carbohydrateGrams: 160,
      fatGrams: 55,
      targetWeight: 70.0,
    }),
  });
  assert.equal(resPost.status, 201);

  // Active goal is now Peak Cut Phase 2
  const resActive = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(resActive.status, 200);
  const dataActive = (await resActive.json()) as { goal: { title: string; dailyCaloriesKcal: number } };
  assert.equal(dataActive.goal.title, 'Peak Cut Phase 2');
  assert.equal(dataActive.goal.dailyCaloriesKcal, 1900);

  // History includes previous goals
  const resHistory = await fetch(`${baseUrl}/api/v1/goals/history`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(resHistory.status, 200);
  const dataHistory = (await resHistory.json()) as {
    goals: Array<{ title: string; isActive: boolean }>;
    total: number;
  };
  assert.ok(dataHistory.total >= 2);
  assert.equal(dataHistory.goals[0]?.title, 'Peak Cut Phase 2');
  assert.equal(dataHistory.goals[0]?.isActive, true);
  assert.equal(dataHistory.goals[1]?.isActive, false);
});

test('PUT /api/v1/goals synchronizes targetWeightKg and targetWeeks to User profile in MongoDB', async () => {
  await User.create({
    _id: userAId,
    email: 'user.a@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'User A',
    heightCm: 175,
    currentWeightKg: 75,
    targetWeightKg: 70,
    targetWeeks: 8,
    primaryGoal: 'fat_loss',
  });

  const res = await fetch(`${baseUrl}/api/v1/goals`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Target Sync Test',
      dailyCaloriesKcal: 2100,
      proteinGrams: 165,
      carbohydrateGrams: 200,
      fatGrams: 60,
      targetWeight: 67.5,
      targetWeeks: 10,
    }),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    goal: { targetWeight: number; targetWeeks: number };
    user?: { targetWeightKg: number; targetWeeks: number };
  };

  assert.equal(data.goal.targetWeight, 67.5);
  assert.equal(data.goal.targetWeeks, 10);
  assert.equal(data.user?.targetWeightKg, 67.5);
  assert.equal(data.user?.targetWeeks, 10);

  // Verify GET /auth/me reflects the updated targetWeightKg
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(meRes.status, 200);
  const meData = (await meRes.json()) as { user: { targetWeightKg: number; targetWeeks: number } };
  assert.equal(meData.user.targetWeightKg, 67.5);
  assert.equal(meData.user.targetWeeks, 10);
});
