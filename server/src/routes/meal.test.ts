import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { generateToken } from '../utils/security.js';

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

test('GET /api/v1/meals requires valid Bearer authentication', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals`);
  assert.equal(res.status, 401);

  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('POST /api/v1/meals validates payload bounds and rejects malformed entries with 400', async () => {
  // Empty food name
  const resEmptyName = await fetch(`${baseUrl}/api/v1/meals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      foodName: '',
      mealType: 'Breakfast',
      quantity: { amount: 1, unit: 'portion' },
      nutrition: { caloriesKcal: 350, proteinG: 20, carbsG: 40, fatG: 10 },
    }),
  });
  assert.equal(resEmptyName.status, 400);

  // Negative protein
  const resNegProtein = await fetch(`${baseUrl}/api/v1/meals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      foodName: 'Rolled Oats',
      mealType: 'Breakfast',
      quantity: { amount: 100, unit: 'g' },
      nutrition: { caloriesKcal: 389, proteinG: -10, carbsG: 66, fatG: 7 },
    }),
  });
  assert.equal(resNegProtein.status, 400);
});

let createdMealId: string;

test('POST /api/v1/meals creates meal entry for User A', async () => {
  const payload = {
    foodName: 'Greek Yogurt Bowl with Berries',
    mealType: 'Breakfast',
    quantity: { amount: 250, unit: 'g' },
    nutrition: {
      caloriesKcal: 280,
      proteinG: 23,
      carbsG: 28,
      fatG: 5,
    },
    source: 'manual',
    notes: 'Topped with organic chia seeds and wild blueberries',
  };

  const res = await fetch(`${baseUrl}/api/v1/meals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = (await res.json()) as {
    meal: {
      _id: string;
      userId: string;
      foodName: string;
      mealType: string;
      nutrition: { caloriesKcal: number; proteinG: number };
    };
  };

  assert.ok(data.meal._id);
  createdMealId = data.meal._id;
  assert.equal(data.meal.userId, userAId);
  assert.equal(data.meal.foodName, 'Greek Yogurt Bowl with Berries');
  assert.equal(data.meal.mealType, 'Breakfast');
  assert.equal(data.meal.nutrition.caloriesKcal, 280);
});

test('GET /api/v1/meals lists meals for User A with pagination', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: Array<{ _id: string; foodName: string }>;
    pagination: { total: number; page: number; limit: number };
  };

  assert.equal(data.meals.length, 1);
  assert.equal(data.meals[0]?._id, createdMealId);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.page, 1);
});

test('GET /api/v1/meals/:id retrieves a single meal by ID for resource owner', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as { meal: { _id: string; foodName: string } };
  assert.equal(data.meal._id, createdMealId);
  assert.equal(data.meal.foodName, 'Greek Yogurt Bowl with Berries');
});

test('PATCH /api/v1/meals/:id updates meal details for resource owner', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      foodName: 'Greek Yogurt Bowl with Honey & Walnuts',
      nutrition: { caloriesKcal: 340, proteinG: 24, carbsG: 32, fatG: 9 },
    }),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meal: {
      foodName: string;
      nutrition: { caloriesKcal: number };
    };
  };

  assert.equal(data.meal.foodName, 'Greek Yogurt Bowl with Honey & Walnuts');
  assert.equal(data.meal.nutrition.caloriesKcal, 340);
});

test('Strict Tenant Isolation: User B cannot access, modify, or delete User A meal', async () => {
  // User B tries to GET User A's meal
  const resGet = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resGet.status, 404);

  // User B tries to PATCH User A's meal
  const resPatch = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ foodName: 'Hacked Meal Title' }),
  });
  assert.equal(resPatch.status, 404);

  // User B tries to DELETE User A's meal
  const resDelete = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resDelete.status, 404);

  // User B list meals is empty
  const resListB = await fetch(`${baseUrl}/api/v1/meals`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(resListB.status, 200);
  const dataB = (await resListB.json()) as { meals: unknown[]; pagination: { total: number } };
  assert.equal(dataB.meals.length, 0);
  assert.equal(dataB.pagination.total, 0);
});

test('DELETE /api/v1/meals/:id allows owner to delete meal entry', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as { message: string; id: string };
  assert.equal(data.id, createdMealId);

  // Subsequent GET returns 404
  const resCheck = await fetch(`${baseUrl}/api/v1/meals/${createdMealId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(resCheck.status, 404);
});
