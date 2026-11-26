import { toSessionUser, hasPermission } from './sessionUser';

test('keeps the role and permissions Lexicon sent', () => {
  const u = toSessionUser({ id: 1, username: 'zx', displayName: 'zx', role: 'ADMIN', permissions: ['VOICE_ADMIN'] });
  expect(u).toEqual({ id: 1, username: 'zx', displayName: 'zx', role: 'ADMIN', permissions: ['VOICE_ADMIN'] });
  expect(hasPermission(u, 'VOICE_ADMIN')).toBe(true);
  expect(hasPermission(u, 'HOLDFAST_DELETE')).toBe(false);
});

test('an older server without permissions means none', () => {
  const u = toSessionUser({ id: 2, username: 'p', displayName: 'p' });
  expect(u.role).toBe('USER');
  expect(u.permissions).toEqual([]);
  expect(hasPermission(null, 'VOICE_ADMIN')).toBe(false);
  expect(hasPermission(undefined, 'VOICE_ADMIN')).toBe(false);
});
