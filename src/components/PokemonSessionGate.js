import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePokemonSession } from '../hooks/usePokemonSession';
import '../pages/PageStyles.css';

/**
 * Renders a PokéWorld page only once the Pokémon server has a session for this player,
 * so every /pokemon/* page works when opened directly, not just after visiting the map.
 *
 * The route is already behind PrivateRoute, so the player IS signed in to Lexicon here.
 * A failure means the handshake did not complete — a server down, or a Lexicon session
 * that lapsed — and the copy says so instead of telling a signed-in player to log in.
 */
export default function PokemonSessionGate({ children }) {
  const { status, retry } = usePokemonSession();
  const location = useLocation();

  if (status === 'authed') return children;

  if (status === 'checking') {
    return (
      <main className="page">
        <div className="lx-state" aria-busy="true">
          <div className="lx-spinner" aria-hidden="true" />
          <p>Connecting to PokéWorld…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="lx-state" role="alert">
        <h2>Couldn't connect to PokéWorld</h2>
        <p>The Pokémon server didn't accept your sign-in. It may be restarting, or your session may have expired.</p>
        <div className="lx-state__actions">
          <button type="button" className="lx-btn lx-btn--primary" onClick={retry}>Try again</button>
          <Link className="lx-btn lx-btn--secondary" to="/login" state={{ from: location.pathname + location.search }}>Sign in again</Link>
        </div>
      </div>
    </main>
  );
}
