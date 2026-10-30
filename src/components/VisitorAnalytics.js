import { useVisitorCounts } from '../lib/visitorCount';
import './VisitorAnalytics.css';

function Count({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value.toLocaleString('en-US')}</dd>
    </div>
  );
}

/**
 * Live unique-visitor counts for /#admin.
 * Renders the numbers Redis actually holds. It never shows a placeholder.
 */
export default function VisitorAnalytics() {
  const { status, counts, refresh } = useVisitorCounts();
  const finishedShare = status === 'ready' && counts.started > 0
    ? Math.round((counts.completed / counts.started) * 100)
    : null;

  return (
    <section className="va-panel" aria-labelledby="va-heading">
      <div className="va-head">
        <h2 id="va-heading">Usage</h2>
        <button type="button" className="va-refresh" onClick={refresh}>
          Refresh
        </button>
      </div>
      <p className="va-note">
        Unique people who used the check, counted once per device.
        No names, answers, or IP addresses are stored.
      </p>

      {status === 'loading' && <p className="va-note">Loading the live counts…</p>}

      {status === 'ready' && (
        <>
          <dl className="va-stats">
            <Count label="Started the form" value={counts.started} />
            <Count label="Finished and saw programs" value={counts.completed} />
          </dl>
          {finishedShare !== null && (
            <p className="va-note">{finishedShare}% of the people who started also finished.</p>
          )}
        </>
      )}

      {status === 'unconfigured' && (
        <div className="va-setup">
          <p>Not connected. No number is shown until the counter can read Redis.</p>
          <p>In the Vercel project, add one of these pairs, then redeploy:</p>
          <ul>
            <li><code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code></li>
            <li>or <code>UPSTASH_REDIS_REST_URL</code> and <code>UPSTASH_REDIS_REST_TOKEN</code></li>
          </ul>
        </div>
      )}

      {status === 'unavailable' && (
        <p className="va-note">The counter could not be reached. Refresh to try again.</p>
      )}
    </section>
  );
}
