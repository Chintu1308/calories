import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { Meal } from '../models/Meal.js';
import { generateToken } from '../utils/security.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

const userAId = new mongoose.Types.ObjectId().toString();
const userBId = new mongoose.Types.ObjectId().toString();

const tokenA = generateToken({ userId: userAId, email: 'user.pagination.a@example.com' });
const tokenB = generateToken({ userId: userBId, email: 'user.pagination.b@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed 15 sequential meals for User A
  const baseTime = new Date('2026-10-20T08:00:00.000Z').getTime();
  const seedDocs = [];

  for (let i = 1; i <= 15; i++) {
    const eatenAt = new Date(baseTime + i * 3600 * 1000); // 1 hour apart
    const mealType = i % 3 === 0 ? 'Dinner' : i % 2 === 0 ? 'Lunch' : 'Breakfast';
    seedDocs.push({
      userId: userAId,
      foodName: `Meal Item ${i}`,
      mealType,
      eatenAt,
      quantity: { amount: 100, unit: 'g' },
      nutrition: {
        caloriesKcal: 200 + i * 10,
        proteinG: 15,
        carbsG: 25,
        fatG: 8,
      },
      source: 'manual',
    });
  }

  await Meal.insertMany(seedDocs);
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await mongoose.disconnect();
  await mongod.stop();
});

test('Pagination: page=1&limit=5 returns first 5 items in descending chronological order', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: Array<{ foodName: string }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };

  assert.equal(data.meals.length, 5);
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.limit, 5);
  assert.equal(data.pagination.total, 15);
  assert.equal(data.pagination.totalPages, 3);

  // Newest items first (descending eatenAt)
  assert.equal(data.meals[0]?.foodName, 'Meal Item 15');
  assert.equal(data.meals[4]?.foodName, 'Meal Item 11');
});

test('Pagination: page=2&limit=5 returns disjoint second page with stable sorting', async () => {
  const resPage1 = await fetch(`${baseUrl}/api/v1/meals?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const data1 = (await resPage1.json()) as { meals: Array<{ _id: string }> };

  const resPage2 = await fetch(`${baseUrl}/api/v1/meals?page=2&limit=5`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const data2 = (await resPage2.json()) as { meals: Array<{ _id: string; foodName: string }> };

  assert.equal(data2.meals.length, 5);
  assert.equal(data2.meals[0]?.foodName, 'Meal Item 10');
  assert.equal(data2.meals[4]?.foodName, 'Meal Item 6');

  // Verify zero ID overlap between page 1 and page 2
  const ids1 = new Set(data1.meals.map((m) => m._id));
  for (const m of data2.meals) {
    assert.equal(ids1.has(m._id), false, `ID ${m._id} appeared on both page 1 and page 2`);
  }
});

test('Pagination: enforces max page size limit (rejects limit > 100 with 400)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals?page=1&limit=150`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('Category filtering: mealType=Dinner returns only Dinner items with accurate total count', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals?mealType=Dinner`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: Array<{ mealType: string }>;
    pagination: { total: number };
  };

  assert.ok(data.meals.length > 0);
  assert.equal(data.pagination.total, 5); // 3, 6, 9, 12, 15 are Dinner
  for (const m of data.meals) {
    assert.equal(m.mealType, 'Dinner');
  }
});

test('Date filtering: filters meals within UTC range', async () => {
  // Between hour 5 and hour 10 (inclusive)
  const startDate = '2026-10-20T13:00:00.000Z'; // Item 5
  const endDate = '2026-10-20T17:00:00.000Z';   // Item 9

  const res = await fetch(
    `${baseUrl}/api/v1/meals?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: Array<{ foodName: string; eatenAt: string }>;
    pagination: { total: number };
  };

  assert.equal(data.pagination.total, 5); // Items 5, 6, 7, 8, 9
  assert.equal(data.meals[0]?.foodName, 'Meal Item 9');
  assert.equal(data.meals[4]?.foodName, 'Meal Item 5');
});

test('Combined filtering: category + date range filters work together', async () => {
  const startDate = '2026-10-20T13:00:00.000Z';
  const endDate = '2026-10-20T17:00:00.000Z';

  const res = await fetch(
    `${baseUrl}/api/v1/meals?mealType=Dinner&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: Array<{ foodName: string; mealType: string }>;
    pagination: { total: number };
  };

  // Only Item 6 and Item 9 are Dinner within this window
  assert.equal(data.pagination.total, 2);
  assert.equal(data.meals[0]?.foodName, 'Meal Item 9');
  assert.equal(data.meals[1]?.foodName, 'Meal Item 6');
});

test('Multi-tenant isolation during filtered search: User B sees 0 results', async () => {
  const res = await fetch(`${baseUrl}/api/v1/meals?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    meals: unknown[];
    pagination: { total: number };
  };

  assert.equal(data.meals.length, 0);
  assert.equal(data.pagination.total, 0);
});
