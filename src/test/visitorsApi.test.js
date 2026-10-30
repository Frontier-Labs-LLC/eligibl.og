import handler from '../../api/visitors';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

function redisReply(results) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(results.map((result) => ({ result }))),
  };
}

const ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ENV };
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ENV;
});

test('answers 503 when no Redis is configured so the pill hides itself', async () => {
  const res = mockRes();
  await handler({ method: 'GET' }, res);
  expect(res.statusCode).toBe(503);
  expect(res.body.configured).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('GET reports the size of each visitor set', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io/';
  process.env.KV_REST_API_TOKEN = 'secret-token';
  global.fetch.mockResolvedValueOnce(redisReply([1234, 900]));

  const res = mockRes();
  await handler({ method: 'GET' }, res);

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true, started: 1234, completed: 900 });
  expect(res.headers['Cache-Control']).toBe('no-store');

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('https://example.upstash.io/pipeline');
  expect(options.headers.Authorization).toBe('Bearer secret-token');
  expect(JSON.parse(options.body)).toEqual([
    ['SCARD', 'eligibl:visitors:started'],
    ['SCARD', 'eligibl:visitors:completed'],
  ]);
});

test('POST adds the visitor to the event set exactly once and returns counts', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'secret-token';
  global.fetch.mockResolvedValueOnce(redisReply([1, 1235, 900]));

  const res = mockRes();
  await handler({ method: 'POST', body: JSON.stringify({ id: 'abcd1234-ef56', event: 'started' }) }, res);

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true, recorded: true, started: 1235, completed: 900 });
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual([
    ['SADD', 'eligibl:visitors:started', 'abcd1234-ef56'],
    ['SCARD', 'eligibl:visitors:started'],
    ['SCARD', 'eligibl:visitors:completed'],
  ]);

  global.fetch.mockResolvedValueOnce(redisReply([0, 1235, 900]));
  const again = mockRes();
  await handler({ method: 'POST', body: { id: 'abcd1234-ef56', event: 'started' } }, again);
  expect(again.body.recorded).toBe(false);
  expect(again.body.started).toBe(1235);
});

test('rejects bad ids, unknown events, and other methods', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io';
  process.env.KV_REST_API_TOKEN = 'secret-token';

  const badId = mockRes();
  await handler({ method: 'POST', body: { id: 'x', event: 'started' } }, badId);
  expect(badId.statusCode).toBe(400);

  const badEvent = mockRes();
  await handler({ method: 'POST', body: { id: 'abcd1234-ef56', event: 'nope' } }, badEvent);
  expect(badEvent.statusCode).toBe(400);

  const del = mockRes();
  await handler({ method: 'DELETE' }, del);
  expect(del.statusCode).toBe(405);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a Redis failure is reported as 502 without leaking details', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io';
  process.env.KV_REST_API_TOKEN = 'secret-token';
  global.fetch.mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

  const res = mockRes();
  await handler({ method: 'GET' }, res);
  expect(res.statusCode).toBe(502);
  expect(res.body.ok).toBe(false);
});
