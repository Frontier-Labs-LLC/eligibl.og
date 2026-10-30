import { useVisitorCounts } from '../lib/visitorCount';
import './HelpedPill.css';

/**
 * Front-page pill: how many unique people have used the Eligibl check.
 * Renders nothing while loading, when the counter API is unavailable, or
 * before the first visitor, so the home page never shows "0 people".
 */
export default function HelpedPill() {
  const { status, counts } = useVisitorCounts();
  if (status !== 'ready' || !counts || counts.started < 1) return null;

  const people = counts.started;
  const formatted = people.toLocaleString('en-US');

  return (
    <p
      className="hp-pill"
      role="status"
      title="Counted once per device with an anonymous random ID. No names, answers, or IP addresses are stored."
    >
      <span className="hp-pill-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </span>
      <span className="hp-pill-text">
        <strong className="hp-pill-count">{formatted}</strong>
        {' '}{people === 1 ? 'person has' : 'people have'} used eligibl.org to find aid programs they may qualify for
      </span>
    </p>
  );
}
