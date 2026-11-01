import { test, expect, type APIResponse } from '@playwright/test';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function getApiKey(): string {
  const rawKey = process.env.REQRES_API_KEY;
  if (!rawKey) {
    throw new Error('Missing REQRES_API_KEY environment variable. Please set REQRES_API_KEY in qa/.env.');
  }
  const trimmed = rawKey.replace(/^['"]|['"]$/g, '').trim();
  if (trimmed === '') {
    throw new Error('REQRES_API_KEY is empty after trimming quotes, whitespace, and CRLF. Please provide a valid key in qa/.env.');
  }
  return trimmed;
}

async function sendRequestWithRetry(
  requestFn: () => Promise<APIResponse>
): Promise<APIResponse> {
  let response = await requestFn();
  if (response.status() === 429) {
    const retryAfterHeader = response.headers()['retry-after'];
    const retrySeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 1;
    const delayMs = (!Number.isNaN(retrySeconds) && retrySeconds > 0 ? retrySeconds : 1) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    response = await requestFn();
  }
  return response;
}

test.describe('ReqRes API Users', () => {
  test.beforeEach(() => {
    getApiKey();
  });

  test('GET /api/users/2 returns 200 and non-empty email', async ({ request }) => {
    const response = await sendRequestWithRetry(() => request.get('/api/users/2'));
    const status = response.status();
    const bodyText = await response.text();

    expect(
      status,
      `Expected status 200 but received ${status}.\nResponse Body:\n${bodyText}`
    ).toBe(200);

    const body: unknown = JSON.parse(bodyText);
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
    const payload = { name: 'morpheus', job: 'leader' };
    const response = await sendRequestWithRetry(() =>
      request.post('/api/users', { data: payload })
    );
    const status = response.status();
    const bodyText = await response.text();

    expect(
      status,
      `Expected status 201 but received ${status}.\nResponse Body:\n${bodyText}`
    ).toBe(201);

    const body: unknown = JSON.parse(bodyText);
    expect(isRecord(body)).toBe(true);

    if (!isRecord(body)) {
      throw new Error('Invalid response body structure');
    }

    expect(body['name']).toBe('morpheus');
  });

  test('GET /api/users/23 returns 404 for non-existent user', async ({ request }) => {
    const response = await sendRequestWithRetry(() => request.get('/api/users/23'));
    const status = response.status();
    const bodyText = await response.text();

    expect(
      status,
      `Expected status 404 but received ${status}.\nResponse Body:\n${bodyText}`
    ).toBe(404);
  });
});
