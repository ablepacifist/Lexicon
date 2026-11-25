import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/Navbar', () => () => null);

// The app asks the server who is signed in before it shows any page. These tests answer that question
// themselves, so no server is needed.
function answerSessionCheck(user) {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/auth/me')) {
      return user
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(user) })
        : Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
    }
    if (String(url).includes('/api/media/storage-info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ volumes: [] }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
  });
}

afterEach(() => {
  delete global.fetch;
  window.history.pushState({}, '', '/');
});

test('a visitor who is not signed in sees the landing page', async () => {
  answerSessionCheck(null);
  window.history.pushState({}, '', '/');

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Alex Dyakin' })).toBeInTheDocument();
});

test('a private page sends a visitor who is not signed in to the login form', async () => {
  answerSessionCheck(null);
  window.history.pushState({}, '', '/lexicon-dashboard');

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('the printer monitor requires a signed-in user', async () => {
  answerSessionCheck(null);
  window.history.pushState({}, '', '/printer-monitor');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('the app checks the session with the login cookie attached', async () => {
  answerSessionCheck(null);

  render(<App />);

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  const [url, options] = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/auth/me'));
  expect(String(url)).toMatch(/\/api\/auth\/me$/);
  expect(options.credentials).toBe('include');
});

test('a signed-in visitor can open a private page', async () => {
  answerSessionCheck({ id: 7, username: 'alice', displayName: 'Alice' });
  window.history.pushState({}, '', '/app-selector');

  render(<App />);

  await waitFor(() => expect(window.location.pathname).toBe('/app-selector'));
  expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
});

test('the projects page button opens the protected printer monitor', async () => {
  answerSessionCheck(null);
  window.history.pushState({}, '', '/projects');
  render(<App />);
  const button = await screen.findByRole('button', { name: /open printer monitor/i });
  fireEvent.click(button);
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('the Lexicon dashboard does not show the printer', async () => {
  answerSessionCheck({ id: 7, username: 'alice', displayName: 'Alice' });
  window.history.pushState({}, '', '/lexicon-dashboard');
  render(<App />);
  await screen.findByText('Lexicon Media Center');
  expect(screen.queryByText(/3D Printer/i)).not.toBeInTheDocument();
  const hrefs = screen.queryAllByRole('link').map((a) => a.getAttribute('href'));
  expect(hrefs).not.toContain('/printer-monitor');
});
