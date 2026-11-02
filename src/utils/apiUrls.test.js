// URL selection: LAN hosts talk to the LAN backends, everything else uses the public HTTPS URLs.
// In particular no host, however unusual, may ever be sent to a plain-HTTP tunnel address.

jest.mock('../config/destinations.json', () => ({
    LAN_HOST: '192.168.1.4',
    LEXICON_PORT: '36568',
    ALCHEMY_PORT: '8080',
    POKEMON_PORT: '8090',
    PUBLIC_LEXICON_URL: 'https://api.example.test',
    PUBLIC_ALCHEMY_URL: 'https://alchemy.example.test',
    PUBLIC_POKEMON_URL: 'https://poke.example.test',
    PUBLIC_BRIDGE_URL: 'https://voice.example.test',
}), { virtual: true });

const mockIsNative = jest.fn(() => false);
jest.mock('./native', () => ({ isNativePlatform: () => mockIsNative() }));

import { getApiUrls } from './apiUrls';

const withHostname = (hostname) => {
    Object.defineProperty(window, 'location', { value: { hostname }, writable: true, configurable: true });
    return getApiUrls();
};

describe('getApiUrls', () => {
    beforeEach(() => mockIsNative.mockReturnValue(false));

    test.each(['localhost', '127.0.0.1', '192.168.1.50', '10.0.0.7', '172.16.3.3'])(
        'LAN/local host %s uses the LAN backends', (host) => {
            const urls = withHostname(host);
            expect(urls.lexiconApiUrl).toBe('http://192.168.1.4:36568');
            expect(urls.alchemyApiUrl).toBe('http://192.168.1.4:8080');
            expect(urls.pokemonApiUrl).toBe('http://192.168.1.4:8090');
            expect(urls.bridgeApiUrl).toBe('https://voice.example.test');
        });

    test.each(['alex-dyakin.com', 'web.alex-dyakin.com', '209.25.140.16', 'something.gl.at.ply.gg', 'example.org'])(
        'public or unknown host %s uses the public HTTPS URLs', (host) => {
            const urls = withHostname(host);
            expect(urls).toEqual({
                lexiconApiUrl: 'https://api.example.test',
                alchemyApiUrl: 'https://alchemy.example.test',
                pokemonApiUrl: 'https://poke.example.test',
                bridgeApiUrl: 'https://voice.example.test',
            });
            Object.values(urls).forEach((u) => expect(u.startsWith('https://')).toBe(true));
        });

    test('native app shell always uses the public HTTPS URLs', () => {
        mockIsNative.mockReturnValue(true);
        const urls = withHostname('localhost');
        expect(urls.lexiconApiUrl).toBe('https://api.example.test');
    });
});
