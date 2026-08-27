// Bearer-token auth for the Android (Capacitor) shell.
//
// On the website, auth rides on the session cookie via `credentials: 'include'`
// and everything here is a no-op. Inside the Android WebView the page is served
// from a local origin, so that SameSite=Lax cookie is never sent — instead the
// app stores a long-lived token issued at login and presents it as
// `Authorization: Bearer <token>` on every request to a backend that accepts it
// (Lexicon and Pokemon — see isTokenAwareBackend).
//
// Two entry points:
//   - apiFetch(...)              drop-in fetch replacement, used at auth call sites
//   - installNativeFetchAuth()   patches window.fetch once at startup so the app's
//                                ~160 existing fetch() call sites are covered too
//
// The interceptor also does the one thing per-call-site migration could not do
// reliably: capture the rotated token the server hands back in X-Mobile-Token,
// wherever that happens to arrive.

import { getApiUrls } from './apiUrls';
import { isNativePlatform } from './native';

const TOKEN_KEY = 'lexicon_mobile_token';
const REFRESH_HEADER = 'X-Mobile-Token';

export function getMobileToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setMobileToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
    } catch {
        /* storage unavailable — the session cookie path still applies on web */
    }
}

export function clearMobileToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        /* nothing to do */
    }
}

/** Resolve a fetch() first argument to an absolute URL string, or null if we can't. */
function resolveUrl(input) {
    try {
        if (typeof input === 'string') return new URL(input, window.location.href).href;
        if (input instanceof URL) return input.href;
        if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    } catch {
        /* fall through */
    }
    return null;
}

/**
 * Which backends accept the mobile bearer token.
 *
 * Lexicon issues and rotates it; Pokemon validates it read-only against the
 * shared database, which is what makes one login cover both. Alchemy is
 * deliberately excluded — its endpoints take an explicit playerId and never
 * read a session, so this token means nothing to it.
 */
function isTokenAwareBackend(input) {
    const href = resolveUrl(input);
    if (!href) return false;
    try {
        const { lexiconApiUrl, pokemonApiUrl } = getApiUrls();
        const origin = new URL(href).origin;
        return origin === new URL(lexiconApiUrl).origin
            || origin === new URL(pokemonApiUrl).origin;
    } catch {
        return false;
    }
}

/** Merge an Authorization header into whatever headers form the caller used. */
function withAuthHeader(init, token) {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return { ...init, headers };
}

/** Pick up a rotated token if the server sent one back. */
function captureRotatedToken(response) {
    try {
        const rotated = response?.headers?.get?.(REFRESH_HEADER);
        if (rotated) setMobileToken(rotated);
    } catch {
        /* header not exposed — keep using the current token */
    }
    return response;
}

/**
 * Drop-in replacement for fetch().
 * Native + token-aware backend → attaches the bearer token and tracks rotation.
 * Everything else              → plain fetch, unchanged.
 */
export function apiFetch(input, init) {
    // Must stay bound to window — a detached fetch throws "Illegal invocation"
    const nativeFetch = window.fetch.bind(window);

    if (!isNativePlatform()) {
        return nativeFetch(input, init);
    }

    const token = getMobileToken();
    if (!token || !isTokenAwareBackend(input)) {
        return nativeFetch(input, init);
    }

    return nativeFetch(input, withAuthHeader(init, token)).then(captureRotatedToken);
}

/**
 * Patch window.fetch so every existing call site gets bearer auth on native
 * without touching 160 call sites. No-op in a browser.
 */
export function installNativeFetchAuth() {
    if (!isNativePlatform()) return;
    if (window.__lexiconNativeFetchInstalled) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = function patchedFetch(input, init) {
        const token = getMobileToken();
        if (!token || !isTokenAwareBackend(input)) {
            return originalFetch(input, init);
        }
        return originalFetch(input, withAuthHeader(init, token)).then(captureRotatedToken);
    };

    window.__lexiconNativeFetchInstalled = true;
}

export default apiFetch;
