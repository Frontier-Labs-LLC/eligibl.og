import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import NC_PROGRAMS from './data/nc-programs';
import NC_CAMP_PARKING from './data/nc-camp-parking';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

test('opens on the resident category check', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /state offices/i })).toBeInTheDocument();
});

test('state office brief asks North Carolina to seed, using the live catalog', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /state offices/i }));

  expect(screen.getByRole('heading', { name: /seed the facts/i })).toBeInTheDocument();
  expect(screen.getByText(/NCDHHS/i)).toBeInTheDocument();
  expect(screen.getByText(/not a decision/i)).toBeInTheDocument();
  expect(screen.getByText(String(NC_PROGRAMS.length))).toBeInTheDocument();
  expect(screen.getByRole('rowheader', { name: /work first/i })).toBeInTheDocument();
  expect(screen.getAllByText(/draft\. not supplied by your office/i).length).toBeGreaterThan(0);
});

test('public campgrounds and safe parking open on the map', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /public campgrounds and safe parking/i }));

  expect(screen.getByText(/Father's Storehouse safe parking/i)).toBeInTheDocument();
  expect(screen.getByText(/Carolina Beach State Park/i)).toBeInTheDocument();
  expect(screen.getByText(/NCDOT rest areas and welcome centers are not overnight parking/i)).toBeInTheDocument();
  expect(screen.queryByText(/Food Bank of Central/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Cole Mill Access/i)).not.toBeInTheDocument();
  expect(NC_CAMP_PARKING.filter((place) => place.category === 'campground').length).toBeGreaterThan(40);
  expect(NC_CAMP_PARKING.filter((place) => place.category === 'safe_parking')).toHaveLength(1);
  NC_CAMP_PARKING.forEach((place) => {
    expect(place.lat).toBeGreaterThan(33.7);
    expect(place.lat).toBeLessThan(36.7);
    expect(place.lng).toBeLessThan(-75.3);
    expect(place.lng).toBeGreaterThan(-84.4);
    expect(place.address).toMatch(/NC/);
  });
});

test('the brief can return to the resident check', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /state offices/i }));
  userEvent.click(screen.getByRole('button', { name: /run the resident check/i }));
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
});
