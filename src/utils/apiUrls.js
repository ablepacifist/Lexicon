// Auto-detect whether to use local network, Cloudflare domain, or PlayIt tunnel URLs
// This allows the same build to work for local dev, HTTPS domain, and external users
//
// Every destination composed here comes from src/config/destinations.json,
// generated at prestart/prebuild time by scripts/sync-destinations.js from
// the one registry (see src/config/destinations.defaults.json). No literal
// host/port belongs in this file.

import { isNativePlatform } from './native';
import destinations from '../config/destinations.json';

const {
    LAN_HOST,
    LEXICON_PORT,
    ALCHEMY_PORT,
    POKEMON_PORT,
    PUBLIC_LEXICON_URL,
    PUBLIC_ALCHEMY_URL,
    PUBLIC_POKEMON_URL,
    PUBLIC_BRIDGE_URL,
    PLAYIT_HOST,
    PLAYIT_ALCHEMY_PORT,
    PLAYIT_LEXICON_PORT,
    PLAYIT_POKEMON_PORT,
} = destinations;

const getApiUrls = () => {
    // Bridge always uses Cloudflare tunnel (not hosted locally)
    const bridgeApiUrl = PUBLIC_BRIDGE_URL;

    // Inside the Android shell the page is served from the WebView's own local
    // origin (capacitor://localhost), so hostname sniffing would wrongly resolve
    // to LAN IPs that only work on one home network. Always use the public URLs.
    if (isNativePlatform()) {
        return {
            lexiconApiUrl: PUBLIC_LEXICON_URL,
            alchemyApiUrl: PUBLIC_ALCHEMY_URL,
            pokemonApiUrl: PUBLIC_POKEMON_URL,
            bridgeApiUrl,
        };
    }

    const hostname = window.location.hostname;

    // If accessing via local IP or localhost, use local backend URLs for speed
    const isLocalAccess = (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
    );

    // If accessing via alex-dyakin.com (Cloudflare Tunnel), use HTTPS subdomains
    const isCloudflareAccess = hostname.endsWith('alex-dyakin.com');

    if (isLocalAccess) {
        // User is on local network - use local IPs for maximum speed
        return {
            lexiconApiUrl: `http://${LAN_HOST}:${LEXICON_PORT}`,
            alchemyApiUrl: `http://${LAN_HOST}:${ALCHEMY_PORT}`,
            pokemonApiUrl: `http://${LAN_HOST}:${POKEMON_PORT}`,
            bridgeApiUrl
        };
    } else if (isCloudflareAccess) {
        // User is on HTTPS via Cloudflare - use HTTPS subdomains to avoid mixed content
        return {
            lexiconApiUrl: PUBLIC_LEXICON_URL,
            alchemyApiUrl: PUBLIC_ALCHEMY_URL,
            pokemonApiUrl: PUBLIC_POKEMON_URL,
            bridgeApiUrl
        };
    } else {
        // User is external via PlayIt - use internet tunnel URLs
        return {
            lexiconApiUrl: `http://${PLAYIT_HOST}:${PLAYIT_LEXICON_PORT}`,
            alchemyApiUrl: `http://${PLAYIT_HOST}:${PLAYIT_ALCHEMY_PORT}`,
            pokemonApiUrl: `http://${PLAYIT_HOST}:${PLAYIT_POKEMON_PORT}`,
            bridgeApiUrl
        };
    }
};

export { getApiUrls };
