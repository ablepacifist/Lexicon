import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import Profile from './Profile';

jest.mock('../hooks/useAvatar', () => ({
  useAvatar: () => ({ avatarUrl: null, uploadAvatar: jest.fn(), removeAvatar: jest.fn() }),
}));
jest.mock('./NotificationSettings', () => () => null);
jest.mock('../utils/alchemyApi', () => ({
  alchemyFetch: jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })),
  alchemyError: jest.fn(() => Promise.resolve('error')),
}));

afterEach(() => { delete global.fetch; });

function renderProfile(setUser) {
  return render(
    <UserContext.Provider value={{ user: { id: 7, username: 'alice' }, setUser }}>
      <MemoryRouter><Profile /></MemoryRouter>
    </UserContext.Provider>,
  );
}

test('logging out ends the session on the server, then signs out here', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
  const setUser = jest.fn();
  renderProfile(setUser);

  fireEvent.click(await screen.findByRole('button', { name: /logout/i }));

  await waitFor(() => expect(setUser).toHaveBeenCalledWith(null));
  const logout = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/api/auth/logout'));
  expect(logout).toBeDefined();
  expect(logout[1]).toEqual(expect.objectContaining({ method: 'POST', credentials: 'include' }));
});

test('logging out still signs out here when the server cannot be reached', async () => {
  global.fetch = jest.fn((url) => (String(url).endsWith('/api/auth/logout')
    ? Promise.reject(new TypeError('Failed to fetch'))
    : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })));
  const setUser = jest.fn();
  renderProfile(setUser);

  fireEvent.click(await screen.findByRole('button', { name: /logout/i }));

  await waitFor(() => expect(setUser).toHaveBeenCalledWith(null));
});
