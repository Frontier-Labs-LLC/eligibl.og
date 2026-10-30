import { fetchVisitorCounts, getVisitorId, recordVisitorEvent } from './visitorCount';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: () => Promise.resolve(body),
  };
}

function htmlResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    json: () => Promise.reject(new Error('not json')),
  };
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test('the visitor id is random, stored once, and reused', () => {
  const first = getVisitorId();
  expect(first).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
  expect(getVisitorId()).toBe(first);
  expect(localStorage.getItem('eligibl-visitor-id')).toBe(first);
});

test('a visitor is reported once per event, even across repeat visits', async () => {
  global.fetch.mockResolvedValue(jsonResponse({ ok: true, started: 12, completed: 4 }));

  const first = await recordVisitorEvent('started');
  expect(first).toEqual({ started: 12, completed: 4 });
  expect(global.fetch).toHaveBeenCalledTimes(1);

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('/api/visitors');
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({ id: getVisitorId(), event: 'started' });

  await recordVisitorEvent('started');
  expect(global.fetch).toHaveBeenCalledTimes(1);

  await recordVisitorEvent('completed');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(global.fetch.mock.calls[1][1].body).event).toBe('completed');
});

test('a failed report is retried on the next visit', async () => {
  global.fetch.mockResolvedValueOnce(jsonResponse({ ok: false }, 503));
  expect(await recordVisitorEvent('started')).toBeNull();

  global.fetch.mockResolvedValueOnce(jsonResponse({ ok: true, started: 1, completed: 0 }));
  expect(await recordVisitorEvent('started')).toEqual({ started: 1, completed: 0 });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('unknown events and HTML fallbacks are ignored', async () => {
  expect(await recordVisitorEvent('whatever')).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();

  global.fetch.mockResolvedValueOnce(htmlResponse());
  expect(await fetchVisitorCounts()).toEqual({ status: 'unavailable', counts: null });

  global.fetch.mockRejectedValueOnce(new Error('offline'));
  expect(await fetchVisitorCounts()).toEqual({ status: 'unavailable', counts: null });

  global.fetch.mockResolvedValueOnce(jsonResponse({ ok: false, configured: false }, 503));
  expect(await fetchVisitorCounts()).toEqual({ status: 'unconfigured', counts: null });

  global.fetch.mockResolvedValueOnce(jsonResponse({ ok: true, started: 0, completed: 0 }));
  expect(await fetchVisitorCounts()).toEqual({ status: 'ready', counts: { started: 0, completed: 0 } });
});
