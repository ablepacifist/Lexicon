// Auto-detect whether to use local network, Cloudflare domain, or PlayIt tunnel URLs
// This allows the same build to work for local dev, HTTPS domain, and external users

const getApiUrls = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
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
    
    // Bridge always uses Cloudflare tunnel (not hosted locally)
    const bridgeApiUrl = 'https://voice.alex-dyakin.com';

    if (isLocalAccess) {
        // User is on local network - use local IPs for maximum speed
        return {
            lexiconApiUrl: process.env.REACT_APP_LEXICON_API_URL_LOCAL || 'http://192.168.4.29:36568',
            alchemyApiUrl: process.env.REACT_APP_API_URL_LOCAL || 'http://192.168.4.29:8080',
            bridgeApiUrl
        };
    } else if (isCloudflareAccess) {
        // User is on HTTPS via Cloudflare - use HTTPS subdomains to avoid mixed content
        return {
            lexiconApiUrl: 'https://api.alex-dyakin.com',
            alchemyApiUrl: 'https://alchemy.alex-dyakin.com',
            bridgeApiUrl
        };
    } else {
        // User is external via PlayIt - use internet tunnel URLs
        return {
            lexiconApiUrl: process.env.REACT_APP_LEXICON_API_URL_INTERNET || 'http://147.185.221.24:15856',
            alchemyApiUrl: process.env.REACT_APP_API_URL_INTERNET || 'http://147.185.221.24:15821',
            bridgeApiUrl
        };
    }
};

export { getApiUrls };