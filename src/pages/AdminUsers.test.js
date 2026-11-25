import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import { UserContext } from '../context/UserContext';

jest.mock('../components/Navbar', () => () => null);
jest.mock('../utils/apiUrls', () => ({
  getApiUrls: () => ({ lexiconApiUrl: 'https://api.example.com' }),
}));

const API = 'https://api.example.com';
const admin = { id: 1, username: 'zx', role: 'ADMIN', permissions: ['MANAGE_USERS'] };
const player = { id: 2, username: 'bob', role: 'USER', permissions: [] };

// Shaped like Lexicon's GET /api/admin/users: every label and decision is the server's.
const USERS = {
  status: 200, success: true, sort: 'inactive',
  sorts: [{ key: 'inactive', label: 'Longest unused first' }, { key: 'storage', label: 'Most storage first' }],
  totals: { accounts: 2, inactive: 1, inactiveLabel: '1 not used in 45+ days (or never recorded)', storageBytes: 1, storage: '3.0 GB' },
  users: [
    { id: 2, username: 'bob', role: 'USER', isYou: false, registered: '2026-01-29', lastLogin: '2026-05-09', lastSeen: '2026-05-09',
      lastSeenAgo: '6 months ago', inactiveDays: 200, inactiveLevel: 'danger', uploadCount: 2, storage: '3.0 GB',
      canDelete: true, deleteBlockedReason: null, canSetPassword: true },
    { id: 1, username: 'zx', role: 'ADMIN', isYou: true, registered: 'Unknown', lastLogin: 'Unknown', lastSeen: '2026-11-25',
      lastSeenAgo: 'Today', inactiveDays: 0, inactiveLevel: 'ok', uploadCount: 0, storage: '0 B',
      canDelete: false, deleteBlockedReason: 'This is your own account.', canSetPassword: true },
  ],
};
const UPLOADS = {
  status: 200, success: true, sort: 'oldest', ownerId: 2, ownerName: 'bob',
  sorts: [{ key: 'oldest', label: 'Oldest first' }, { key: 'largest', label: 'Largest first' }],
  totals: { count: 1, storageBytes: 1, storage: '3.0 GB', orphans: 0, orphansLabel: '' },
  uploads: [{ kind: 'media', id: 10, title: 'Twilight', type: 'Audiobook', ownerId: 2, owner: 'bob', ownerMissing: false,
    uploaded: '2026-03-20', uploadedAgo: '8 months ago', size: '3.0 GB', visibility: 'Private' }],
};

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => body });
}

function renderAs(user) {
  return render(
    <UserContext.Provider value={{ user, setUser: () => {} }}>
      <MemoryRouter><AdminUsers /></MemoryRouter>
    </UserContext.Provider>,
  );
}

afterEach(() => { delete global.fetch; });

/** The table row that shows `text`. */
const rowWith = (text) => screen.getAllByRole('row').find((r) => within(r).queryByText(text));

