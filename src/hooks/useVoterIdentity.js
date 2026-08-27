import { useState, useEffect, useCallback } from 'react';

const GUEST_TOKEN_KEY = 'lexicon_guest_token';
const GUEST_NAME_KEY = 'lexicon_guest_name';

const NOOP = () => {};

/**
 * Resolves a stable "voter identity" for the Events/Polls feature.
 *  - Logged in (user truthy): voterKey = "u:" + user.id, voterName = user.displayName || user.username.
 *    setGuestName is a no-op — logged-in identity comes from the account, not localStorage.
 *  - Guest (user falsy): voterKey = "g:" + crypto.randomUUID(), minted on first render and
 *    persisted to localStorage immediately (stable even before a name is set), so a returning
 *    guest keeps editing the same votes without re-entering their name. voterName comes from the
 *    stored guest name and may be empty/null until the caller prompts for one via setGuestName.
 *
 * `user` is passed in by the caller (from UserContext) rather than read directly here, so this
 * hook has no dependency on UserContext itself.
 */
export function useVoterIdentity(user) {
  const [guestToken, setGuestToken] = useState(() =>
    user ? null : localStorage.getItem(GUEST_TOKEN_KEY)
  );
  const [guestName, setGuestNameState] = useState(() =>
    user ? null : localStorage.getItem(GUEST_NAME_KEY)
  );

  // First-ever visit as a guest: mint a stable token immediately, before any name is set.
  useEffect(() => {
    if (user || guestToken) return;
    const token = `g:${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_TOKEN_KEY, token);
    setGuestToken(token);
  }, [user, guestToken]);

  const setGuestName = useCallback((name) => {
    const trimmed = (name || '').trim();
    localStorage.setItem(GUEST_NAME_KEY, trimmed);
    setGuestNameState(trimmed);
  }, []);

  if (user) {
    return {
      voterKey: `u:${user.id}`,
      voterName: user.displayName || user.username,
      isGuest: false,
      setGuestName: NOOP,
    };
  }

  return {
    voterKey: guestToken,
    voterName: guestName,
    isGuest: true,
    setGuestName,
  };
}
