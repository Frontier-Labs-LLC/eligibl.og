/**
 * Vercel serverless function: anonymous counts for the check.
 *
 *   GET  /api/visitors
 *     Signed-in admin only.
 *     { ok, started, completed, pages, clicks, heat, survey }
 *
 *   POST /api/visitors { id, event: 'started' | 'completed' | survey id }
 *     Counts that person once.
 *
 *   POST /api/visitors { id, event: 'page', page }
 *     Counts a page hit every time, and the person once.
 *
 *   POST /api/visitors { id, event: 'click', page, target, x, y }
 *     Counts a click on a control, and which tenth of the screen it landed in.
 *     x and y are percentages of the viewport. No answers, names, or IPs.
 *
 * Storage is Redis over the Upstash REST protocol. Works with the Vercel
 * Marketplace Upstash/KV integration or a plain Upstash database.
 * When no Redis is configured the function answers 503.
 */

import { readSession } from '../server/adminSession';

const UNIQUE_EVENTS = [
  'started',
  'completed',
  'helped-yes',
  'helped-some',
  'helped-no',
  'why-knew-next',
  'why-new-program',
  'why-still-lost',
  'why-confusing',
  'why-wrong',
];

const PAGES = [
  'step-1',
  'step-2',
  'step-3',
  'step-4',
  'step-5',
  'step-6',
  'results',
  'office',
];

const SURVEY_EVENTS = UNIQUE_EVENTS.filter((event) => event !== 'started' && event !== 'completed');
const KEY_PREFIX = process.env.VISITOR_KEY_PREFIX || 'eligibl:visitors:';
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
const PAGE_PATTERN = /^[a-z0-9-]{1,32}$/;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function redisPipeline(config, commands) {
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!response.ok) {
    throw new Error(`Redis responded ${response.status}`);
  }
  const results = await response.json();
  const failed = results.find((r) => r && r.error);
  if (failed) throw new Error(failed.error);
  return results.map((r) => r.result);
}

function keyFor(event) {
  return `${KEY_PREFIX}${event}`;
}

function hitsKey(page) {
  return `${KEY_PREFIX}hits:${page}`;
}

function clickKey(page) {
  return `${KEY_PREFIX}clicks:${page}`;
}

function heatKey(page) {
  return `${KEY_PREFIX}heat:${page}`;
}

function asCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function asHash(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  Object.entries(value).forEach(([field, count]) => {
    if (!/^[a-z0-9:-]{1,48}$/.test(field)) return;
    const number = asCount(count);
    if (number > 0) out[field] = number;
  });
  return out;
}

function readCommands() {
  return [
    ...UNIQUE_EVENTS.map((event) => ['SCARD', keyFor(event)]),
    ...PAGES.map((page) => ['SCARD', keyFor(page)]),
    ...PAGES.map((page) => ['GET', hitsKey(page)]),
    ...PAGES.map((page) => ['HGETALL', clickKey(page)]),
    ...PAGES.map((page) => ['HGETALL', heatKey(page)]),
  ];
}

function countsFrom(results) {
  const unique = {};
  UNIQUE_EVENTS.forEach((event, index) => {
    unique[event] = asCount(results[index]);
  });

  const pageStart = UNIQUE_EVENTS.length;
  const pages = {};
  PAGES.forEach((page, index) => {
    pages[page] = {
      uniques: asCount(results[pageStart + index]),
      hits: asCount(results[pageStart + PAGES.length + index]),
    };
  });

  const clickStart = pageStart + (PAGES.length * 2);
  const clicks = {};
  const heat = {};
  PAGES.forEach((page, index) => {
    clicks[page] = asHash(results[clickStart + index]);
    heat[page] = asHash(results[clickStart + PAGES.length + index]);
  });

  const survey = {};
  SURVEY_EVENTS.forEach((event) => { survey[event] = unique[event]; });

  return {
    started: unique.started,
    completed: unique.completed,
    pages,
    clicks,
    heat,
    survey,
  };
}

async function readCounts(config) {
  return countsFrom(await redisPipeline(config, readCommands()));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function validId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

function cleanTarget(value) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function bucket(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const clamped = Math.max(0, Math.min(100, number));
  return Math.min(9, Math.floor(clamped / 10));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const session = readSession(req.headers && req.headers.cookie);
    if (!session) return res.status(401).json({ ok: false });
  }

  const config = redisConfig();
  if (!config) {
    return res.status(503).json({ ok: false, configured: false, error: 'Visitor counter storage is not configured.' });
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, ...(await readCounts(config)) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const { id, event, page, target, x, y } = body;
      if (!validId(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid visitor id.' });
      }

      if (event === 'page') {
        if (typeof page !== 'string' || !PAGES.includes(page)) {
          return res.status(400).json({ ok: false, error: 'Unknown page.' });
        }
        await redisPipeline(config, [
          ['INCR', hitsKey(page)],
          ['SADD', keyFor(page), id],
        ]);
        return res.status(200).json({ ok: true });
      }

      if (event === 'click') {
        const name = cleanTarget(target);
        const bx = bucket(x);
        const by = bucket(y);
        if (typeof page !== 'string' || !PAGES.includes(page) || !name || bx === null || by === null) {
          return res.status(400).json({ ok: false, error: 'Invalid click.' });
        }
        await redisPipeline(config, [
          ['HINCRBY', clickKey(page), name, 1],
          ['HINCRBY', heatKey(page), `${bx}:${by}`, 1],
        ]);
        return res.status(200).json({ ok: true });
      }

      if (!UNIQUE_EVENTS.includes(event)) {
        return res.status(400).json({ ok: false, error: 'Unknown event.' });
      }
      const results = await redisPipeline(config, [
        ['SADD', keyFor(event), id],
        ['SCARD', keyFor('started')],
        ['SCARD', keyFor('completed')],
      ]);
      return res.status(200).json({
        ok: true,
        recorded: Number(results[0]) === 1,
        started: asCount(results[1]),
        completed: asCount(results[2]),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Visitor counter storage is unavailable.' });
  }
}
