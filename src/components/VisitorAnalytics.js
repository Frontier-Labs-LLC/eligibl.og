import { useState } from 'react';
import { useVisitorCounts } from '../lib/visitorCount';
import './VisitorAnalytics.css';

const PAGE_ORDER = [
  ['step-1', '1. Your state'],
  ['step-2', '2. About you'],
  ['step-3', '3. Household'],
  ['step-4', '4. Income'],
  ['step-5', '5. Housing'],
  ['step-6', '6. Details'],
  ['results', 'Results'],
  ['office', 'Office brief'],
];

const SURVEY_ROWS = [
  ['helped-yes', 'Said it helped'],
  ['helped-some', 'Said it helped a little'],
  ['helped-no', 'Said it did not help'],
  ['why-knew-next', 'Knows what to apply for'],
  ['why-new-program', 'Found a program they did not know'],
  ['why-still-lost', 'Still does not know what to do'],
  ['why-confusing', 'Questions were confusing'],
  ['why-wrong', 'Something looked wrong'],
];

function Count({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value.toLocaleString('en-US')}</dd>
    </div>
  );
}

function Heatmap({ cells }) {
  const max = Math.max(1, ...Object.values(cells || {}));
  const tiles = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      const hits = (cells && cells[`${x}:${y}`]) || 0;
      tiles.push({ x, y, hits, opacity: hits === 0 ? 0.04 : 0.15 + (0.85 * hits) / max });
    }
  }
  return (
    <div className="va-heat" role="img" aria-label="Click heatmap, ten by ten">
      {tiles.map((tile) => (
        <span
          key={`${tile.x}:${tile.y}`}
          style={{ opacity: tile.opacity }}
          title={tile.hits ? `${tile.hits} clicks` : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Live counts for /#admin.
 * Page hits are every time a screen was shown. Uniques are people.
 * The heatmap is where those people clicked, in tenths of the screen.
 */
export default function VisitorAnalytics() {
  const { status, counts, refresh } = useVisitorCounts();
  const pages = counts && counts.pages;
  const [picked, setPicked] = useState('step-1');
  const finishedShare = status === 'ready' && counts.started > 0
    ? Math.round((counts.completed / counts.started) * 100)
    : null;
  const selected = PAGE_ORDER.some(([id]) => id === picked) ? picked : 'step-1';
  const pageClicks = (counts && counts.clicks && counts.clicks[selected]) || {};
  const pageHeat = (counts && counts.heat && counts.heat[selected]) || {};
  const clickRows = Object.entries(pageClicks).sort((a, b) => b[1] - a[1]);
  const firstHits = pages && pages['step-1'] ? pages['step-1'].hits : 0;
  const resultHits = pages && pages.results ? pages.results.hits : 0;
  const maxHits = pages
    ? Math.max(1, ...PAGE_ORDER.map(([id]) => (pages[id] ? pages[id].hits : 0)))
    : 1;

  return (
    <section className="va-panel" aria-labelledby="va-heading">
      <div className="va-head">
        <h2 id="va-heading">Usage</h2>
        <button type="button" className="va-refresh" onClick={refresh}>
          Refresh
        </button>
      </div>
      <p className="va-note">
        Page hits count every time a screen was shown. People count each device once.
        Clicks are the control that was pressed, and which tenth of the screen it was in.
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

          {pages && (
            <>
              <h3 className="va-subhead">Pages</h3>
              {firstHits > 0 && (
                <p className="va-note">
                  {resultHits.toLocaleString('en-US')} of {firstHits.toLocaleString('en-US')} hits on the first page reached the results.
                </p>
              )}
              <ol className="va-funnel">
                {PAGE_ORDER.map(([id, label]) => {
                  const row = pages[id] || { hits: 0, uniques: 0 };
                  const width = Math.max(2, Math.round((row.hits / maxHits) * 100));
                  return (
                    <li key={id}>
                      <span className="va-funnel-label">{label}</span>
                      <span className="va-funnel-track" aria-hidden="true">
                        <span className="va-funnel-fill" style={{ width: `${width}%` }} />
                      </span>
                      <span className="va-funnel-nums">
                        {row.hits.toLocaleString('en-US')} hits
                        {' · '}
                        {row.uniques.toLocaleString('en-US')} people
                      </span>
                    </li>
                  );
                })}
              </ol>

              <h3 className="va-subhead">Clicks</h3>
              <div className="va-pages" role="group" aria-label="Heatmap page">
                {PAGE_ORDER.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`va-page${selected === id ? ' va-page--on' : ''}`}
                    aria-pressed={selected === id}
                    onClick={() => setPicked(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Heatmap cells={pageHeat} />
              {clickRows.length > 0 ? (
                <ul className="va-clicks">
                  {clickRows.map(([name, hits]) => (
                    <li key={name}>
                      <span>{name}</span>
                      <span>{hits.toLocaleString('en-US')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="va-note">No clicks on this page yet.</p>
              )}
            </>
          )}

          {counts.survey && (
            <>
              <h3 className="va-subhead">Did this help?</h3>
              <p className="va-note">What people said after they saw programs. This is the number to take to a call center.</p>
              <dl className="va-stats va-stats--survey">
                {SURVEY_ROWS.map(([id, label]) => (
                  <Count key={id} label={label} value={counts.survey[id] || 0} />
                ))}
              </dl>
            </>
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
