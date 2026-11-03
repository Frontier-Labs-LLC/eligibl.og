import { useEffect, useState } from 'react';
import CityAdmin from './CityAdmin';
import './AdminGate.css';

const MESSAGES = {
  unconfigured: 'Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_SESSION_SECRET, and ADMIN_GOOGLE_EMAILS on the server. Add them in the Vercel project, then redeploy. The client secret stays on the server.',
  denied: 'That Google account is not on the admin list.',
  failed: 'Google sign-in did not finish. Try again.',
};

export default function AdminGate(props) {
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

  if (session && session.email) {
    return <CityAdmin {...props} email={session.email} />;
  }

  return (
    <main className="ag-page">
      <div className="ag-card">
        <p className="ag-brand">eligibl<span>.org</span></p>
        <h1>Admin</h1>
        {session === null ? (
          <p>Checking sign-in…</p>
        ) : (
          <>
            <p>
              Sign in with the Google account that is allowed to see usage
              and the Charlotte preview.
            </p>
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
