// Verifies the Capacitor/native branches of apiUrls.js and apiFetch.js:
// native requests must carry the bearer token, and the website must behave
// exactly as it did before.

import { getApiUrls } from './apiUrls';
import {
    apiFetch,
    installNativeFetchAuth,
    setMobileToken,
    getMobileToken,
    clearMobileToken,
} from './apiFetch';

jest.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => global.__native === true },
}));

const LEXICON_API = 'https://api.alex-dyakin.com';

// jsdom does not always provide Headers
if (typeof Headers === 'undefined') {
    global.Headers = class {
        constructor(init = {}) {
            this._h = {};
            if (init && typeof init === 'object') {
                Object.keys(init).forEach((k) => { this._h[k.toLowerCase()] = init[k]; });
            }
        }
        has(k) { return this._h[k.toLowerCase()] !== undefined; }
        get(k) { return this._h[k.toLowerCase()]; }
        set(k, v) { this._h[k.toLowerCase()] = v; }
    };
}

function mockResponse(headers = {}) {
    return { headers: { get: (k) => headers[k] || null } };
}

function authHeaderOf(call) {
    const init = call[1];
    if (!init || !init.headers) return undefined;
    return init.headers.get ? init.headers.get('Authorization') : init.headers.Authorization;
}

beforeEach(() => {
    global.__native = false;
    clearMobileToken();
    window.fetch = jest.fn(() => Promise.resolve(mockResponse()));
});

describe('getApiUrls', () => {
    test('native resolves to the public HTTPS backends, not LAN IPs', () => {
        global.__native = true;
        const urls = getApiUrls();
        expect(urls).toEqual({
            lexiconApiUrl: 'https://api.alex-dyakin.com',
            alchemyApiUrl: 'https://alchemy.alex-dyakin.com',
            pokemonApiUrl: 'https://poke.alex-dyakin.com',
            bridgeApiUrl: 'https://voice.alex-dyakin.com',
        });
    });

    test('web still uses the existing hostname-based resolution', () => {
        // jsdom serves from localhost, which is the "local access" branch
        const urls = getApiUrls();
        expect(urls.lexiconApiUrl).toMatch(/192\.168\.|localhost/);
        expect(urls.bridgeApiUrl).toBe('https://voice.alex-dyakin.com');
    });
});

describe('apiFetch on the website', () => {
    test('sends no Authorization header', async () => {
        setMobileToken('a-token-that-should-be-ignored-on-web');
        await apiFetch(`${LEXICON_API}/api/auth/me`, { credentials: 'include' });

        expect(window.fetch).toHaveBeenCalledTimes(1);
        expect(authHeaderOf(window.fetch.mock.calls[0])).toBeUndefined();
    });

    test('passes the caller options through untouched', async () => {
        await apiFetch(`${LEXICON_API}/api/auth/login`, { method: 'POST', credentials: 'include' });
        const init = window.fetch.mock.calls[0][1];
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('include');
    });
});

describe('apiFetch on native', () => {
    beforeEach(() => { global.__native = true; });

    test('attaches the stored bearer token to Lexicon API requests', async () => {
        setMobileToken('token-abc');
        await apiFetch(`${LEXICON_API}/api/auth/me`, { credentials: 'include' });

        expect(authHeaderOf(window.fetch.mock.calls[0])).toBe('Bearer token-abc');
    });

    test('attaches the token to the Pokemon API too, so one login covers both', async () => {
        setMobileToken('token-abc');
        await apiFetch('https://poke.alex-dyakin.com/api/pokemon/collection');

        expect(authHeaderOf(window.fetch.mock.calls[0])).toBe('Bearer token-abc');
    });

    test('does not hand the token to Alchemy, which does not use it', async () => {
        setMobileToken('token-abc');
        await apiFetch('https://alchemy.alex-dyakin.com/api/player/1');

        expect(authHeaderOf(window.fetch.mock.calls[0])).toBeUndefined();
    });

    test('does not leak the token to third parties', async () => {
        setMobileToken('token-abc');
        await apiFetch('https://example.com/anything');

        expect(authHeaderOf(window.fetch.mock.calls[0])).toBeUndefined();
    });

    test('sends no header when no token is stored yet', async () => {
        await apiFetch(`${LEXICON_API}/api/auth/login`, { method: 'POST' });
        expect(authHeaderOf(window.fetch.mock.calls[0])).toBeUndefined();
    });

    test('stores a rotated token handed back on X-Mobile-Token', async () => {
        setMobileToken('old-token');
        window.fetch = jest.fn(() =>
            Promise.resolve(mockResponse({ 'X-Mobile-Token': 'rotated-token' })));

        await apiFetch(`${LEXICON_API}/api/auth/me`);

        expect(getMobileToken()).toBe('rotated-token');
    });

    test('keeps the current token when no rotation header is sent', async () => {
        setMobileToken('steady-token');
        await apiFetch(`${LEXICON_API}/api/auth/me`);
        expect(getMobileToken()).toBe('steady-token');
    });
});

describe('installNativeFetchAuth', () => {
    afterEach(() => { delete window.__lexiconNativeFetchInstalled; });

    test('is a no-op on the website', () => {
        const original = window.fetch;
        installNativeFetchAuth();
        expect(window.fetch).toBe(original);
    });

    test('patches fetch on native so untouched call sites still authenticate', async () => {
        global.__native = true;
        const original = window.fetch;
        installNativeFetchAuth();
        expect(window.fetch).not.toBe(original);

        setMobileToken('intercepted-token');
        // A legacy call site that knows nothing about apiFetch
        await window.fetch(`${LEXICON_API}/api/events`, { credentials: 'include' });

        expect(authHeaderOf(original.mock.calls[0])).toBe('Bearer intercepted-token');
    });

    test('does not double-install', () => {
        global.__native = true;
        installNativeFetchAuth();
        const patched = window.fetch;
        installNativeFetchAuth();
        expect(window.fetch).toBe(patched);
    });
});
