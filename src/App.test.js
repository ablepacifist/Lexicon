import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// The app asks the server who is signed in before it shows any page. These tests answer that question
// themselves, so no server is needed.
function answerSessionCheck(user) {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/auth/me')) {
      return user
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(user) })
        : Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
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

  expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
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
  expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument();
});
