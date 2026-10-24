import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Request, type Response } from 'express';
import { app } from './app.js';
import { AppError } from './errors/AppError.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getConnectionStatus, disconnectDatabase } from './config/db.js';

test('GET /api/v1/health returns 200 OK with database connection status', async () => {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      status: string;
      service: string;
      version: string;
      database: {
        status: string;
        readyState: number;
      };
      timestamp: string;
    };

    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'calories-server');
    assert.equal(body.version, '0.1.0');
    assert.ok(typeof body.database === 'object');
    assert.ok(typeof body.database.status === 'string');
    assert.ok(typeof body.database.readyState === 'number');
    assert.ok(typeof body.timestamp === 'string');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('GET /unknown-route returns 404 with standard error payload', async () => {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/non-existent-endpoint`);
    assert.equal(response.status, 404);

    const body = (await response.json()) as {
      error: {
        code: string;
        message: string;
      };
    };

    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('/api/v1/non-existent-endpoint'));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('Central errorHandler formats AppError into standard JSON envelope', async () => {
  // Mount an isolated test Express instance with errorHandler
  const testApp = express();
  testApp.use(express.json());
  testApp.get('/api/v1/test-error', (_req: Request, _res: Response) => {
    throw AppError.badRequest('Invalid portion size format', { field: 'portionAmount' });
  });
  testApp.use(errorHandler);

  const server: Server = await new Promise((resolve) => {
    const s = testApp.listen(0, () => resolve(s));
  });

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/test-error`);
    assert.equal(response.status, 400);

    const body = (await response.json()) as {
      error: {
        code: string;
        message: string;
        details?: { field: string };
      };
    };

    assert.equal(body.error.code, 'BAD_REQUEST');
    assert.equal(body.error.message, 'Invalid portion size format');
    assert.deepEqual(body.error.details, { field: 'portionAmount' });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('Database connection status returns valid readyState', async () => {
  const status = getConnectionStatus();
  assert.ok(typeof status.readyState === 'number');
  assert.ok(['connected', 'connecting', 'disconnected', 'error'].includes(status.status));

  // Verify graceful disconnect cleanly completes without error
  await disconnectDatabase();
});