test('a non-admin sees no data and nothing is fetched', () => {
  global.fetch = jest.fn();
  renderAs(player);
  expect(screen.getByText('Admins only')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('accounts are shown exactly as the server sends them', async () => {
  global.fetch = jest.fn(() => json(USERS));
  renderAs(admin);
  expect(await screen.findByText('6 months ago')).toBeInTheDocument();
  expect(screen.getByText('1 not used in 45+ days (or never recorded)')).toBeInTheDocument();
  const bobRow = rowWith('bob');
  expect(bobRow).toHaveClass('level-danger');
  const myRow = rowWith('zx');
  const myDelete = within(myRow).getByRole('button', { name: 'Delete' });
  expect(myDelete).toBeDisabled();
  expect(myDelete).toHaveAttribute('title', 'This is your own account.');
});

test('changing the sort asks the server for that order', async () => {
  global.fetch = jest.fn(() => json(USERS));
  renderAs(admin);
  fireEvent.change(await screen.findByLabelText('Sort'), { target: { value: 'storage' } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`${API}/api/admin/users?sort=storage`, expect.anything()));
});

test('deleting an account sends what was typed and shows the server answer', async () => {
  const calls = [];
  global.fetch = jest.fn((url, init = {}) => {
    calls.push({ url, init });
    if (init.method === 'DELETE') {
      const typed = JSON.parse(init.body).confirmUsername;
      return typed === 'bob'
        ? json({ status: 200, success: true, message: 'Deleted bob: 1 upload, 1 chat image, 0 playlists. Freed 3.0 GB.' })
        : json({ status: 400, success: false, message: 'Type the username exactly to confirm.' }, 400);
    }
    return json(USERS);
  });
  renderAs(admin);
  const bobRow = (await screen.findByText('bob'), rowWith('bob'));
  fireEvent.click(within(bobRow).getByRole('button', { name: 'Delete' }));

  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText(/to confirm/), { target: { value: 'Bob' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete account/ }));
  expect(await within(dialog).findByText('Type the username exactly to confirm.')).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText(/to confirm/), { target: { value: 'bob' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete account/ }));
  expect(await screen.findByText('Deleted bob: 1 upload, 1 chat image, 0 playlists. Freed 3.0 GB.')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const del = calls.filter((c) => c.init.method === 'DELETE');
  expect(del.map((c) => c.url)).toEqual([`${API}/api/admin/users/2`, `${API}/api/admin/users/2`]);
});

test("an account's uploads open filtered to that owner, and can be deleted", async () => {
  global.fetch = jest.fn((url, init = {}) => {
    if (init.method === 'DELETE') return json({ status: 200, success: true, message: 'Deleted. Freed 3.0 GB.' });
    if (url.includes('/uploads')) return json(UPLOADS);
    return json(USERS);
  });
  renderAs(admin);
  const bobRow = (await screen.findByText('bob'), rowWith('bob'));
  fireEvent.click(within(bobRow).getByRole('button', { name: 'Uploads' }));

  expect(await screen.findByText('Twilight')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${API}/api/admin/users/uploads?ownerId=2`, expect.anything());
  expect(screen.getByText("Only bob's uploads")).toBeInTheDocument();

  fireEvent.click(within(rowWith('Twilight')).getByRole('button', { name: 'Delete' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete (3.0 GB)' }));
  expect(await screen.findByText('Deleted. Freed 3.0 GB.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${API}/api/admin/users/uploads/media/10`, expect.objectContaining({ method: 'DELETE' }));
});

test('a refused password shows the server reason in the dialog', async () => {
  global.fetch = jest.fn((url, init = {}) => (init.method === 'PUT'
    ? json({ status: 400, success: false, message: 'The password must be at least 8 characters.' }, 400)
    : json(USERS)));
  renderAs(admin);
  const bobRow = (await screen.findByText('bob'), rowWith('bob'));
  fireEvent.click(within(bobRow).getByRole('button', { name: 'Set password' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'short' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Set password' }));
  expect(await within(dialog).findByText('The password must be at least 8 characters.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${API}/api/admin/users/2/password`,
    expect.objectContaining({ method: 'PUT', body: JSON.stringify({ password: 'short' }) }));
});

const STORAGE = {
  status: 200, success: true,
  summary: '2 files (3.0 KB) are on the drive but in no upload.',
  orphans: [
    { path: 'music/compressed/forgotten.mp3', sizeBytes: 3000, size: '2.9 KB', modified: '2025-01-01' },
    { path: 'chat-uploads/stray.png', sizeBytes: 70, size: '70 B', modified: '2026-10-26' },
  ],
  orphanCount: 2, orphanBytes: 3070, orphanSize: '3.0 KB', missing: [],
  scannedFiles: 7, scannedSize: '13 KB', referencedRows: 3, recentSkipped: 1,
  checkedFolders: ['audiobooks', 'music', 'videos', 'other', 'chat-uploads'], skippedFolders: ['temp', 'torrents', 'backups'],
  canClean: true, cleanBlockedReason: null,
};

test('the storage check lists unused files and deletes exactly the ones the server reported', async () => {
  global.fetch = jest.fn((url, init = {}) => {
    if (url.endsWith('/storage-check/clean')) return json({ status: 200, success: true, message: 'Deleted 2 files, freed 3.0 KB.' });
    if (url.endsWith('/storage-check')) return json(STORAGE);
    return json(USERS);
  });
  renderAs(admin);
  fireEvent.click(await screen.findByRole('tab', { name: 'Storage check' }));
  expect(await screen.findByText('2 files (3.0 KB) are on the drive but in no upload.')).toBeInTheDocument();
  expect(screen.getByText('music/compressed/forgotten.mp3')).toBeInTheDocument();
  expect(screen.getByText(/1 file\(s\) changed in the last day are left alone/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Delete 2 file(s) (3.0 KB)' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete (3.0 KB)' }));
  expect(await screen.findByText('Deleted 2 files, freed 3.0 KB.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${API}/api/admin/users/storage-check/clean`, expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ paths: ['music/compressed/forgotten.mp3', 'chat-uploads/stray.png'] }),
  }));
});

test('a blocked storage check explains why and offers no delete', async () => {
  global.fetch = jest.fn((url) => (url.endsWith('/storage-check')
    ? json({ ...STORAGE, canClean: false, cleanBlockedReason: '5 uploads cannot find their file on the drive.',
      missing: [{ id: 9, title: 'Gone', path: 'videos/original/gone.mp4' }] })
    : json(USERS)));
  renderAs(admin);
  fireEvent.click(await screen.findByRole('tab', { name: 'Storage check' }));
  expect(await screen.findByText('5 uploads cannot find their file on the drive.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Delete 2 file/ })).toBeDisabled();
  expect(screen.getByText('videos/original/gone.mp4')).toBeInTheDocument();
});
