import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/security.js';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

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

test('Security utils: password hashing and verification', async () => {
  const plain = 'SuperSecret123!';
  const hash = await hashPassword(plain);

  assert.notEqual(hash, plain);
  assert.ok(hash.startsWith('$2'));

  const isValid = await verifyPassword(plain, hash);
  assert.equal(isValid, true);

  const isInvalid = await verifyPassword('WrongPassword', hash);
  assert.equal(isInvalid, false);
});

test('Security utils: JWT token signing and payload verification', () => {
  const payload = { userId: 'user_123', email: 'test@example.com' };
  const token = generateToken(payload, '1h');

  assert.ok(typeof token === 'string');
  assert.equal(token.split('.').length, 3);

  const decoded = verifyToken(token);
  assert.equal(decoded.userId, 'user_123');
  assert.equal(decoded.email, 'test@example.com');
});

test('POST /api/v1/auth/register registers a user and returns token + safe user object', async () => {
  const payload = {
    email: 'user.a@example.com',
    password: 'Password123!',
    name: 'User Alpha',
    heightCm: 180,
    currentWeightKg: 78.5,
    targetWeightKg: 72.0,
    targetWeeks: 10,
    allergies: ['Peanuts'],
    supplements: [
      {
        id: 'supp_1',
        name: 'Whey Protein',
        dosage: '1 scoop',
        timing: 'Post-Workout',
      },
    ],
    primaryGoal: 'fat_loss',
  };

  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = (await res.json()) as {
    token: string;
    user: {
      _id: string;
      email: string;
      name: string;
      passwordHash?: string;
      allergies: string[];
      supplements: Array<{ name: string }>;
    };
  };

  assert.ok(typeof data.token === 'string');
  assert.equal(data.user.email, 'user.a@example.com');
  assert.equal(data.user.name, 'User Alpha');
  assert.equal(data.user.allergies[0], 'Peanuts');
  assert.equal(data.user.supplements[0].name, 'Whey Protein');
  // Crucial security invariant: passwordHash must NEVER be returned in response payloads
  assert.equal(data.user.passwordHash, undefined);
});

test('POST /api/v1/auth/register rejects duplicate email with 409 Conflict', async () => {
  const payload = {
    email: 'user.a@example.com', // Already registered in previous test
    password: 'Password123!',
    name: 'Duplicate Alpha',
    heightCm: 175,
    currentWeightKg: 70,
    targetWeightKg: 68,
  };

  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 409);
  const data = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(data.error.code, 'CONFLICT');
});

test('POST /api/v1/auth/register validates schema and rejects short password with 400', async () => {
  const payload = {
    email: 'invalid@example.com',
    password: 'short', // Under 8 characters
    name: 'Invalid User',
    heightCm: 175,
    currentWeightKg: 70,
    targetWeightKg: 68,
  };

  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: { code: string; message: string; details: Array<{ path: string }> } };
  assert.equal(data.error.code, 'VALIDATION_ERROR');
  assert.ok(data.error.details.some((d) => d.path === 'password'));
});

test('POST /api/v1/auth/login authenticates registered user and rejects bad credentials', async () => {
  // 1. Success login
  const validRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user.a@example.com',
      password: 'Password123!',
    }),
  });

  assert.equal(validRes.status, 200);
  const validData = (await validRes.json()) as { token: string; user: { email: string } };
  assert.ok(typeof validData.token === 'string');
  assert.equal(validData.user.email, 'user.a@example.com');

  // 2. Bad password
  const badRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user.a@example.com',
      password: 'IncorrectPassword',
    }),
  });

  assert.equal(badRes.status, 401);
  const badData = (await badRes.json()) as { error: { code: string } };
  assert.equal(badData.error.code, 'UNAUTHORIZED');
});

test('GET /api/v1/auth/me requires valid Bearer token', async () => {
  // 1. Missing token
  const noTokenRes = await fetch(`${baseUrl}/api/v1/auth/me`);
  assert.equal(noTokenRes.status, 401);

  // 2. Login to get token
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user.a@example.com',
      password: 'Password123!',
    }),
  });
  const { token } = (await loginRes.json()) as { token: string };

  // 3. Valid Bearer token
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = (await meRes.json()) as { user: { email: string; name: string } };
  assert.equal(meData.user.email, 'user.a@example.com');
  assert.equal(meData.user.name, 'User Alpha');
});

test('Cross-tenant user isolation: User A token cannot impersonate or read User B', async () => {
  // Register User B
  const userBPayload = {
    email: 'user.b@example.com',
    password: 'Password456!',
    name: 'User Beta',
    heightCm: 165,
    currentWeightKg: 60,
    targetWeightKg: 58,
  };

  const regB = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userBPayload),
  });
  const dataB = (await regB.json()) as { token: string; user: { _id: string; email: string } };

  // User A logs in
  const loginA = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user.a@example.com',
      password: 'Password123!',
    }),
  });
  const dataA = (await loginA.json()) as { token: string; user: { _id: string; email: string } };

  // Verify User A's token strictly resolves to User A
  const meA = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
  });
  const meAData = (await meA.json()) as { user: { _id: string; email: string } };
  assert.equal(meAData.user.email, 'user.a@example.com');
  assert.notEqual(meAData.user._id, dataB.user._id);

  // Verify User B's token strictly resolves to User B
  const meB = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${dataB.token}` },
  });
  const meBData = (await meB.json()) as { user: { _id: string; email: string } };
  assert.equal(meBData.user.email, 'user.b@example.com');
  assert.equal(meBData.user._id, dataB.user._id);
});

test('PUT /api/v1/auth/profile requires authentication (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetWeightKg: 68 }),
  });
  assert.equal(res.status, 401);
});

test('PUT /api/v1/auth/profile updates user and synchronizes active Goal in MongoDB', async () => {
  // Login User A
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user.a@example.com',
      password: 'Password123!',
    }),
  });
  const { token } = (await loginRes.json()) as { token: string };

  // Update profile with new target weight (66kg), weeks (12), and primary goal ('muscle_gain')
  const updateRes = await fetch(`${baseUrl}/api/v1/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetWeightKg: 66,
      targetWeeks: 12,
      primaryGoal: 'muscle_gain',
    }),
  });

  assert.equal(updateRes.status, 200);
  const data = (await updateRes.json()) as {
    user: { targetWeightKg: number; targetWeeks: number; primaryGoal: string };
    goal: { targetWeight: number; targetWeeks: number; title: string };
  };

  // 1. Verify User collection updated in MongoDB
  assert.equal(data.user.targetWeightKg, 66);
  assert.equal(data.user.targetWeeks, 12);
  assert.equal(data.user.primaryGoal, 'muscle_gain');

  // 2. Verify Goal collection synchronized in MongoDB
  assert.equal(data.goal.targetWeight, 66);
  assert.equal(data.goal.targetWeeks, 12);
  assert.ok(data.goal.title.includes('Muscle Gain'));

  // 3. Confirm persistence by fetching GET /api/v1/goals
  const getGoalRes = await fetch(`${baseUrl}/api/v1/goals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(getGoalRes.status, 200);
  const activeGoalData = (await getGoalRes.json()) as { goal: { targetWeight: number; targetWeeks: number } };
  assert.equal(activeGoalData.goal.targetWeight, 66);
  assert.equal(activeGoalData.goal.targetWeeks, 12);
});
