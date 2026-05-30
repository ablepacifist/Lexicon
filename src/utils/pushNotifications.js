import { getApiUrls } from './apiUrls';

const { lexiconApiUrl } = getApiUrls();

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Check if push notifications are supported and permission is granted.
 */
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get the current push permission state: 'granted', 'denied', or 'default'.
 */
export function getPushPermission() {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
}

/**
 * Register the service worker and subscribe to push notifications.
 * Returns the subscription object or null on failure.
 */
export async function subscribeToPush(userId) {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return null;
    }

    // Get VAPID public key from server
    let vapidPublicKey;
    try {
        const resp = await fetch(`${lexiconApiUrl}/api/push/vapid-key`);
        if (!resp.ok) {
            console.warn('Push not configured on server');
            return null;
        }
        const data = await resp.json();
        vapidPublicKey = data.publicKey;
    } catch (e) {
        console.error('Failed to fetch VAPID key:', e);
        return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to server
    const subJson = subscription.toJSON();
    await fetch(`${lexiconApiUrl}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            userId: userId,
            endpoint: subJson.endpoint,
            keys: subJson.keys,
            userAgent: navigator.userAgent
        })
    });

    console.log('Push subscription registered');
    return subscription;
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush() {
    if (!isPushSupported()) return;

    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Notify server
    await fetch(`${lexiconApiUrl}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    console.log('Push subscription removed');
}

/**
 * Check if user already has an active push subscription.
 */
export async function getExistingSubscription() {
    if (!isPushSupported()) return null;

    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (!registration) return null;

    return await registration.pushManager.getSubscription();
}
