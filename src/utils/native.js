// Detect whether we're running inside the Capacitor Android shell (LexiconAndroid)
// rather than a normal browser tab.
//
// On the live website @capacitor/core reports platform "web" and every native
// branch below is dead code; only inside the WebView does this return true.

import { Capacitor } from '@capacitor/core';

export function isNativePlatform() {
    try {
        if (Capacitor?.isNativePlatform?.()) return true;
    } catch {
        /* fall through to the injected global */
    }
    // Fallback: the Android runtime injects window.Capacitor into the WebView
    try {
        return Boolean(window.Capacitor?.isNativePlatform?.());
    } catch {
        return false;
    }
}
