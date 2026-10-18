import { useMemo, useState } from 'react';
import { matchPrograms, getConfidenceLabel, getConfidenceColor } from '../lib/matchingEngine';
import PROGRAMS from '../data/programs';
import { getStatePrograms } from '../data/statePrograms';
import './ResultsPage.css';

// Maps CategorySelector category IDs → program category strings
const CATEGORY_MAP = {
  'children-families': ['childcare', 'food', 'cash', 'healthcare'],
  'death':             [],
  'disabilities':      ['social_services', 'healthcare', 'cash'],
  'disasters':         ['housing', 'utilities', 'social_services', 'community', 'shelter'],
  'education':         ['education'],
  'food':              ['food', 'community'],
  'health':            ['healthcare'],
  'housing-utilities': ['housing', 'utilities', 'shelter'],
  'shelter-services':  ['shelter', 'community', 'housing'],
  'jobs-unemployment': ['social_services', 'cash'],
  'military-veterans': ['veterans'],
  'retirement-seniors':['social_services', 'healthcare', 'cash'],
  'welfare-cash':      ['cash', 'food', 'social_services'],
  'business':          ['business'],
  'community':         ['community', 'shelter'],
};

const CATEGORY_LABELS = {
  food:             'Food',
  healthcare:       'Healthcare',
  education:        'Education',
  cash:             'Cash Assistance',
  housing:          'Housing',
  utilities:        'Utilities',
  childcare:        'Childcare',
  veterans:         'Veterans',
  social_services:  'Social Services',
  business:         'Business & Loans',
  community:        'Community Resources',
  shelter:          'Shelter & Crisis Housing',
};

const CATEGORY_ICONS = {
  food:             '🍎',
  healthcare:       '❤️',
  education:        '🎓',
  cash:             '💵',
  housing:          '🏠',
  utilities:        '💡',
  childcare:        '👶',
  veterans:         '⭐',
  social_services:  '🤝',
  business:         '💼',
  community:        '🏘️',
  shelter:          '🏚️',
};

