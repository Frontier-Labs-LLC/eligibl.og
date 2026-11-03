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
export const VISITOR_EVENTS = [
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

export const VISITOR_PAGES = [
  'step-1',
  'step-2',
  'step-3',
  'step-4',
  'step-5',
  'step-6',
  'results',
  'office',
];

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

function finiteCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function parsePages(value) {
  if (!value || typeof value !== 'object') return null;
  const pages = {};
  Object.entries(value).forEach(([page, entry]) => {
    if (!VISITOR_PAGES.includes(page) || !entry || typeof entry !== 'object') return;
    const hits = finiteCount(entry.hits);
    const uniques = finiteCount(entry.uniques);
    if (hits === null || uniques === null) return;
    pages[page] = { hits, uniques };
  });
  return pages;
}

function parseNestedCounts(value) {
  if (!value || typeof value !== 'object') return null;
  const out = {};
  Object.entries(value).forEach(([page, entry]) => {
    if (!VISITOR_PAGES.includes(page) || !entry || typeof entry !== 'object') return;
    const counts = {};
    Object.entries(entry).forEach(([name, count]) => {
      if (!/^[a-z0-9:-]{1,48}$/.test(name)) return;
      const number = finiteCount(count);
      if (number === null || number === 0) return;
      counts[name] = number;
    });
    out[page] = counts;
  });
  return out;
}

function parseSurvey(value) {
  if (!value || typeof value !== 'object') return null;
  const survey = {};
  VISITOR_EVENTS.forEach((event) => {
    if (event === 'started' || event === 'completed') return;
    const number = finiteCount(value[event]);
    if (number !== null) survey[event] = number;
  });
  return survey;
}

function parseCounts(data) {
  if (!data || typeof data !== 'object') return null;
  const started = finiteCount(data.started);
  const completed = finiteCount(data.completed);
  if (started === null || completed === null) return null;
  const counts = { started, completed };
  const pages = parsePages(data.pages);
  const clicks = parseNestedCounts(data.clicks);
  const heat = parseNestedCounts(data.heat);
  const survey = parseSurvey(data.survey);
  if (pages) counts.pages = pages;
  if (clicks) counts.clicks = clicks;
  if (heat) counts.heat = heat;
  if (survey) counts.survey = survey;
  return counts;
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

function postVisitor(body) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(VISITOR_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: getVisitorId(), ...body }),
    keepalive: true,
  })
    .then((response) => (response.ok ? true : null))
    .catch(() => null);
}

/** Count a screen every time it is shown, and count the person once. */
export function recordPageView(page) {
  if (!VISITOR_PAGES.includes(page)) return Promise.resolve(null);
  return postVisitor({ event: 'page', page });
}

/**
 * Count a click. x and y are percentages of the viewport (0–100).
 * The label is the control we named, never an answer the person typed.
 */
export function recordClick({ page, target, x, y }) {
  if (!VISITOR_PAGES.includes(page)) return Promise.resolve(null);
  if (typeof target !== 'string' || !target.trim()) return Promise.resolve(null);
  return postVisitor({
    event: 'click',
    page,
    target: target.trim().slice(0, 80),
    x,
    y,
  });
}

/**
 * Fetch the live counts.
 * status is 'ready' (counts may be 0), 'unconfigured' (Redis env vars missing),
 * or 'unavailable' (the API could not be reached).
 */
export function fetchVisitorCounts() {
  if (typeof fetch !== 'function') return Promise.resolve({ status: 'unavailable', counts: null });
  return fetch(VISITOR_API, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
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
