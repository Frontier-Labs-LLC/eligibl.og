// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA polyfills fetch with an XHR shim that would hit the network for /api/visitors.
// Default to "counter not configured" so tests stay offline; tests override as needed.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: false,
    status: 503,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ ok: false, configured: false }),
  }));
});

jest.mock('react-leaflet', () => {
  const React = require('react');
  return {
    MapContainer: ({ children }) => React.createElement('div', null, children),
    TileLayer: () => null,
    Marker: ({ children }) => React.createElement('div', null, children),
    Popup: ({ children }) => React.createElement('div', null, children),
    useMap: () => ({ flyTo() {}, getZoom: () => 7 }),
  };
});

jest.mock('leaflet', () => ({
  Icon: { Default: { prototype: {}, mergeOptions() {} } },
  divIcon: () => ({}),
}));
