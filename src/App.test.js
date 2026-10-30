import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import NC_PROGRAMS from './data/nc-programs';
import NC_CAMP_PARKING from './data/nc-camp-parking';
import { resetCityStore } from './cityConfig';
import useOnboardingStore from './store/useOnboardingStore';

beforeEach(() => {
  localStorage.clear();
  resetCityStore();
  useOnboardingStore.getState().reset();
  document.documentElement.removeAttribute('data-theme');
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

test('opens in dark mode without asking', () => {
  render(<App />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
});

test('a Charlotte preview is configured from the admin route', () => {
  window.location.hash = '#admin';
  render(<App />);

  expect(screen.getByRole('heading', { name: /configure the charlotte preview/i })).toBeInTheDocument();
  expect(screen.getByText(/not an official city of charlotte system/i)).toBeInTheDocument();

  const phone = screen.getByLabelText(/office phone/i);
  userEvent.clear(phone);
  userEvent.type(phone, '980-314-5501');
  userEvent.click(screen.getByRole('button', { name: /show the charlotte version/i }));

  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  expect(screen.getByText('City of Charlotte')).toBeInTheDocument();
  expect(screen.getByText('980-314-5501')).toBeInTheDocument();
  expect(screen.getByText(/not an official city of charlotte system/i)).toBeInTheDocument();
});

test('the charlotte address opens that preview', () => {
  window.location.hash = '#charlotte';
  render(<App />);
  expect(screen.getByText('City of Charlotte')).toBeInTheDocument();
  expect(screen.getByText(/301 Billingsley Rd/i)).toBeInTheDocument();
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  };
}

function startTheCheck() {
  userEvent.click(screen.getByRole('button', { name: /^food/i }));
  userEvent.click(screen.getByRole('button', { name: /find programs in 1 selected category/i }));
}

test('the form asks which state you live in before anything else', () => {
  render(<App />);
  startTheCheck();

  expect(screen.getByRole('heading', { name: /your location/i })).toBeInTheDocument();
  const picker = screen.getByRole('combobox', { name: /your state/i });
  expect(screen.getAllByRole('option')).toHaveLength(52); // placeholder + 50 states + DC
  expect(screen.getByRole('option', { name: 'Wyoming' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue to step 2/i })).toBeDisabled();

  userEvent.selectOptions(picker, 'TX');
  expect(screen.getByText(/Texas: we'll check 6 Texas programs plus/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue to step 2/i })).toBeEnabled();
});

test('a Texas resident gets Texas programs and no North Carolina map', async () => {
  render(<App />);
  startTheCheck();
  userEvent.selectOptions(screen.getByRole('combobox', { name: /your state/i }), 'TX');
  userEvent.click(screen.getByRole('button', { name: /continue to step 2/i }));

  userEvent.type(screen.getByPlaceholderText('e.g. 34'), '34');
  userEvent.click(screen.getByRole('button', { name: /^U\.S\. Citizen/ }));
  userEvent.click(screen.getByRole('button', { name: /continue to step 3/i }));
  userEvent.click(screen.getByRole('button', { name: /continue to step 4/i }));

  userEvent.type(screen.getByPlaceholderText('0'), '1800');
  userEvent.click(screen.getByRole('button', { name: /continue to step 5/i }));
  userEvent.click(screen.getByRole('button', { name: /continue to step 6/i }));
  userEvent.click(screen.getByRole('button', { name: /find my programs/i }));

  expect(await screen.findByText(/based on your answers for Texas/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^SNAP Food Benefits$/ })).toBeInTheDocument();
  expect(screen.queryByText(/NC Medicaid/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /view nc resource map/i })).not.toBeInTheDocument();
});

test('the front page shows how many people have used the check', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true, started: 12345, completed: 9000 }));
  render(<App />);
  expect(await screen.findByText('12,345')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/people have used eligibl\.org to find aid programs/i);
  expect(global.fetch).toHaveBeenCalledWith('/api/visitors', expect.objectContaining({ method: 'GET' }));

  startTheCheck();
  const posts = global.fetch.mock.calls.filter(([, options]) => options && options.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(JSON.parse(posts[0][1].body)).toMatchObject({ event: 'started' });
});

test('the pill stays hidden when the counter is not available', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(global.fetch).toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('the brief can return to the resident check', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /state offices/i }));
  userEvent.click(screen.getByRole('button', { name: /run the resident check/i }));
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
});
