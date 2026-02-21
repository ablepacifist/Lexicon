import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import './Navbar.css';

const Navbar = () => {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'About Me' },
    { path: '/career', label: 'Career' },
    { path: '/recipes', label: 'Recipes' },
    { path: '/blog', label: 'Blog' },
    { path: '/projects', label: 'Projects' },
    { path: '/dnd', label: 'D&D' },
    { path: '/alchemy-dashboard', label: 'Alchemy', requiresAuth: true },
    { path: '/lexicon-dashboard', label: 'Lexicon', requiresAuth: true },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">AD</span>
          <span className="brand-text">Alex Dyakin</span>
        </Link>

        <button
          className={`navbar-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? 'show' : ''}`}>
          {navItems.map((item) => {
            if (item.requiresAuth && !user) return null;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="navbar-auth">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="navbar-link auth-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {user.username}
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="navbar-link auth-link"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
