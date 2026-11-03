import handler from '../../api/auth/[action]';
import { readSession, signSession } from '../../server/adminSession';

const ENV = { ...process.env };

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { this.ended = true; },
  };
}

function configure() {
  process.env.GOOGLE_CLIENT_ID = 'google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
  process.env.ADMIN_SESSION_SECRET = 'session-secret';
  process.env.ADMIN_GOOGLE_EMAILS = 'Owner@Eligibl.org';
}

beforeEach(() => {
  process.env = { ...ENV };
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_GOOGLE_EMAILS;
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ENV;
});

test('Google sign-in stays closed until the server has credentials and an allow list', async () => {
  const res = mockRes();
  await handler({
    query: { action: 'google' },
    headers: { host: 'localhost:3000' },
  }, res);
  expect(res.statusCode).toBe(302);
  expect(res.headers.Location).toBe('/admin?auth=unconfigured');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a configured server sends the browser to Google and remembers the state', async () => {
  configure();
  const res = mockRes();
  await handler({
    query: { action: 'google' },
    headers: { host: 'eligibl.org', 'x-forwarded-proto': 'https' },
  }, res);

  expect(res.statusCode).toBe(302);
  const location = new URL(res.headers.Location);
  expect(location.origin).toBe('https://accounts.google.com');
  expect(location.searchParams.get('client_id')).toBe('google-client-id');
  expect(location.searchParams.get('redirect_uri')).toBe('https://eligibl.org/api/auth/callback');
  expect(location.searchParams.get('response_type')).toBe('code');
  expect(res.headers.Location).not.toContain('google-client-secret');
  const state = location.searchParams.get('state');
  const setCookie = res.headers['Set-Cookie'][0];
  expect(setCookie).toContain(`eligibl_oauth_state=${state}`);
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('Secure');
});

test('the callback signs in an allowed verified Google account and rejects the rest', async () => {
  configure();
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'access-token' }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'Owner@Eligibl.org', email_verified: true }),
    });

  const res = mockRes();
  await handler({
    query: { action: 'callback', code: 'auth-code', state: 'state-1' },
    headers: {
      host: 'localhost:3000',
      cookie: 'eligibl_oauth_state=state-1',
    },
  }, res);

  expect(res.statusCode).toBe(302);
  expect(res.headers.Location).toBe('/admin');
  const cookies = res.headers['Set-Cookie'];
  const session = cookies.find((item) => item.startsWith('eligibl_admin=') && !item.startsWith('eligibl_admin=;'));
  expect(session).toContain('HttpOnly');
  expect(readSession(session, 'session-secret').email).toBe('owner@eligibl.org');

  const [, tokenCall] = global.fetch.mock.calls[0];
  expect(tokenCall.body.get('client_secret')).toBe('google-client-secret');
  expect(tokenCall.body.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback');

  const me = mockRes();
  await handler({
    query: { action: 'me' },
    headers: { cookie: session.split(';')[0] },
  }, me);
  expect(me.statusCode).toBe(200);
  expect(me.body).toEqual({ ok: true, email: 'owner@eligibl.org' });

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ access_token: 'access-token' }),
  }).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ email: 'someoneelse@example.com', email_verified: true }),
  });
  const denied = mockRes();
  await handler({
    query: { action: 'callback', code: 'auth-code', state: 'state-1' },
    headers: { host: 'localhost:3000', cookie: 'eligibl_oauth_state=state-1' },
  }, denied);
  expect(denied.headers.Location).toBe('/admin?auth=denied');
  expect(JSON.stringify(denied.headers['Set-Cookie'])).not.toContain('eligibl_admin=ey');

  const mismatch = mockRes();
  await handler({
    query: { action: 'callback', code: 'auth-code', state: 'other' },
    headers: { host: 'localhost:3000', cookie: 'eligibl_oauth_state=state-1' },
  }, mismatch);
  expect(mismatch.headers.Location).toBe('/admin?auth=failed');
});

test('a signed cookie expires and a missing cookie is signed out', () => {
  const token = signSession('owner@eligibl.org', 'session-secret', 1_000, 10);
  expect(readSession(`eligibl_admin=${token}`, 'session-secret', 1_000).email).toBe('owner@eligibl.org');
  expect(readSession(`eligibl_admin=${token}`, 'session-secret', 20_000)).toBeNull();
  expect(readSession(`eligibl_admin=${token}`, 'other-secret', 1_000)).toBeNull();
  expect(readSession('', 'session-secret')).toBeNull();
});
