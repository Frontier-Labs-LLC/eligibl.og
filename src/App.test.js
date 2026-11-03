import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { resetCityStore } from './cityConfig';
import useOnboardingStore from './store/useOnboardingStore';

const nativeFetch = global.fetch;

beforeEach(async () => {
  localStorage.clear();
  resetCityStore();
  useOnboardingStore.getState().reset();
  document.documentElement.removeAttribute('data-theme');
  window.history.replaceState(null, '', '/');
  global.fetch = nativeFetch;
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
});

test('opens on the resident category check', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /state offices/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /public campgrounds/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /city preview/i })).not.toBeInTheDocument();
});

test('opens in dark mode without asking', () => {
  render(<App />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
});

test('/admin asks for Google before it shows usage', async () => {
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
  expect(screen.queryByRole('heading', { name: /find benefits by category/i })).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  expect(window.location.hash).toBe('');
});

test('a signed-in admin sees how many people tried the form', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/auth/me')) {
      return Promise.resolve(jsonResponse({ ok: true, email: 'owner@eligibl.org' }));
    }
    return Promise.resolve(jsonResponse({ ok: true, started: 4, completed: 1 }));
  });
  window.history.pushState(null, '', '/admin');
  render(<App />);

  expect(await screen.findByText(/owner@eligibl\.org/)).toBeInTheDocument();
  expect(await screen.findByText('Started the form')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /sign out/i })).toHaveAttribute('href', '/api/auth/logout');
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

test('the office address stays on the resident check', () => {
  window.location.hash = '#office';
  render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /seed the facts/i })).not.toBeInTheDocument();
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

test('the front page pill shows how many people tried the form', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true, started: 4, completed: 1 }));
  render(<App />);

  expect(await screen.findByRole('status')).toHaveTextContent('4 people have tried the form');
  expect(global.fetch).toHaveBeenCalledWith('/api/visitors', expect.objectContaining({ method: 'GET' }));
  expect(screen.queryByText('1')).not.toBeInTheDocument();
});

test('the pill stays hidden when the database count is unavailable', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText(/tried the form/i)).not.toBeInTheDocument();
});
