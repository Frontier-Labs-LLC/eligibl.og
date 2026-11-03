import { useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import NC_MAP_LOCATIONS from '../data/nc-map-data';
import './MapView.css';

// Fix default marker icon issue in react-leaflet + webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS = {
  food: '#16a34a',
  healthcare: '#2563eb',
  shelter: '#dc2626',
  housing: '#7c3aed',
  utilities: '#d97706',
  cash: '#059669',
  education: '#0891b2',
  childcare: '#db2777',
  veterans: '#4f46e5',
  social_services: '#64748b',
  community: '#ea580c',
  campground: '#0f766e',
  safe_parking: '#b45309',
};

const CATEGORY_LABELS = {
  food: 'Food & Nutrition',
  healthcare: 'Healthcare',
  shelter: 'Shelters',
  housing: 'Housing',
  utilities: 'Utilities',
  cash: 'Cash Assistance',
  education: 'Education & Jobs',
  childcare: 'Childcare',
  veterans: 'Veterans',
  social_services: 'Social Services',
  community: 'Community & Faith',
  campground: 'Campgrounds',
  safe_parking: 'Safe parking',
};

function createColoredIcon(color) {
  return L.divIcon({
    className: 'mv-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;"><div style="width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);"></div></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

/* ── helper: fly-to on command ─────────────────────────────── */
function FlyTo({ center, zoom }) {
  const map = useMap();
  const prev = useRef(null);
  if (center && (!prev.current || prev.current[0] !== center[0] || prev.current[1] !== center[1])) {
    prev.current = center;
    map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
  }
  return null;
}

export default function MapView({ onBack, initialCategories = [], city = null }) {
  /* ── state ─────────────────────────────────────────────────── */
  const [activeCategories, setActiveCategories] = useState(() => new Set(initialCategories)); // empty = all
  const [searchTerm, setSearchTerm] = useState('');
  const [showList, setShowList] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [geoStatus, setGeoStatus] = useState(''); // '', 'loading', 'denied', 'unavailable'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── derived ───────────────────────────────────────────────── */
  const source = useMemo(() => {
    if (!city || !city.placeNeedles || city.placeNeedles.length === 0) return NC_MAP_LOCATIONS;
    const needles = city.placeNeedles.map(name => name.toLowerCase());
    const local = NC_MAP_LOCATIONS.filter(loc => {
      const hay = `${loc.name} ${loc.address} ${loc.description}`.toLowerCase();
      return needles.some(name => hay.includes(name));
    });
    return local.length > 0 ? local : NC_MAP_LOCATIONS;
  }, [city]);

  const categories = useMemo(() => {
    const cats = new Set(source.map(l => l.category));
    return Array.from(cats).sort();
  }, [source]);

  // De-stack overlapping coordinates so markers don't pile on each other
  const deStacked = useMemo(() => {
    const seen = {};
    return source.map(loc => {
      const key = `${loc.lat},${loc.lng}`;
      if (!seen[key]) { seen[key] = 0; }
      const count = seen[key]++;
      if (count === 0) return loc;
      // spread duplicates in a small circle (~80m radius)
      const angle = (count * 137.5) * (Math.PI / 180); // golden angle
      const r = 0.0008;
      return { ...loc, lat: loc.lat + r * Math.cos(angle), lng: loc.lng + r * Math.sin(angle) };
    });
  }, [source]);

  const filtered = useMemo(() => {
    let list = deStacked;
    if (activeCategories.size > 0) {
      list = list.filter(l => activeCategories.has(l.category));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategories, searchTerm, deStacked]);

  const iconCache = useMemo(() => {
    const cache = {};
    Object.entries(CATEGORY_COLORS).forEach(([cat, color]) => {
      cache[cat] = createColoredIcon(color);
    });
    return cache;
  }, []);

  /* ── handlers ──────────────────────────────────────────────── */
  const toggleCategory = useCallback(cat => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategories(new Set());
    setSearchTerm('');
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFlyTarget([pos.coords.latitude, pos.coords.longitude]);
        setGeoStatus('');
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 }
    );
  }, []);

  const flyToLocation = useCallback(loc => {
    setFlyTarget([loc.lat, loc.lng]);
    setShowList(false);
  }, []);

  const hasActiveFilters = activeCategories.size > 0 || searchTerm.trim();
  const ncCenter = city && city.mapCenter ? city.mapCenter : [35.55, -79.39];
  const ncZoom = city && city.mapZoom ? city.mapZoom : 7;

  return (
    <div className="mv-page">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="mv-header">
        <div className="mv-header-left">
          <span className="mv-logo">
            <span className="mv-logo-e">e</span>ligibl
          </span>
          <span className="mv-title">Resource Map</span>
        </div>
        <div className="mv-header-actions">
          <button
            className={`mv-tool-btn ${showList ? 'mv-tool-btn--active' : ''}`}
            onClick={() => setShowList(v => !v)}
            title="Toggle list view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
            <span className="mv-tool-label">List</span>
          </button>
          <button
            className="mv-tool-btn"
            onClick={handleLocateMe}
            title="Find my location"
            disabled={geoStatus === 'loading'}
          >
            {geoStatus === 'loading' ? (
              <span className="mv-spin">⟳</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
            )}
            <span className="mv-tool-label">Near Me</span>
          </button>
          <button
            className="mv-sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle filters"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          </button>
          <button className="mv-back-btn" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      {/* ── GEO STATUS BANNER ─────────────────────────────── */}
      {geoStatus === 'denied' && (
        <div className="mv-banner mv-banner--warn" onClick={() => setGeoStatus('')}>
          Location access was denied. Enable it in your browser settings, then try again. <span className="mv-banner-x">✕</span>
        </div>
      )}
      {geoStatus === 'unavailable' && (
        <div className="mv-banner mv-banner--warn" onClick={() => setGeoStatus('')}>
          Geolocation is not available in this browser. <span className="mv-banner-x">✕</span>
        </div>
      )}

      {/* ── BODY ───────────────────────────────────────────── */}
      <div className={`mv-body ${showList ? 'mv-body--with-list' : ''}`}>
        {/* ── SIDEBAR ────────────────────────────────────── */}
        <div className={`mv-sidebar ${sidebarOpen ? 'mv-sidebar--open' : ''}`}>
          {/* Search */}
          <div className="mv-search-wrap">
            <svg className="mv-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="mv-search"
              type="text"
              placeholder="Search name, city, county…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="mv-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">✕</button>
            )}
          </div>

          {city && (
            <p className="mv-stay-note">
              Showing published places for {city.placeName}. Statewide places are still in the other version of this check.
            </p>
          )}

          <h3 className="mv-sidebar-title">Categories</h3>
          <p className="mv-sidebar-hint">Select one or more to filter</p>

          <div className="mv-cat-grid">
            {categories.map(cat => {
              const count = source.filter(l => l.category === cat).length;
              const isActive = activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  className={`mv-filter-chip ${isActive ? 'mv-filter-chip--active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                  style={isActive ? { borderColor: CATEGORY_COLORS[cat], background: CATEGORY_COLORS[cat] + '18' } : {}}
                >
                  <span className="mv-filter-dot" style={{ background: CATEGORY_COLORS[cat] || '#64748b' }} />
                  <span className="mv-filter-chip-label">{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="mv-filter-chip-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Active filter summary */}
          <div className="mv-filter-summary">
            <span className="mv-result-count">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {hasActiveFilters ? '' : ` of ${source.length}`}
            </span>
            {hasActiveFilters && (
              <button className="mv-clear-btn" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>

          <div className="mv-sidebar-legend">
            <p className="mv-sidebar-note">
              Click markers for details. Use filters or search to narrow results.
            </p>
          </div>
        </div>

        {/* ── MAP + LIST CONTAINER ──────────────────────── */}
        <div className="mv-main">
          <div className="mv-map-wrap">
            {/* floating result badge */}
            <div className="mv-map-badge">
              {filtered.length} location{filtered.length !== 1 ? 's' : ''}
            </div>

            <MapContainer center={ncCenter} zoom={ncZoom} className="mv-map" scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {flyTarget && <FlyTo center={flyTarget} zoom={13} />}
              {filtered.map(loc => (
                <Marker
                  key={loc.id}
                  position={[loc.lat, loc.lng]}
                  icon={iconCache[loc.category] || iconCache['social_services']}
                >
                  <Popup maxWidth={300}>
                    <div className="mv-popup">
                      <h4 className="mv-popup-name">{loc.name}</h4>
                      <span className="mv-popup-cat" style={{ background: CATEGORY_COLORS[loc.category] || '#64748b' }}>
                        {CATEGORY_LABELS[loc.category] || loc.category}
                      </span>
                      <p className="mv-popup-desc">{loc.description}</p>
                      <p className="mv-popup-addr">📍 {loc.address}</p>
                      {loc.phone && (
                        <p className="mv-popup-phone">
                          📞 <a href={`tel:${loc.phone}`}>{loc.phone}</a>
                        </p>
                      )}
                      {loc.website && (
                        <a href={loc.website} target="_blank" rel="noopener noreferrer" className="mv-popup-link">
                          Visit Website →
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* ── LIST VIEW PANEL ─────────────────────────── */}
          {showList && (
            <div className="mv-list-panel">
              <div className="mv-list-header">
                <h3 className="mv-list-title">
                  {filtered.length} Location{filtered.length !== 1 ? 's' : ''}
                </h3>
                <button className="mv-list-close" onClick={() => setShowList(false)} aria-label="Close list">✕</button>
              </div>
              <div className="mv-list-body">
                {filtered.length === 0 && (
                  <p className="mv-list-empty">No locations match your filters.</p>
                )}
                {filtered.map(loc => (
                  <button key={loc.id} className="mv-list-card" onClick={() => flyToLocation(loc)}>
                    <span className="mv-list-dot" style={{ background: CATEGORY_COLORS[loc.category] || '#64748b' }} />
                    <div className="mv-list-info">
                      <span className="mv-list-name">{loc.name}</span>
                      <span className="mv-list-addr">{loc.address}</span>
                    </div>
                    <span className="mv-list-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
