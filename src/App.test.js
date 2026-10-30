import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
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
  expect(screen.queryByRole('button', { name: /state offices/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /public campgrounds/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /city preview/i })).not.toBeInTheDocument();
});

test('opens in dark mode without asking', () => {
  render(<App />);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
});

test('the admin and office addresses stay on the resident check', () => {
  window.location.hash = '#admin';
  const { unmount } = render(<App />);
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /configure the charlotte preview/i })).not.toBeInTheDocument();
  unmount();

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
