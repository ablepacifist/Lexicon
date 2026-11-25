// One way to notice a signed-out session, instead of each page guessing.
//
// Before this, an expired session looked different everywhere: the video player sent
// you to /login, Alchemy quietly showed an empty bag, Events said "failed to load", and
// the Pokémon pages bounced back to the map. authFetch reports a 401 once, and
// AppRoutes answers it the same way every time: clear the user and go to /login,
// remembering where they were.

export const SESSION_EXPIRED_EVENT = 'lexicon:session-expired';

export function notifySessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/**
 * fetch() that sends the session cookie and reports a 401.
 * Callers still get the response and handle any other status themselves.
 */
export async function authFetch(input, init = {}) {
  const response = await fetch(input, { credentials: 'include', ...init });
  if (response.status === 401) notifySessionExpired();
  return response;
}

export default authFetch;
