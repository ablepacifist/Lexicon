import { useState, useEffect, useCallback } from 'react';
import { getApiUrls } from '../utils/apiUrls';

const { lexiconApiUrl, bridgeApiUrl } = getApiUrls();

// API calls (fetch JSON, upload, remove) go through the Lexicon backend proxy
// because the bridge does NOT set CORS headers.
// Avatar images are also proxied through the Lexicon backend to avoid Brave Shields
// blocking cross-origin image loads from the bridge domain.
const BRIDGE_IMAGE_BASE = bridgeApiUrl;                       // kept for reference
const PROXY_BASE        = `${lexiconApiUrl}/api/avatar`;      // for fetch() calls
const IMAGE_PROXY_BASE  = `${lexiconApiUrl}/api/avatar/image`; // for <img src="...">
const DEFAULT_AVATAR    = `${IMAGE_PROXY_BASE}/default.jpg`;

/**
 * Hook to fetch, upload, and remove user avatars.
 *  - Display URLs point directly at the bridge (images bypass CORS).
 *  - Mutations (upload/remove) and JSON fetches go through the Lexicon proxy.
 */
export const useAvatar = (username) => {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAvatar = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // JSON fetch goes through Lexicon proxy to avoid CORS
      const res = await fetch(
        `${PROXY_BASE}/${encodeURIComponent(username)}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        // Route avatar image through same-origin proxy to avoid Brave Shields blocking
        // data.avatarUrl is like "/uploads/avatars/user.jpg"
        const filename = data.avatarUrl.replace(/^\/uploads\/avatars\//, '');
        setAvatarUrl(`${IMAGE_PROXY_BASE}/${filename}?t=${Date.now()}`);
      } else {
        setAvatarUrl(DEFAULT_AVATAR);
      }
    } catch (err) {
      console.warn('Avatar fetch failed:', err.message);
      setAvatarUrl(DEFAULT_AVATAR);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  /**
   * Upload a new avatar image (max 2 MB, JPEG/PNG/GIF/WebP).
   * Routed through the Lexicon proxy → bridge.
   */
  const uploadAvatar = async (file, userId) => {
    const formData = new FormData();
    formData.append('username', username);
    if (userId != null) formData.append('userId', String(userId));
    formData.append('avatar', file);

    const res = await fetch(`${PROXY_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Upload failed');
      throw new Error(text);
    }

    const data = await res.json();
    const filename = data.avatarUrl.replace(/^\/uploads\/avatars\//, '');
    const newUrl = `${IMAGE_PROXY_BASE}/${filename}?t=${Date.now()}`;
    setAvatarUrl(newUrl);
    return newUrl;
  };

  /**
   * Remove the user's custom avatar. Routed through the Lexicon proxy → bridge.
   */
  const removeAvatar = async (userId) => {
    const res = await fetch(`${PROXY_BASE}/remove`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId }),
    });

    if (res.ok) {
      setAvatarUrl(DEFAULT_AVATAR);
    }
  };

  return { avatarUrl, loading, error, uploadAvatar, removeAvatar, refetch: fetchAvatar };
};

export { DEFAULT_AVATAR, BRIDGE_IMAGE_BASE as bridgeApiUrl };
