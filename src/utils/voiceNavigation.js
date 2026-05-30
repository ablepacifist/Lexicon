import { getApiUrls } from './apiUrls';

const VOICE_URL = 'https://voice.alex-dyakin.com';

/**
 * Generate an SSO token and redirect to Voice Chat with the token.
 * Falls back to plain redirect if token generation fails.
 */
export async function navigateToVoice() {
    const { lexiconApiUrl } = getApiUrls();

    try {
        const resp = await fetch(`${lexiconApiUrl}/api/auth/sso/generate-token`, {
            method: 'POST',
            credentials: 'include',
        });

        if (resp.ok) {
            const data = await resp.json();
            window.location.href = `${VOICE_URL}?token=${encodeURIComponent(data.token)}`;
            return;
        }
    } catch (e) {
        console.warn('SSO token generation failed, redirecting without token:', e);
    }

    // Fallback: redirect without token (user will need to auth on voice side)
    window.location.href = VOICE_URL;
}
