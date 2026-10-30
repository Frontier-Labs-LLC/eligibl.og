/**
 * Anonymous unique-visitor counting.
 *
 * Each browser gets one random ID (stored only on the device, never tied to a
 * name, answers, or IP). The ID is sent to /api/visitors when a person first
 * reaches the form ('started') and when they finish it ('completed'). The API
 * keeps a set of IDs per event, so each person is counted once no matter how
 * many times they come back. Nothing from the form itself is sent.
 */

import { useEffect, useState } from 'react';

export const VISITOR_API = process.env.REACT_APP_VISITOR_API || '/api/visitors';
const ID_KEY = 'eligibl-visitor-id';
const SENT_KEY_PREFIX = 'eligibl-visitor-sent:';
export const VISITOR_EVENTS = ['started', 'completed'];

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the visit still counts for this page load.
  }
}

export function getVisitorId() {
  let id = readStorage(ID_KEY);
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = randomId();
    writeStorage(ID_KEY, id);
  }
  return id;
}

function parseCounts(data) {
  if (!data || typeof data !== 'object') return null;
  const started = Number(data.started);
  const completed = Number(data.completed);
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return null;
  return { started, completed };
}

async function readJson(response) {
  const type = response.headers.get('content-type') || '';
  // The CRA dev server answers unknown routes with index.html; treat that as "no API".
  if (!type.includes('application/json')) return null;
  return response.json();
}

/**
 * Record that this visitor reached ('started') or finished ('completed') the
 * form. Sends once per event per device; silently does nothing if the API is
 * unavailable, so the form never depends on it.
 */
export function recordVisitorEvent(event) {
  if (!VISITOR_EVENTS.includes(event)) return Promise.resolve(null);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const sentKey = SENT_KEY_PREFIX + event;
  if (readStorage(sentKey)) return Promise.resolve(null);

  return fetch(VISITOR_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: getVisitorId(), event }),
    keepalive: true,
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const counts = parseCounts(await readJson(response));
      if (counts) writeStorage(sentKey, new Date().toISOString());
      return counts;
    })
    .catch(() => null);
}

/**
 * Fetch the live counts.
 * status is 'ready' (counts may be 0), 'unconfigured' (Redis env vars missing),
 * or 'unavailable' (the API could not be reached).
 */
export function fetchVisitorCounts() {
  if (typeof fetch !== 'function') return Promise.resolve({ status: 'unavailable', counts: null });
  return fetch(VISITOR_API, { method: 'GET', headers: { Accept: 'application/json' } })
    .then(async (response) => {
      const data = await readJson(response);
      if (response.status === 503 && data && data.configured === false) {
        return { status: 'unconfigured', counts: null };
      }
      const counts = response.ok ? parseCounts(data) : null;
      if (!counts) return { status: 'unavailable', counts: null };
      return { status: 'ready', counts };
    })
    .catch(() => ({ status: 'unavailable', counts: null }));
}

/**
 * React hook: { status, counts, refresh }.
 * status is 'loading' until the first response arrives.
 */
export function useVisitorCounts() {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ status: 'loading', counts: null });

  useEffect(() => {
    let cancelled = false;
    fetchVisitorCounts().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => { cancelled = true; };
  }, [tick]);

  return { ...state, refresh: () => setTick((n) => n + 1) };
}
