import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import NC_PROGRAMS from './data/nc-programs';

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

test('the brief can return to the resident check', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: /state offices/i }));
  userEvent.click(screen.getByRole('button', { name: /run the resident check/i }));
  expect(screen.getByRole('heading', { name: /find benefits by category/i })).toBeInTheDocument();
});
