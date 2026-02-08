// Auto-detect whether to use local network or internet URLs
// This allows the same build to work for both local and external users

const getApiUrls = () => {
    // Try to detect if user is on local network by checking their IP
    const hostname = window.location.hostname;
    
    // If accessing via local IP or localhost, use local backend URLs for speed
    const isLocalAccess = (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
    );
    
    if (isLocalAccess) {
        // User is on local network - use local IPs for maximum speed
        return {
            lexiconApiUrl: process.env.REACT_APP_LEXICON_API_URL_LOCAL || 'http://192.168.4.29:36568',
            alchemyApiUrl: process.env.REACT_APP_API_URL_LOCAL || 'http://192.168.4.29:8080'
        };
    } else {
        // User is external - use internet tunnel URLs
        return {
            lexiconApiUrl: process.env.REACT_APP_LEXICON_API_URL_INTERNET || 'http://147.185.221.24:15856',
            alchemyApiUrl: process.env.REACT_APP_API_URL_INTERNET || 'http://147.185.221.24:15821'
        };
    }
};

export { getApiUrls };