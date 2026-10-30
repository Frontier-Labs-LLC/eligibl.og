import { useVisitorCounts } from '../lib/visitorCount';
import './HelpedPill.css';

/**
 * Front-page pill. The number is the count of unique people who started
 * the form, read from the visitor database. Nothing is shown until that
 * read succeeds, so the page never displays a stand-in number.
 */
export default function HelpedPill() {
  const { status, counts } = useVisitorCounts();
  if (status !== 'ready' || !counts) return null;

  const people = counts.started;
  const formatted = people.toLocaleString('en-US');

  return (
    <p
      className="hp-pill"
      role="status"
      title="Counted once per device. The number is the live total of people who started the form."
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
        {' '}{people === 1 ? 'person has' : 'people have'} tried the form
      </span>
    </p>
  );
}
