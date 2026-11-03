import {
  STATE_COOKIE,
  allowedEmails,
  authConfigured,
  clearSessionCookie,
  clearStateCookie,
  cookieValue,
  newState,
  readSession,
  requestOrigin,
  safeEqual,
  sessionCookie,
  signSession,
  stateCookie,
} from '../../server/adminSession';

function redirect(res, location, cookies = []) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', location);
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.statusCode = 302;
  if (typeof res.end === 'function') res.end();
}

export default async function handler(req, res) {
  const action = req.query && req.query.action;
  const { origin, secure } = requestOrigin(req);

  if (action === 'me') {
    res.setHeader('Cache-Control', 'no-store');
    const session = readSession(req.headers && req.headers.cookie);
    if (!session) return res.status(401).json({ ok: false });
    return res.status(200).json({ ok: true, email: session.email });
  }

  if (action === 'logout') {
    return redirect(res, '/admin', [clearSessionCookie(secure), clearStateCookie(secure)]);
  }

  if (action === 'google') {
    if (!authConfigured()) return redirect(res, '/admin?auth=unconfigured');
    const state = newState();
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return redirect(
      res,
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      [stateCookie(state, secure)],
    );
  }

  if (action === 'callback') {
    if (!authConfigured()) return redirect(res, '/admin?auth=unconfigured');
    const expected = cookieValue(req.headers && req.headers.cookie, STATE_COOKIE);
    const state = req.query.state;
    const code = req.query.code;
    if (!code || !state || !expected || !safeEqual(state, expected)) {
      return redirect(res, '/admin?auth=failed', [clearStateCookie(secure)]);
    }
    if (req.query.error) {
      return redirect(res, '/admin?auth=failed', [clearStateCookie(secure)]);
    }
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${origin}/api/auth/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok || !token.access_token) {
        return redirect(res, '/admin?auth=failed', [clearStateCookie(secure)]);
      }
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const info = await infoRes.json();
      const email = String(info.email || '').trim().toLowerCase();
      const verified = info.email_verified === true || info.email_verified === 'true';
      if (!infoRes.ok || !verified || !allowedEmails().includes(email)) {
        return redirect(res, '/admin?auth=denied', [clearStateCookie(secure)]);
      }
      return redirect(res, '/admin', [
        sessionCookie(signSession(email, process.env.ADMIN_SESSION_SECRET), { secure }),
        clearStateCookie(secure),
      ]);
    } catch {
      return redirect(res, '/admin?auth=failed', [clearStateCookie(secure)]);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).json({ ok: false });
}
