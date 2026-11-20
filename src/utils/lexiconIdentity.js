// Proves to another backend (Alchemy) who the signed-in Lexicon user is.
//
// Lexicon mints a single-use, 60-second SSO token for the current session; the other server trades it
// back with Lexicon for the user's id and permissions. Fetch a fresh token for every protected request.
import { getApiUrls } from './apiUrls';

export const SSO_HEADER = 'X-Lexicon-Sso';

export async function getSsoToken() {
  const { lexiconApiUrl } = getApiUrls();
  const res = await fetch(`${lexiconApiUrl}/api/auth/sso/generate-token`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  const data = await res.json();
  return data.token;
}

/** Headers for a request that needs the caller's identity. */
export async function identityHeaders(extra = {}) {
  return { ...extra, [SSO_HEADER]: await getSsoToken() };
}

/** The server's message from a failed response (JSON {message} or plain text). */
export async function errorMessage(res, fallback) {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data.message || data.error || fallback;
  } catch {
    return text || fallback;
  }
}
