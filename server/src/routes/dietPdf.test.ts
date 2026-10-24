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
const tokenA = generateToken({ userId: userAId, email: 'diet.pdf.userA@example.com' });

const userBId = new mongoose.Types.ObjectId().toString();
const tokenB = generateToken({ userId: userBId, email: 'diet.pdf.userB@example.com' });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed User A
  await User.create({
    _id: userAId,
    email: 'diet.pdf.userA@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'Diet User A',
    heightCm: 180,
    currentWeightKg: 80,
    targetWeightKg: 75,
  });

  // Seed User B
  await User.create({
    _id: userBId,
    email: 'diet.pdf.userB@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    name: 'Diet User B',
    heightCm: 165,
    currentWeightKg: 60,
    targetWeightKg: 55,
  });

  // Seed Goal for User A
  await Goal.create({
    userId: userAId,
    title: 'Initial Goal',
    dailyCaloriesKcal: 2200,
    proteinGrams: 150,
    carbohydrateGrams: 220,
    fatGrams: 70,
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

test('POST /api/v1/ai/diet-pdf requires authentication (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/diet-pdf`, {
    method: 'POST',
  });
  assert.equal(res.status, 401);
});

test('POST /api/v1/ai/diet-pdf rejects request with missing PDF (400)', async () => {
  const formData = new FormData();

  const res = await fetch(`${baseUrl}/api/v1/ai/diet-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });

  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(data.error.code, 'BAD_REQUEST');
  assert.ok(data.error.message.includes('PDF'));
});

test('POST /api/v1/ai/diet-pdf rejects non-PDF file upload (400)', async () => {
  const textBlob = new Blob(['Not a PDF file content'], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('pdf', textBlob, 'notes.txt');

  const res = await fetch(`${baseUrl}/api/v1/ai/diet-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });

  assert.equal(res.status, 400);
});

let createdInstructionId: string;

test('POST /api/v1/ai/diet-pdf extracts dietary guidelines and stores them in MongoDB', async () => {
  // Generate sample PDF byte stream with keto and high protein instructions
  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<<>>\nstream\nClinical Diet Plan\nTarget Calories: 2150 kcal\nProtein: 165 g\nCarbs: 180 g\nFat: 65 g\nAvoid: Refined sugar, Trans fats\nBreakfast: 8:00 AM\nendstream\nendobj\ntrailer\n<<>>\n%%EOF',
    'utf-8'
  );
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('pdf', blob, 'clinical_hypertrophy_diet_plan.pdf');

  const res = await fetch(`${baseUrl}/api/v1/ai/diet-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });

  assert.equal(res.status, 201);
  const data = (await res.json()) as {
    message: string;
    instruction: {
      _id: string;
      userId: string;
      fileName: string;
      summary: string;
      dietaryRules: string[];
      forbiddenFoods: string[];
      recommendedFoods: string[];
      targetCaloriesKcal?: number;
      targetProteinGrams?: number;
      isActive: boolean;
    };
  };

  assert.ok(data.instruction._id);
  createdInstructionId = data.instruction._id;
  assert.equal(data.instruction.userId, userAId);
  assert.equal(data.instruction.fileName, 'clinical_hypertrophy_diet_plan.pdf');
  assert.ok(data.instruction.dietaryRules.length > 0);
  assert.ok(data.instruction.forbiddenFoods.length > 0);
  assert.equal(data.instruction.isActive, true);

  // Verify persistence in MongoDB
  const inDb = await DietInstruction.findById(createdInstructionId);
  assert.ok(inDb);
  assert.equal(inDb.userId.toString(), userAId);

  // Verify active goal was synced with dietitian targets
  const updatedGoal = await Goal.findOne({ userId: userAId, isActive: true });
  assert.ok(updatedGoal);
  assert.equal(updatedGoal.dailyCaloriesKcal, data.instruction.targetCaloriesKcal);
});

test('GET /api/v1/ai/diet-instructions retrieves user instructions from MongoDB', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/diet-instructions`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    instructions: Array<{ _id: string; fileName: string; dietaryRules: string[] }>;
  };

  assert.equal(data.instructions.length, 1);
  assert.equal(data.instructions[0]?._id, createdInstructionId);
  assert.equal(data.instructions[0]?.fileName, 'clinical_hypertrophy_diet_plan.pdf');
});

test('Strict Tenant Isolation: User B cannot view User A diet instructions', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/diet-instructions`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as { instructions: unknown[] };
  assert.equal(data.instructions.length, 0, 'User B leaked User A diet instructions!');
});

test('Strict Tenant Isolation: User B cannot delete User A diet instruction (404)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/diet-instructions/${createdInstructionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  assert.equal(res.status, 404);
  const inDb = await DietInstruction.findById(createdInstructionId);
  assert.ok(inDb, 'User B was improperly allowed to delete User A instruction!');
});

test('DELETE /api/v1/ai/diet-instructions/:id allows resource owner to remove instruction', async () => {
  const res = await fetch(`${baseUrl}/api/v1/ai/diet-instructions/${createdInstructionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  const inDb = await DietInstruction.findById(createdInstructionId);
  assert.equal(inDb, null);
});
