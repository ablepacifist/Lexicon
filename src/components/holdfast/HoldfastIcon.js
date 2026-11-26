// Shows a Holdfast asset: the image named in the server's manifest, or its emoji until one is added.
//
// The manifest is served by alchemyServer (GET /api/holdfast/assets/manifest) and decides everything:
// which keys exist, which have an image, and the image URL. This component only renders what it says.
// How to add art: see computer-documentation/programs/holdfast.md ("Adding an image").
import React, { useEffect, useState } from 'react';
import { getApiUrls } from '../../utils/apiUrls';

let manifestPromise = null;
let manifestCache = null;

export function loadHoldfastManifest() {
  if (!manifestPromise) {
    const { alchemyApiUrl } = getApiUrls();
    manifestPromise = fetch(`${alchemyApiUrl}/api/holdfast/assets/manifest`)
      .then((res) => (res.ok ? res.json() : { assets: {} }))
      .catch(() => ({ assets: {} }))
      .then((m) => {
        manifestCache = m && m.assets ? m : { assets: {} };
        return manifestCache;
      });
  }
  return manifestPromise;
}

/** Tests only: forget the cached manifest. */
export function resetHoldfastManifest() {
  manifestPromise = null;
  manifestCache = null;
}

function useManifest() {
  const [manifest, setManifest] = useState(manifestCache);
  useEffect(() => {
    let alive = true;
    if (!manifestCache) {
      loadHoldfastManifest().then((m) => alive && setManifest(m));
    }
    return () => { alive = false; };
  }, []);
  return manifest;
}

/**
 * @param {string} k        asset key, e.g. "resource.wood" or "building.granary"
 * @param {string} fallback emoji shown before the manifest loads (or if the key is unknown)
 * @param {string} size     "sm" | "md" | "lg" | "banner"
 */
export default function HoldfastIcon({ k, fallback = '', size = 'sm', className = '' }) {
  const manifest = useManifest();
  const [broken, setBroken] = useState(false);
  const entry = manifest?.assets?.[k];
  const label = entry?.label || '';
  const classes = `hf-icon hf-icon-${size} ${className}`.trim();

  if (entry?.url && !broken) {
    const { alchemyApiUrl } = getApiUrls();
    return (
      <img
        className={classes}
        src={`${alchemyApiUrl}${entry.url}`}
        alt={label}
        title={label}
        onError={() => setBroken(true)}
        draggable={false}
      />
    );
  }
  return (
    <span className={classes} role="img" aria-label={label || k} title={label || undefined}>
      {entry?.emoji || fallback}
    </span>
  );
}
