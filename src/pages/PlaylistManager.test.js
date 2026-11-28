import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlaylistManager, { mediaTitle, formatDate } from './PlaylistManager';
import { UserContext } from '../context/UserContext';

jest.mock('../utils/apiUrls', () => ({
  getApiUrls: () => ({ lexiconApiUrl: 'https://api.example.com' }),
}));

const API = 'https://api.example.com';
const me = { id: 7, username: 'alex' };

const PLAYLIST = { id: 3, name: 'Road trip', description: 'Long drives', isPublic: false, createdBy: 7,
  mediaType: 'MUSIC', itemCount: 1, createdDate: '2026-11-20T10:00:00' };
const IN_LIST = { id: 100, title: 'Already here', mediaType: 'MUSIC' };
const SONG_A = { id: 101, title: '', originalFilename: '20261127_160046_5744b36b_First_Song.mp3', mediaType: 'MUSIC' };
const SONG_B = { id: 102, title: 'Second Song', mediaType: 'MUSIC' };
const SONG_C = { id: 103, title: 'Third Song', mediaType: 'MUSIC' };
const A_VIDEO = { id: 200, title: 'Not music', mediaType: 'VIDEO' };

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => body });
}

/** A small fake of the playlist API that remembers what was added. */
function fakeServer() {
  const added = [];
  global.fetch = jest.fn((url, options = {}) => {
    const path = url.replace(API, '');
    if (path === '/api/playlists/user/7') return json([PLAYLIST]);
    if (path === '/api/playlists/public') return json([]);
    if (path === '/api/playlists/3') return json({ ...PLAYLIST, items: [{ mediaFile: IN_LIST }] });
    if (path === '/api/media/user/7') return json([IN_LIST, SONG_A, SONG_B, SONG_C, A_VIDEO]);
    if (path === '/api/media/public') return json([]);
    if (path.startsWith('/api/playlists/3/items') && options.method === 'POST') {
      added.push(JSON.parse(options.body).mediaFileId);
      return json({ success: true });
    }
    return json({});
  });
  return added;
}

function renderPage() {
  return render(
    <UserContext.Provider value={{ user: me, setUser: () => {} }}>
      <MemoryRouter><PlaylistManager /></MemoryRouter>
    </UserContext.Provider>,
  );
}

async function openAddWindow() {
  fireEvent.click(await screen.findByRole('button', { name: /Road trip/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add media' }));
  return screen.findByRole('dialog', { name: /Add media to Road trip/ });
}

afterEach(() => { delete global.fetch; });

test('a media file with no title is named from its file, without the upload stamp', () => {
  expect(mediaTitle(SONG_A)).toBe('First Song');
  expect(mediaTitle({ id: 5, title: '  Real title ' })).toBe('Real title');
  expect(mediaTitle({ id: 9 })).toBe('Untitled #9');
});

test('dates in either server form are shown, and nonsense is not', () => {
  expect(formatDate([2026, 11, 20, 10, 0])).toBe(new Date(2026, 10, 20).toLocaleDateString());
  expect(formatDate('2026-11-20T10:00:00')).not.toBe('');
  expect(formatDate('not a date')).toBe('');
  expect(formatDate(null)).toBe('');
});

test('the add window stays open after adding one item, and shows it as in the playlist', async () => {
  const added = fakeServer();
  renderPage();
  const dialog = await openAddWindow();

  fireEvent.click(await within(dialog).findByRole('button', { name: 'Add Second Song' }));

  await waitFor(() => expect(added).toEqual([102]));
  const stillOpen = screen.getByRole('dialog', { name: /Add media to Road trip/ });
  await waitFor(() => expect(within(stillOpen).getAllByText('In playlist')).toHaveLength(2));
});

test('several items can be ticked and added together, in one go', async () => {
  const added = fakeServer();
  renderPage();
  const dialog = await openAddWindow();

  fireEvent.click(await within(dialog).findByRole('checkbox', { name: /First Song/ }));
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /Third Song/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add 2' }));

  await waitFor(() => expect(added).toEqual([101, 103]));
  expect(screen.getByRole('dialog', { name: /Add media to Road trip/ })).toBeInTheDocument();
});

test('only media of the playlist type is offered, and what is already in it cannot be added again', async () => {
  fakeServer();
  renderPage();
  const dialog = await openAddWindow();

  await within(dialog).findByText('Second Song');
  expect(within(dialog).queryByText('Not music')).not.toBeInTheDocument();
  expect(within(dialog).getByRole('checkbox', { name: /Already here/ })).toBeDisabled();
});

test('Done closes the add window', async () => {
  fakeServer();
  renderPage();
  const dialog = await openAddWindow();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

  await waitFor(() => expect(screen.queryByRole('dialog', { name: /Add media to Road trip/ })).not.toBeInTheDocument());
});
