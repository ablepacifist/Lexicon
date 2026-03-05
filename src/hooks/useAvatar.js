import { useState, useEffect, useCallback } from 'react';
import { getApiUrls } from '../utils/apiUrls';

const { lexiconApiUrl, bridgeApiUrl } = getApiUrls();

// Image files are loaded directly from the bridge (no CORS needed for <img> tags).
// API calls (fetch JSON, upload, remove) go through the Lexicon backend proxy
// because the bridge does NOT set CORS headers.
const BRIDGE_IMAGE_BASE = bridgeApiUrl;                       // for <img src="...">
const PROXY_BASE        = `${lexiconApiUrl}/api/avatar`;      // for fetch() calls
const DEFAULT_AVATAR    = `${BRIDGE_IMAGE_BASE}/uploads/avatars/default.jpg`;

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
        // Build the image URL pointing directly at the bridge CDN
        setAvatarUrl(`${BRIDGE_IMAGE_BASE}${data.avatarUrl}`);
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
    const newUrl = `${BRIDGE_IMAGE_BASE}${data.avatarUrl}`;
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
