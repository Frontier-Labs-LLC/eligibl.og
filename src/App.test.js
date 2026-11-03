import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import NC_PROGRAMS from './data/nc-programs';
import NC_CAMP_PARKING from './data/nc-camp-parking';
import { resetCityStore } from './cityConfig';
import useOnboardingStore from './store/useOnboardingStore';

beforeEach(async () => {
  localStorage.clear();
  resetCityStore();
  useOnboardingStore.getState().reset();
  document.documentElement.removeAttribute('data-theme');
  window.history.replaceState(null, '', '/');
  // jsdom fires popstate on a timer when this replaces a hash URL. Let it
  // finish before the next screen is open, or it will wipe that screen.
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 404,
    headers: { get: () => '' },
    json: () => Promise.resolve({}),
  });
});

test('opens on the resident check', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /see which aid you may qualify for/i })).toBeInTheDocument();
  expect(screen.getByText(/you do not need to pick a reason/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /find benefits by category/i })).not.toBeInTheDocument();
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

test('the resource map stays off the check until every state has places', () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: /public campgrounds and safe parking/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /view nc resource map/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /open the nc map/i })).not.toBeInTheDocument();
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

function signIn(visitor) {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/auth/me')) {
      return Promise.resolve(jsonResponse({ ok: true, email: 'owner@eligibl.org' }));
    }
    return Promise.resolve(visitor);
  });
  window.history.pushState(null, '', '/admin');
}

test('a Charlotte preview is configured from the admin route', async () => {
  signIn(jsonResponse({ ok: true }));
  render(<App />);

  expect(await screen.findByRole('heading', { name: /configure the charlotte preview/i })).toBeInTheDocument();
  expect(screen.getByText(/not an official city of charlotte system/i)).toBeInTheDocument();

  const phone = screen.getByLabelText(/office phone/i);
  userEvent.clear(phone);
  userEvent.type(phone, '980-314-5501');
  userEvent.click(screen.getByRole('button', { name: /show the charlotte version/i }));

  expect(screen.getByRole('heading', { name: /see which aid you may qualify for/i })).toBeInTheDocument();
  expect(screen.getByText('City of Charlotte')).toBeInTheDocument();
  expect(screen.getByText('980-314-5501')).toBeInTheDocument();
  expect(screen.getByText(/not an official city of charlotte system/i)).toBeInTheDocument();
});

test('the charlotte address opens that preview', () => {
  window.location.hash = '#charlotte';
  render(<App />);
  expect(screen.getByText('City of Charlotte')).toBeInTheDocument();
  expect(screen.getByText(/3205 Freedom Dr/i)).toBeInTheDocument();
  expect(screen.getByText('980-314-8400')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /your state/i })).toHaveValue('NC');
  expect(screen.getByRole('button', { name: /continue to step 2/i })).toBeEnabled();
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  };
}

test('the form asks which state you live in before anything else', () => {
  render(<App />);

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

test('the front page does not show a visitor count', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true, started: 12345, completed: 9000 }));
  render(<App />);
  expect(screen.getByRole('heading', { name: /see which aid you may qualify for/i })).toBeInTheDocument();
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(screen.queryByText(/people have used/i)).not.toBeInTheDocument();
  expect(screen.queryByText('12,345')).not.toBeInTheDocument();
});

test('/admin asks for Google before it shows counts', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ ok: false }),
  });
  window.history.pushState(null, '', '/admin');
  render(<App />);

  const link = await screen.findByRole('link', { name: /sign in with google/i });
  expect(link).toHaveAttribute('href', '/api/auth/google');
  expect(screen.queryByRole('heading', { name: /^usage$/i })).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  expect(window.location.hash).toBe('');
});

test('the old #admin address becomes /admin', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ ok: false }),
  });
  window.location.hash = '#admin';
  render(<App />);

  expect(await screen.findByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  expect(window.location.hash).toBe('');
});

test('admin shows the live visitor counts and nothing else', async () => {
  signIn(jsonResponse({ ok: true, started: 4, completed: 1 }));
  render(<App />);

  expect(await screen.findByRole('heading', { name: /^usage$/i })).toBeInTheDocument();
  expect(await screen.findByText('Started the form')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('Finished and saw programs')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText(/25% of the people who started also finished/i)).toBeInTheDocument();
  expect(screen.queryByText(/people have used eligibl/i)).not.toBeInTheDocument();
});

test('admin names the env vars when the counter is not connected', async () => {
  signIn({
    ok: false,
    status: 503,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ ok: false, configured: false }),
  });
  render(<App />);

  expect(await screen.findByText(/KV_REST_API_URL/)).toBeInTheDocument();
  expect(screen.getByText(/UPSTASH_REDIS_REST_URL/)).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test('a state is enough to see programs, then the help survey', async () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: /see my programs/i })).not.toBeInTheDocument();
  userEvent.selectOptions(screen.getByRole('combobox', { name: /your state/i }), 'NC');
  userEvent.click(screen.getByRole('button', { name: /see my programs/i }));

  expect(await screen.findByRole('heading', { name: /did this help/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /you may qualify for/i })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: /yes, it helped/i }));
  userEvent.click(screen.getByRole('button', { name: /i know what to apply for/i }));
  expect(screen.getByText(/that answer is the number we bring back/i)).toBeInTheDocument();
});

test('admin shows page hits and where people clicked', async () => {
  signIn(jsonResponse({
    ok: true,
    started: 140,
    completed: 10,
    pages: {
      'step-1': { hits: 150, uniques: 140 },
      results: { hits: 10, uniques: 10 },
    },
    clicks: { 'step-1': { 'see-my-programs': 12 } },
    heat: { 'step-1': { '2:3': 8 } },
    survey: { 'helped-yes': 6, 'why-knew-next': 4 },
  }));
  render(<App />);

  expect(await screen.findByText(/10 of 150 hits on the first page reached the results/i)).toBeInTheDocument();
  expect(screen.getAllByText(/150/).length).toBeGreaterThan(0);
  expect(screen.getByText('see-my-programs')).toBeInTheDocument();
  expect(screen.getByText('Said it helped')).toBeInTheDocument();
  expect(screen.getByText('6')).toBeInTheDocument();
});

test('the brief can return to the resident check', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /state offices/i }));
  userEvent.click(screen.getByRole('button', { name: /run the resident check/i }));
  expect(screen.getByRole('heading', { name: /see which aid you may qualify for/i })).toBeInTheDocument();
});
