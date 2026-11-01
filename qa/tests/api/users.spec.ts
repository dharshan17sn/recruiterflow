import { test, expect } from '@playwright/test';

test.use({ baseURL: 'https://reqres.in' });

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function getApiKey(): string {
  const key = process.env.REQRES_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error('Missing REQRES_API_KEY environment variable. Please set REQRES_API_KEY in qa/.env.');
  }
  return key;
}

test.describe('ReqRes API Users', () => {
  test('GET /api/users/2 returns 200 and non-empty email', async ({ request }) => {
    const apiKey = getApiKey();
    const response = await request.get('/api/users/2', {
      headers: {
        'x-api-key': apiKey,
      },
    });

    expect(response.status()).toBe(200);

    const body: unknown = await response.json();
    expect(isRecord(body)).toBe(true);

    if (!isRecord(body) || !isRecord(body['data'])) {
      throw new Error('Invalid response body structure: missing data object');
    }

    const email = body['data']['email'];
    expect(email).toBeDefined();
    expect(typeof email).toBe('string');
    expect(email).not.toBe('');
  });

  test('POST /api/users creates user and returns 201 with matching name', async ({ request }) => {
    const apiKey = getApiKey();
    const payload = { name: 'morpheus', job: 'leader' };
    const response = await request.post('/api/users', {
      headers: {
        'x-api-key': apiKey,
      },
      data: payload,
    });

    expect(response.status()).toBe(201);

    const body: unknown = await response.json();
    expect(isRecord(body)).toBe(true);

    if (!isRecord(body)) {
      throw new Error('Invalid response body structure');
    }

    expect(body['name']).toBe('morpheus');
  });

  test('GET /api/users/23 returns 404 for non-existent user', async ({ request }) => {
    const apiKey = getApiKey();
    const response = await request.get('/api/users/23', {
      headers: {
        'x-api-key': apiKey,
      },
    });

    expect(response.status()).toBe(404);
  });
});
