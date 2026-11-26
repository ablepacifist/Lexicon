import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import Navbar from '../components/Navbar';
import { navigateToVoice } from '../utils/voiceNavigation';
import { hasPermission } from '../utils/sessionUser';
import background from '../assets/images/background.webp';
import './PageStyles.css';
import './AppSelector.css';

/** Every signed-in app, in one place. */
const APPS = [
  { to: '/lexicon-dashboard', name: 'Lexicon', desc: 'Music, video, audiobooks and playlists.' },
  { to: '/pokemon', name: 'PokéWorld', desc: 'Catch Pokémon around you, spin stops, take gyms.' },
  { to: '/alchemy-dashboard', name: 'Alchemy', desc: 'Forage ingredients and brew potions.' },
  { to: '/holdfast', name: 'Holdfast', desc: 'Run your settlement.' },
  { to: '/events', name: 'Events', desc: 'Plans and polls you can share by link.' },
];

const AppSelector = () => {
  const { user } = useContext(UserContext);
  const { avatarUrl } = useAvatar(user?.username);

  // The route is behind PrivateRoute, so there is always a user here; this only guards a
  // render racing a sign-out.
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <Navbar />
      <main className="apps-page">
        <div className="apps-page__bg" style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
        <div className="apps-shell">
          <header className="apps-welcome">
            {avatarUrl && <img src={avatarUrl} alt="" />}
            <div>
              <h1>Welcome back, {user.username}</h1>
              <p>Where to?</p>
            </div>
          </header>

          <nav aria-label="Apps">
            <div className="apps-grid">
              {APPS.map((app) => (
                <Link key={app.to} to={app.to} className="app-card">
                  <span className="app-card__name">{app.name}</span>
                  <span className="app-card__desc">{app.desc}</span>
                </Link>
              ))}
              {/* The voice chat is a separate site, opened by its own helper. */}
              <button type="button" className="app-card" onClick={() => navigateToVoice()}>
                <span className="app-card__name">Voice</span>
                <span className="app-card__desc">Voice and text chat with everyone.</span>
              </button>
            </div>
          </nav>

          <div className="apps-secondary">
            {/* Shown when Lexicon lists the permission; the server checks it again on every call. */}
            {hasPermission(user, 'MANAGE_USERS') && (
              <Link className="lx-btn lx-btn--secondary" to="/admin/users">Users &amp; storage</Link>
            )}
            <Link className="lx-btn lx-btn--secondary" to="/profile">Profile</Link>
            <Link className="lx-btn lx-btn--secondary" to="/">Home</Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default AppSelector;
