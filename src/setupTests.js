// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

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