export default function ResultsPage({ profile, selectedCategories, onStartOver, onOpenMap }) {
  const [activeFilter, setActiveFilter]     = useState('all');
  const [expandedId,   setExpandedId]       = useState(null);

  // Merge federal + state-specific programs
  const allPrograms = useMemo(() => {
    const statePrograms = profile.residentState
      ? getStatePrograms(profile.residentState)
      : [];
    return [...PROGRAMS, ...statePrograms];
  }, [profile.residentState]);

  // Run matching engine against merged program list, excluding CHECK_MANUALLY
  const rawResults = useMemo(() => matchPrograms(profile, allPrograms), [profile, allPrograms]);
  const results = useMemo(
    () => rawResults.filter(r => r.confidence !== 'check_manually'),
    [rawResults]
  );
  const checkManuallyCount = useMemo(
    () => rawResults.filter(r => r.confidence === 'check_manually').length,
    [rawResults]
  );

  // Apply step-1 category pre-filter (when user picked specific categories, not all)
  const categoryFilteredResults = useMemo(() => {
    const ALL_CAT_COUNT = Object.keys(CATEGORY_MAP).length;
    if (!selectedCategories || selectedCategories.length === 0 || selectedCategories.length >= ALL_CAT_COUNT) {
      return results; // no filter — show everything
    }
    const allowed = new Set(
      selectedCategories.flatMap(cat => CATEGORY_MAP[cat.id] || [])
    );
    if (allowed.size === 0) return results;
    return results.filter(r => allowed.has(r.program.category));
  }, [results, selectedCategories]);

  // Categories present in category-filtered results (for sidebar)
  const presentCategories = useMemo(() => {
    const cats = new Set(categoryFilteredResults.map(r => r.program.category));
    return Array.from(cats);
  }, [categoryFilteredResults]);

  // Sidebar filter applied on top of category pre-filter
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return categoryFilteredResults;
    if (activeFilter === 'likely' || activeFilter === 'possibly' || activeFilter === 'check_manually') {
      return categoryFilteredResults.filter(r => r.confidence === activeFilter);
    }
    return categoryFilteredResults.filter(r => r.program.category === activeFilter);
  }, [categoryFilteredResults, activeFilter]);

  const likelyCount   = categoryFilteredResults.filter(r => r.confidence === 'likely').length;
  const possiblyCount = categoryFilteredResults.filter(r => r.confidence === 'possibly').length;

  function toggleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <div className="rp-page">
      <a href="#rp-results" className="skip-link">Skip to results</a>
      <div className="rp-container">

        {/* Header */}
        <header className="rp-header">
          <div className="rp-logo" aria-label="Eligibl"><span className="rp-logo-e" aria-hidden="true">E</span>ligibl</div>
          <div className="rp-header-actions">
            {onOpenMap && (
              <button type="button" className="rp-map-btn" onClick={onOpenMap} aria-label="View NC resource map">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
                Map
              </button>
            )}
            <button
              type="button"
              className="rp-start-over"
              onClick={onStartOver}
              aria-label="Start over and return to category selection"
            >
              ← Start Over
            </button>
          </div>
        </header>

        {/* Hero summary */}
        <div className="rp-hero">
          <h1 className="rp-hero-title">
            We found <span className="rp-hero-count">{categoryFilteredResults.length} programs</span> you may qualify for
          </h1>
          <p className="rp-hero-sub">
            Based on your answers —{' '}
            <strong className="rp-likely">{likelyCount} likely</strong>{' '}
            and{' '}
            <strong className="rp-possibly">{possiblyCount} possibly eligible</strong>.
            Review each program and apply directly at the official source.
          </p>
          <div className="rp-badges">
            <span className="rp-badge rp-badge--green">🔒 Anonymous</span>
            <span className="rp-badge rp-badge--blue">✓ Official .gov sources only</span>
            <span className="rp-badge rp-badge--gray">No SSN required to use this tool</span>
          </div>
        </div>

        {/* Data gap prompt */}
        {profile.monthlyIncome === '' || profile.monthlyIncome === null ? (
          <div className="rp-data-gap-banner">
            <span className="rp-data-gap-icon">💡</span>
            <div>
              <strong>Refine your results:</strong> You didn't enter your income. Adding it will
              give you more accurate matches.{' '}
              <button className="rp-gap-link" onClick={onStartOver}>Update your answers</button>
            </div>
          </div>
        ) : null}

        <div className="rp-body">
          {/* Sidebar filters */}
          <aside className="rp-sidebar" aria-label="Filter programs">
            <h2 className="rp-sidebar-title">Filter Results</h2>

            <div className="rp-filter-group" role="group" aria-label="Filter by eligibility">
              <p className="rp-filter-label" aria-hidden="true">By eligibility</p>
              {[
                { key: 'all',           label: `All Programs (${categoryFilteredResults.length})` },
                { key: 'likely',        label: `Likely Eligible (${likelyCount})` },
                { key: 'possibly',      label: `Possibly Eligible (${possiblyCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`rp-filter-btn${activeFilter === f.key ? ' rp-filter-btn--active' : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                  aria-pressed={activeFilter === f.key}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="rp-filter-group" role="group" aria-label="Filter by category">
              <p className="rp-filter-label" aria-hidden="true">By category</p>
              {presentCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`rp-filter-btn${activeFilter === cat ? ' rp-filter-btn--active' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                  aria-pressed={activeFilter === cat}
                >
                  <span aria-hidden="true">{CATEGORY_ICONS[cat]}</span> {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>

            <div className="rp-sidebar-note">
              <p>All programs link to official government sources. We never ask for your Social Security Number.</p>
            </div>
          </aside>

          {/* Results list */}
          <main id="rp-results" className="rp-main" aria-label={`${filtered.length} program results`} aria-live="polite">
            {filtered.length === 0 ? (
              <div className="rp-empty">
                <p className="rp-empty-icon">🔍</p>
                <p className="rp-empty-title">No matches in this filter</p>
                <button className="rp-empty-reset" onClick={() => setActiveFilter('all')}>
                  Show all programs
                </button>
              </div>
            ) : (
              filtered.map(result => (
                <ProgramCard
                  key={result.program.id}
                  result={result}
                  expanded={expandedId === result.program.id}
                  onToggle={() => toggleExpand(result.program.id)}
                />
              ))
            )}
            {checkManuallyCount > 0 && (
              <div className="rp-check-manually-note">
                <span aria-hidden="true">ℹ️</span>
                <span>{checkManuallyCount} additional program{checkManuallyCount !== 1 ? 's' : ''} couldn't be confirmed or ruled out — fill in all form fields for a more complete picture.</span>
              </div>
            )}
          </main>
        </div>

        <p className="rp-disclaimer">
          Eligibl is an informational tool only. Eligibility determinations are made by the administering agency, not by Eligibl. Always verify directly with the program.
        </p>
      </div>
    </div>
  );
}

// ── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({ result, expanded, onToggle }) {
  const { program, confidence, reasons, dataGaps } = result;
  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);

  return (
    <div className={`rp-card rp-card--${color}${expanded ? ' rp-card--expanded' : ''}`}>
      {/* Card header */}
      <div
        className="rp-card-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${program.name} — ${label}. ${expanded ? 'Collapse' : 'Expand'} details`}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      >
        <div className="rp-card-left">
          <span className="rp-card-cat-icon" aria-hidden="true">{CATEGORY_ICONS[program.category]}</span>
          <div>
            <div className="rp-card-name-row">
              <h2 className="rp-card-name">{program.name}</h2>
              <span className={`rp-confidence-badge rp-confidence-badge--${color}`}>{label}</span>
            </div>
            <p className="rp-card-full-name">{program.fullName}</p>
            <p className="rp-card-category">{CATEGORY_LABELS[program.category]}</p>
          </div>
        </div>
        <div className="rp-card-right">
          <div className="rp-benefit-pill" aria-hidden="true">{program.benefit.description.split(';')[0]}</div>
          <span className="rp-card-toggle" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="rp-card-body">
          <p className="rp-card-desc">{program.description}</p>

          {/* Why you may qualify */}
          {reasons.length > 0 && (
            <div className="rp-card-section">
              <h3 className="rp-card-section-title rp-card-section-title--green">
                ✓ Why you may qualify
              </h3>
              <ul className="rp-card-list">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Data gaps */}
          {dataGaps.length > 0 && (
            <div className="rp-card-section">
              <h3 className="rp-card-section-title rp-card-section-title--yellow">
                ⚠ More info needed for a precise match
              </h3>
              <ul className="rp-card-list rp-card-list--gaps">
                {dataGaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}

          {/* Benefit info */}
          <div className="rp-card-section">
            <h3 className="rp-card-section-title">What you may receive</h3>
            <p className="rp-card-benefit-note">{program.benefit.amountNote}</p>
          </div>

          {/* How to apply */}
          <div className="rp-card-section">
            <h3 className="rp-card-section-title">How to apply</h3>
            <p className="rp-card-apply-text">{program.howToApply}</p>
          </div>

          {/* Documents needed */}
          <div className="rp-card-section">
            <h3 className="rp-card-section-title">Documents you may need</h3>
            <ul className="rp-card-list">
              {program.documentsNeeded.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>

          {/* Actions */}
          <div className="rp-card-actions">
            <a
              href={program.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-btn-apply"
            >
              Apply Now — Official Site ↗
            </a>
            <a
              href={program.website}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-btn-learn"
            >
              Learn More ↗
            </a>
            {program.phone && (
              <a href={`tel:${program.phone}`} className="rp-btn-phone">
                📞 {program.phone}
              </a>
            )}
          </div>

          <p className="rp-card-verified">
            Last verified: {program.lastVerified} &nbsp;·&nbsp;
            <a href={program.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a>
          </p>
        </div>
      )}
    </div>
  );
}
