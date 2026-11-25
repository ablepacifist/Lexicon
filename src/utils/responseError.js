// Turning a failed request into something fit to show a person.
//
// Pages used to print `'Failed to X: ' + await resp.text()` or `err.message`, which put
// Spring error JSON, HTML error pages and "TypeError: Failed to fetch" on screen.

/** What to say when the request never got an answer. */
export const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

/**
 * The server's own reason when it is a short sentence meant for people (a 4xx such as
 * "Playlist name already exists"); otherwise `fallback`. A 5xx always gets `fallback`,
 * because its body is internal detail.
 */
export async function responseError(response, fallback) {
  if (!response || response.status >= 500) return fallback;
  try {
    const text = (await response.text()).trim();
    if (text && text.length <= 160 && !text.startsWith('<') && !text.startsWith('{')) return text;
  } catch {
    /* fall through */
  }
  return fallback;
}

/**
 * A caught error as a sentence. fetch() rejects with a TypeError ("Failed to fetch",
 * "NetworkError when attempting to fetch resource") when there was no answer at all.
 */
export function errorMessage(e, fallback = 'Something went wrong. Please try again.') {
  if (e instanceof TypeError) return NETWORK_ERROR;
  return (e && e.message) || fallback;
}
