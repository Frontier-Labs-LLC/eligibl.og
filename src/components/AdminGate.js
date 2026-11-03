import { useEffect, useState } from 'react';
import { useVisitorCounts } from '../lib/visitorCount';
import './AdminGate.css';

const MESSAGES = {
  unconfigured: 'Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_SESSION_SECRET, and ADMIN_GOOGLE_EMAILS on the server. Add them in the Vercel project, then redeploy. The client secret stays on the server.',
  denied: 'That Google account is not on the admin list.',
  failed: 'Google sign-in did not finish. Try again.',
};

function Usage() {
  const { status, counts } = useVisitorCounts();

  if (status === 'loading') return <p>Loading usage…</p>;
  if (status === 'unconfigured') {
    return (
      <p>
        The counter is not connected. Set KV_REST_API_URL and KV_REST_API_TOKEN,
        or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, then redeploy.
      </p>
    );
  }
  if (status !== 'ready' || !counts) return <p>Usage could not be loaded.</p>;

  return (
    <dl className="ag-counts">
      <div>
        <dt>Started the form</dt>
        <dd>{counts.started.toLocaleString('en-US')}</dd>
      </div>
      <div>
        <dt>Finished and saw programs</dt>
        <dd>{counts.completed.toLocaleString('en-US')}</dd>
      </div>
    </dl>
  );
}

export default function AdminGate({ onBack }) {
  const [session, setSession] = useState(null);
  const reason = new URLSearchParams(window.location.search).get('auth');

  useEffect(() => {
    let live = true;
    fetch('/api/auth/me', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const data = await response.json();
        return data && data.email ? data : false;
      })
      .catch(() => false)
      .then((next) => {
        if (live) setSession(next);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="ag-page">
      <div className="ag-card">
        <p className="ag-brand">eligibl<span>.org</span></p>
        <h1>Admin</h1>
        {session && session.email ? (
          <>
            <p>Signed in as {session.email}.</p>
            <Usage />
            <p className="ag-actions">
              <a href="/api/auth/logout">Sign out</a>
              <button type="button" className="ag-back" onClick={onBack}>Back to the check</button>
            </p>
          </>
        ) : session === null ? (
          <p>Checking sign-in…</p>
        ) : (
          <>
            <p>Sign in with the Google account that is allowed to see usage.</p>
            {reason && MESSAGES[reason] ? (
              <p className="ag-error" role="alert">{MESSAGES[reason]}</p>
            ) : null}
            <a className="ag-google" href="/api/auth/google">Sign in with Google</a>
          </>
        )}
      </div>
    </main>
  );
}
