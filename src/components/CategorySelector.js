import { useState } from 'react';
import { CITY_DISCLAIMER, activeCity, useCityConfig } from '../cityConfig';
import CityIcon from './CityIcons';
import HelpedPill from './HelpedPill';
import './CategorySelector.css';

const CATEGORIES = [
  {
    id: 'children-families',
    label: 'Children and families',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'death',
    label: 'Death',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 3.5 2 6 4 8v3h6v-3c2-2 4-4.5 4-8a7 7 0 0 0-7-7z" />
        <path d="M10 20h4" />
        <path d="M10 17h4" />
      </svg>
    ),
  },
  {
    id: 'disabilities',
    label: 'Disabilities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 9v4" />
        <path d="M8 21l2-5h4l1 2.5" />
        <circle cx="17" cy="19" r="2" />
        <path d="M9 13H7a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    id: 'disasters',
    label: 'Disasters',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'education',
    label: 'Education',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    id: 'food',
    label: 'Food',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    ),
  },
  {
    id: 'health',
    label: 'Health',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 'housing-utilities',
    label: 'Housing and utilities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'jobs-unemployment',
    label: 'Jobs and unemployment',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 'military-veterans',
    label: 'Military and veterans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'retirement-seniors',
    label: 'Retirement and seniors',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'welfare-cash',
    label: 'Welfare and cash assistance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'business',
    label: 'Business and loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="17" />
        <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
      </svg>
    ),
  },
  {
    id: 'shelter-services',
    label: 'Shelters and crisis housing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
        <path d="M9 20v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id: 'community',
    label: 'Community resources',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 11v6" />
        <path d="M20 14h6" />
      </svg>
    ),
  },
];

export default function CategorySelector({ onApply, onOpenMap, onOpenCamp, onOpenOffice, onOpenAdmin }) {
  const [selected, setSelected] = useState(new Set());
  const city = activeCity(useCityConfig());

  const allSelected = selected.size === CATEGORIES.length;

  function toggleCategory(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(CATEGORIES.map(c => c.id)));
    }
  }

  function handleClear() {
    setSelected(new Set());
  }

  function handleApply() {
    const selectedCategories = CATEGORIES.filter(c => selected.has(c.id));
    if (onApply) onApply(selectedCategories);
  }

  return (
    <div className="cs-page">
      <a href="#cs-main" className="skip-link">Skip to categories</a>
      <div className="cs-container">

        {/* Header */}
        <header className="cs-header">
          <div className="cs-logo" aria-label={city ? `Eligibl for ${city.placeName}` : 'Eligibl'}>
            <span className="cs-logo-e" aria-hidden="true">E</span>ligibl
          </div>
          <p className="cs-tagline">{city ? city.tagline : 'Federal & state aid — found fast. All 50 states.'}</p>
          <HelpedPill />
          {city && (
            <div className="cs-city">
              <p className="cs-city-name">{city.placeName}</p>
              <p>{city.intro}</p>
              <p>
                <a href={`tel:${city.contactPhone}`}>{city.contactPhone}</a>
                {' · '}
                {city.contactName}
                {' · '}
                {city.contactAddress}
              </p>
              <ul className="cs-city-icons">
                {city.services.map((service, index) => (
                  <li key={`${service.icon}-${index}`}>
                    <span aria-hidden="true"><CityIcon id={service.icon} /></span>
                    {service.label}
                  </li>
                ))}
              </ul>
              <p className="cs-city-note">{CITY_DISCLAIMER}</p>
            </div>
          )}
          {onOpenOffice && (
            <button type="button" className="cs-btn-office" onClick={onOpenOffice}>
              State offices — seed or support this
            </button>
          )}
          {onOpenAdmin && (
            <button type="button" className="cs-btn-office" onClick={onOpenAdmin}>
              City preview
            </button>
          )}
        </header>

        {/* Section Title */}
        <div className="cs-section-header">
          <div>
            <h1 className="cs-title" id="cs-heading">Find benefits by category</h1>
            <p className="cs-subtitle">
              Select at least one category to find benefits you may qualify for
              and information on how to apply. We'll ask which state you live in next.
            </p>
          </div>
          <button
            type="button"
            className={`cs-select-all ${allSelected ? 'cs-select-all--active' : ''}`}
            onClick={handleSelectAll}
            aria-label={allSelected ? 'Deselect all categories' : 'Select all categories'}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* Category Grid */}
        <div
          id="cs-main"
          className="cs-grid"
          role="group"
          aria-labelledby="cs-heading"
        >
          {CATEGORIES.map(category => {
            const isSelected = selected.has(category.id);
            return (
              <button
                key={category.id}
                type="button"
                className={`cs-card ${isSelected ? 'cs-card--selected' : ''}`}
                onClick={() => toggleCategory(category.id)}
                aria-pressed={isSelected}
                aria-label={`${category.label}${isSelected ? ' (selected)' : ''}`}
              >
                <div className="cs-card-icon" aria-hidden="true">{category.icon}</div>
                <span className="cs-card-label">{category.label}</span>
                {isSelected && (
                  <div className="cs-card-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection count */}
        {selected.size > 0 && (
          <p className="cs-count" aria-live="polite">
            {selected.size} {selected.size === 1 ? 'category' : 'categories'} selected
          </p>
        )}

        {/* Actions */}
        <div className="cs-actions">
          <button
            type="button"
            className="cs-btn-apply"
            onClick={handleApply}
            disabled={selected.size === 0}
            aria-label={selected.size === 0 ? 'Select at least one category to continue' : `Find programs in ${selected.size} selected ${selected.size === 1 ? 'category' : 'categories'}`}
          >
            Find programs
          </button>
          <button
            type="button"
            className="cs-btn-clear"
            onClick={handleClear}
            disabled={selected.size === 0}
            aria-label="Clear all selections"
          >
            Clear all
          </button>
        </div>

        {/* Map link */}
        {onOpenMap && (
          <div className="cs-map-link">
            <button type="button" className="cs-btn-map" onClick={onOpenMap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
              View NC Resource Map
            </button>
            {onOpenCamp && (
              <button type="button" className="cs-btn-map" onClick={onOpenCamp}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></svg>
                Public campgrounds and safe parking
              </button>
            )}
            <p className="cs-camp-note">
              Campgrounds are North Carolina State Parks sites with a published address.
              Safe parking is listed only when the program publishes the lot.
              Rest areas are not overnight parking.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
