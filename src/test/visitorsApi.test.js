import handler from '../../api/visitors';
import { signSession } from '../../server/adminSession';

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
  delete process.env.ADMIN_SESSION_SECRET;
  global.fetch = jest.fn();
});

function asAdmin(req) {
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
  const token = signSession('owner@eligibl.org', process.env.ADMIN_SESSION_SECRET);
  return {
    ...req,
    headers: { ...(req.headers || {}), cookie: `eligibl_admin=${token}` },
  };
}

afterEach(() => {
  process.env = ENV;
});

test('GET refuses the counts when nobody is signed in', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io/';
  process.env.KV_REST_API_TOKEN = 'secret-token';
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  expect(res.statusCode).toBe(401);
  expect(res.body.ok).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a signed-in admin gets 503 when no Redis is configured', async () => {
  const res = mockRes();
  await handler(asAdmin({ method: 'GET' }), res);
  expect(res.statusCode).toBe(503);
  expect(res.body.configured).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('GET reports page hits, unique people, clicks, and the help survey', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io/';
  process.env.KV_REST_API_TOKEN = 'secret-token';
  global.fetch.mockImplementationOnce(async (_url, options) => {
    const commands = JSON.parse(options.body);
    return redisReply(commands.map((command) => {
      const key = command[1];
      if (command[0] === 'SCARD' && key.endsWith(':started')) return 1234;
      if (command[0] === 'SCARD' && key.endsWith(':completed')) return 900;
      if (command[0] === 'SCARD' && key.endsWith(':step-1')) return 140;
      if (command[0] === 'GET' && key.endsWith('hits:step-1')) return '150';
      if (command[0] === 'GET' && key.endsWith('hits:results')) return '10';
      if (command[0] === 'HGETALL' && key.endsWith('clicks:step-1')) return { 'see-my-programs': '12' };
      if (command[0] === 'HGETALL' && key.endsWith('heat:step-1')) return { '2:3': '8' };
      if (command[0] === 'SCARD' && key.endsWith(':helped-yes')) return 6;
      if (command[0] === 'HGETALL') return {};
      return 0;
    }));
  });

  const res = mockRes();
  await handler(asAdmin({ method: 'GET' }), res);

  expect(res.statusCode).toBe(200);
  expect(res.body.started).toBe(1234);
  expect(res.body.completed).toBe(900);
  expect(res.body.pages['step-1']).toEqual({ hits: 150, uniques: 140 });
  expect(res.body.pages.results).toEqual({ hits: 10, uniques: 0 });
  expect(res.body.clicks['step-1']).toEqual({ 'see-my-programs': 12 });
  expect(res.body.heat['step-1']).toEqual({ '2:3': 8 });
  expect(res.body.survey['helped-yes']).toBe(6);
  expect(res.headers['Cache-Control']).toBe('no-store');

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('https://example.upstash.io/pipeline');
  expect(options.headers.Authorization).toBe('Bearer secret-token');
  const commands = JSON.parse(options.body);
  expect(commands).toEqual(expect.arrayContaining([
    ['SCARD', 'eligibl:visitors:started'],
    ['GET', 'eligibl:visitors:hits:step-1'],
    ['HGETALL', 'eligibl:visitors:clicks:results'],
    ['HGETALL', 'eligibl:visitors:heat:results'],
  ]));
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

test('POST counts every page hit and buckets a click into a tenth of the screen', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io';
  process.env.KV_REST_API_TOKEN = 'secret-token';
  global.fetch.mockResolvedValueOnce(redisReply([151, 1]));

  const page = mockRes();
  await handler({
    method: 'POST',
    body: { id: 'abcd1234-ef56', event: 'page', page: 'step-1' },
  }, page);
  expect(page.statusCode).toBe(200);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual([
    ['INCR', 'eligibl:visitors:hits:step-1'],
    ['SADD', 'eligibl:visitors:step-1', 'abcd1234-ef56'],
  ]);

  global.fetch.mockResolvedValueOnce(redisReply([1, 1]));
  const click = mockRes();
  await handler({
    method: 'POST',
    body: { id: 'abcd1234-ef56', event: 'click', page: 'step-1', target: 'See my programs!', x: 25, y: 39 },
  }, click);
  expect(click.statusCode).toBe(200);
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual([
    ['HINCRBY', 'eligibl:visitors:clicks:step-1', 'see-my-programs', 1],
    ['HINCRBY', 'eligibl:visitors:heat:step-1', '2:3', 1],
  ]);

  const badPage = mockRes();
  await handler({ method: 'POST', body: { id: 'abcd1234-ef56', event: 'page', page: 'admin' } }, badPage);
  expect(badPage.statusCode).toBe(400);
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
  await handler(asAdmin({ method: 'GET' }), res);
  expect(res.statusCode).toBe(502);
  expect(res.body.ok).toBe(false);
});
