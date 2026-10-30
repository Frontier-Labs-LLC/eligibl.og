/**
 * Vercel serverless function: anonymous unique-visitor counter.
 *
 *   GET  /api/visitors                       → { ok, started, completed }
 *   POST /api/visitors { id, event }         → records the visitor, returns counts
 *
 * Storage is a Redis set per event (SADD / SCARD), reached over the Upstash
 * REST protocol, so each visitor ID is counted exactly once. Works with the
 * Vercel Marketplace Upstash/KV integration (KV_REST_API_URL / KV_REST_API_TOKEN)
 * or a plain Upstash database (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 *
 * When no Redis is configured the function answers 503 and the site simply
 * hides the counter pill.
 */

const EVENTS = ['started', 'completed'];
const KEY_PREFIX = process.env.VISITOR_KEY_PREFIX || 'eligibl:visitors:';
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

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

async function readCounts(config) {
  const results = await redisPipeline(config, EVENTS.map((event) => ['SCARD', keyFor(event)]));
  const counts = {};
  EVENTS.forEach((event, i) => { counts[event] = Number(results[i]) || 0; });
  return counts;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const config = redisConfig();
  if (!config) {
    return res.status(503).json({ ok: false, configured: false, error: 'Visitor counter storage is not configured.' });
  }

  try {
    if (req.method === 'GET') {
      const counts = await readCounts(config);
      return res.status(200).json({ ok: true, ...counts });
    }

    if (req.method === 'POST') {
      const { id, event } = parseBody(req);
      if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid visitor id.' });
      }
      if (!EVENTS.includes(event)) {
        return res.status(400).json({ ok: false, error: 'Unknown event.' });
      }
      const results = await redisPipeline(config, [
        ['SADD', keyFor(event), id],
        ...EVENTS.map((e) => ['SCARD', keyFor(e)]),
      ]);
      const counts = {};
      EVENTS.forEach((e, i) => { counts[e] = Number(results[i + 1]) || 0; });
      return res.status(200).json({ ok: true, recorded: Number(results[0]) === 1, ...counts });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Visitor counter storage is unavailable.' });
  }
}
