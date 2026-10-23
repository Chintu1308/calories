import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from './app.js';

test('GET /api/v1/health returns 200 OK with expected JSON structure', async () => {
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
      timestamp: string;
    };

    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'calories-server');
    assert.equal(body.version, '0.1.0');
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
