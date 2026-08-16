import { getApiUrls } from './apiUrls';
import { isNativePlatform } from './native';
import { apiFetch } from './apiFetch';

const VOICE_URL = 'https://voice.alex-dyakin.com';

// Inside the Android shell the voice client is bundled alongside Lexicon, so we
// navigate to it in-app instead of leaving for the public site. The SSO token is
// passed exactly as it is on the web.
const NATIVE_VOICE_PATH = '/voice/index.html';

function voiceTarget() {
    return isNativePlatform() ? NATIVE_VOICE_PATH : VOICE_URL;
}

/**
 * Generate an SSO token and redirect to Voice Chat with the token.
 * Falls back to plain redirect if token generation fails.
 */
export async function navigateToVoice() {
    const { lexiconApiUrl } = getApiUrls();
    const target = voiceTarget();

    try {
        const resp = await apiFetch(`${lexiconApiUrl}/api/auth/sso/generate-token`, {
            method: 'POST',
            credentials: 'include',
        });

        if (resp.ok) {
            const data = await resp.json();
            window.location.href = `${target}?token=${encodeURIComponent(data.token)}`;
            return;
        }
    } catch (e) {
        console.warn('SSO token generation failed, redirecting without token:', e);
    }

    // Fallback: redirect without token (user will need to auth on voice side)
    window.location.href = target;
}
