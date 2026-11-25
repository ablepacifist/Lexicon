// Calls to Alchemy that prove who the caller is.
//
// Alchemy used to trust whatever playerId it was sent. Each request now carries a fresh
// single-use Lexicon SSO token (X-Lexicon-Sso), which Alchemy trades with Lexicon for the
// signed-in player and checks against the playerId. If the token cannot be minted, or
// Alchemy answers 401, the Lexicon session has lapsed and the app is told once.
import { getApiUrls } from './apiUrls';
import { identityHeaders } from './lexiconIdentity';
import { notifySessionExpired } from './session';

const { alchemyApiUrl } = getApiUrls();

export async function alchemyFetch(path, init = {}) {
  let headers;
  try {
    headers = await identityHeaders(init.headers || {});
  } catch {
    notifySessionExpired();
    throw new Error('Your session has expired. Please sign in again.');
  }
  const response = await fetch(`${alchemyApiUrl}${path}`, { ...init, headers });
  if (response.status === 401) notifySessionExpired();
  return response;
}

/**
 * A message safe to show a player. Alchemy's errors are short sentences on a 400; a 500
 * carries a stack-ish detail that is not for them.
 */
export async function alchemyError(response, fallback) {
  if (response.status >= 500) return fallback;
  try {
    const text = (await response.text()).trim();
    if (text && text.length <= 160 && !text.startsWith('<')) return text;
  } catch {
    /* fall through */
  }
  return fallback;
}
