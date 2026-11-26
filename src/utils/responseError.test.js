import { errorMessage, NETWORK_ERROR, responseError } from './responseError';

const reply = (status, body) => ({ status, ok: status < 400, text: () => Promise.resolve(body) });

test("a short reason from a 4xx is the server's own words", async () => {
  expect(await responseError(reply(400, 'Playlist name already exists'), 'fallback')).toBe('Playlist name already exists');
});

test('a 5xx never shows its body', async () => {
  expect(await responseError(reply(500, 'NullPointerException at PlaylistService'), 'Could not save.')).toBe('Could not save.');
});

test('HTML pages, JSON errors, empty and long bodies fall back', async () => {
  expect(await responseError(reply(404, '<!DOCTYPE html><html>…'), 'fb')).toBe('fb');
  expect(await responseError(reply(400, '{"timestamp":"…","status":400}'), 'fb')).toBe('fb');
  expect(await responseError(reply(400, '   '), 'fb')).toBe('fb');
  expect(await responseError(reply(400, 'x'.repeat(161)), 'fb')).toBe('fb');
});

test('a fetch that never got an answer reads as a connection problem', () => {
  expect(errorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR);
  expect(errorMessage(new Error('Not enough candy'))).toBe('Not enough candy');
  expect(errorMessage(null, 'fb')).toBe('fb');
});
