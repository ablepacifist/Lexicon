import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import { navigateToVoice } from '../utils/voiceNavigation';
import NotificationBell from './NotificationBell';
import NotificationToasts from './NotificationToasts';
import { useNotifications } from '../hooks/useNotifications';
import './Navbar.css';

const Navbar = () => {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { avatarUrl } = useAvatar(user?.username);
  const notif = useNotifications(user);

  const navItems = [
    { path: '/', label: 'About Me' },
    { path: '/career', label: 'Career' },
    { path: '/recipes', label: 'Recipes' },
    { path: '/blog', label: 'Blog' },
    { path: '/projects', label: 'Projects' },
    { path: '/dnd', label: 'D&D' },
    { path: '/lexicon-dashboard', label: 'Lexicon', requiresAuth: true },
    { path: '/events', label: 'Events', requiresAuth: true },
    { path: '/pokemon', label: 'PokeWorld', requiresAuth: true },
    { path: '#voice', label: '🎙️ Voice', requiresAuth: true, external: true },
  ];

  const isActive = (path) => location.pathname === path;
  const close = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand" onClick={close}>
            <span className="brand-icon">AD</span>
            <span className="brand-text">Alex Dyakin</span>
          </Link>

          {user && (
            <div className="navbar-mobile-bell">
              <NotificationBell userId={user.id} {...notif} />
            </div>
          )}

          <button
            className={`navbar-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Desktop links — only visible on wide screens via CSS */}
          <div className="navbar-links navbar-links-desktop">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) return null;
              if (item.external) {
                return (
                  <button
                    key={item.path}
                    className="navbar-link"
                    onClick={() => { close(); navigateToVoice(); }}
                    style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', color: 'inherit' }}
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`navbar-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={close}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="navbar-auth">
              {user ? (
                <>
                  <NotificationBell userId={user.id} {...notif} />
                  <Link to="/profile" className="navbar-link auth-link" onClick={close} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(139,139,245,0.5)' }} />
                    {user.username}
                  </Link>
                </>
              ) : (
                <Link to="/login" className="navbar-link auth-link" onClick={close}>Login</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu — rendered OUTSIDE <nav> so it has its own stacking context */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {navItems.map((item) => {
            if (item.requiresAuth && !user) return null;
            if (item.external) {
              return (
                <button
                  key={item.path}
                  className="mobile-nav-link"
                  onClick={() => { close(); navigateToVoice(); }}
                >
                  {item.label}
                </button>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={close}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mobile-nav-auth">
            {user ? (
              <Link to="/profile" className="mobile-nav-link auth" onClick={close} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(139,139,245,0.5)' }} />
                {user.username}
              </Link>
            ) : (
              <Link to="/login" className="mobile-nav-link auth" onClick={close}>Login</Link>
            )}
          </div>
        </div>
      )}

      {user && <NotificationToasts toasts={notif.toasts} dismissToast={notif.dismissToast} />}
    </>
  );
};

export default Navbar;
