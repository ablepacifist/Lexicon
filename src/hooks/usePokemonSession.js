import { useCallback, useEffect, useState } from 'react';
import { getApiUrls } from '../utils/apiUrls';

/**
 * Makes sure the Pokémon server knows who the signed-in Lexicon player is.
 *
 * The Pokémon backend keeps its own session. Lexicon signs a player in there with a
 * single-use SSO token: ask Lexicon for one, hand it to /api/pokemon/auth/sso. Only the
 * map used to do this, so a bookmarked /pokemon/shop or /pokemon/:id opened cold had no
 * Pokémon session at all and showed "please log in" to someone who was logged in.
 *
 * Concurrent callers share one handshake. It is not cached past that: /auth/me is one
 * cheap request, and asking again on each page is what notices a session that expired.
 */
let inflight = null;

async function handshake() {
  const { pokemonApiUrl, lexiconApiUrl } = getApiUrls();
  const me = await fetch(`${pokemonApiUrl}/api/pokemon/auth/me`, { credentials: 'include' }).catch(() => null);
  if (me?.ok) return true;

  const tokenRes = await fetch(`${lexiconApiUrl}/api/auth/sso/generate-token`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!tokenRes.ok) return false;
  const { token } = await tokenRes.json();

  const sso = await fetch(`${pokemonApiUrl}/api/pokemon/auth/sso`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return sso.ok;
}

export function ensurePokemonSession() {
  if (!inflight) {
    inflight = handshake()
      .catch(() => false)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** 'checking' | 'authed' | 'failed', plus retry() for the failed case. */
export function usePokemonSession() {
  const [status, setStatus] = useState('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('checking');
    ensurePokemonSession().then(ok => {
      if (alive) setStatus(ok ? 'authed' : 'failed');
    });
    return () => { alive = false; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  return { status, retry };
}

export default usePokemonSession;
