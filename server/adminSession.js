import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE = 'eligibl_admin';
export const STATE_COOKIE = 'eligibl_oauth_state';
const WEEK = 7 * 24 * 60 * 60;

function encode(text) {
  return Buffer.from(text)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decode(text) {
  const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(payload, secret) {
  return encode(createHmac('sha256', secret).update(payload).digest());
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function allowedEmails() {
  return String(process.env.ADMIN_GOOGLE_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function authConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.ADMIN_SESSION_SECRET
    && allowedEmails().length
  );
}

export function signSession(email, secret, now = Date.now(), ttlSeconds = WEEK) {
  const payload = encode(JSON.stringify({
    email: String(email).trim().toLowerCase(),
    exp: now + ttlSeconds * 1000,
  }));
  return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac || !safeEqual(mac, sign(payload, secret))) return null;
  let data;
  try {
    data = JSON.parse(decode(payload));
  } catch {
    return null;
  }
  if (!data || typeof data.email !== 'string' || typeof data.exp !== 'number') return null;
  if (data.exp <= now) return null;
  return { email: data.email };
}

export function cookieValue(header, name) {
  if (!header) return '';
  const parts = String(header).split(';');
  for (let i = 0; i < parts.length; i += 1) {
    const [key, ...rest] = parts[i].trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function readSession(cookieHeader, secret = process.env.ADMIN_SESSION_SECRET, now = Date.now()) {
  return readSessionToken(cookieValue(cookieHeader, COOKIE), secret, now);
}

function cookie(name, value, { secure, maxAge }) {
  const bits = [
    `${name}=${value}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
  ];
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

export function sessionCookie(token, { secure = false, maxAge = WEEK } = {}) {
  return cookie(COOKIE, token, { secure, maxAge });
}

export function clearSessionCookie(secure = false) {
  return cookie(COOKIE, '', { secure, maxAge: 0 });
}

export function stateCookie(state, secure = false) {
  return cookie(STATE_COOKIE, state, { secure, maxAge: 600 });
}

export function clearStateCookie(secure = false) {
  return cookie(STATE_COOKIE, '', { secure, maxAge: 0 });
}

export function newState() {
  return randomBytes(24).toString('hex');
}

export function requestOrigin(req) {
  const headers = (req && req.headers) || {};
  const host = String(headers['x-forwarded-host'] || headers.host || 'localhost:3000').split(',')[0].trim();
  const forwarded = String(headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return { origin: `${proto}://${host}`, secure: proto === 'https' };
}
