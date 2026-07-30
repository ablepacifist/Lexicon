import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import { getApiUrls } from '../utils/apiUrls';
import Navbar from '../components/Navbar';
import background from '../assets/images/lexicon_room.jpg';
import './LexiconDashboard.css';

const SECTIONS = [
  {
    id: 'watch',
    badge: 'Watch & Listen',
    title: 'Your Media',
    theme: 'watch',
    cards: [
      { to: '/video-player',  icon: '🎬', title: 'Video Player',  desc: 'Browse, search, and watch your video library.' },
      { to: '/audio-player',  icon: '🎵', title: 'Audio Player',  desc: 'Listen to your music collection, track by track.' },
      { to: '/audiobooks',    icon: '📚', title: 'Audiobooks',    desc: 'Long-form audio — books, lectures, and more.' },
    ],
  },
  {
    id: 'library',
    badge: 'Library',
    title: 'Manage Your Files',
    theme: 'library',
    cards: [
      { to: '/media-upload',     icon: '⬆️', title: 'Upload & Download', desc: 'Add files to your library or retrieve them anytime.' },
      { to: '/playlist-manager', icon: '📋', title: 'Playlists',          desc: 'Build and organise playlists across all your media.' },
    ],
  },
  {
    id: 'live',
    badge: 'Go Live',
    title: 'Broadcast',
    theme: 'live',
    cards: [
      { to: '/video-stream',  icon: '📡', title: 'Video Stream',  desc: 'Go live with a full video broadcast.' },
      { to: '/music-stream',  icon: '🎙️', title: 'Music Stream',  desc: 'Stream music live to your audience.' },
      { to: '/queue-manager', icon: '🗂️', title: 'Queue Manager', desc: 'Manage and control the live stream playback queue in real time.' },
    ],
  },
];

const FeatureCard = ({ to, icon, title, desc, theme }) => (
  <Link to={to} className={`lex-card ${theme}`}>
    <span className="lex-card-icon">{icon}</span>
    <h3 className="lex-card-title">{title}</h3>
    <p className="lex-card-desc">{desc}</p>
    <span className="lex-card-arrow">→</span>
  </Link>
);

const toGB = bytes => (bytes / (1024 ** 3)).toFixed(1);

const LexiconDashboard = () => {
  const { user } = useContext(UserContext);
  const { avatarUrl } = useAvatar(user?.username);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    const { lexiconApiUrl } = getApiUrls();
    fetch(`${lexiconApiUrl}/api/media/storage-info`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStorageInfo(data); })
      .catch(() => {});
  }, []);

  return (
    <div
      className="lex-page"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url(${background})` }}
    >
      <Navbar />

      {/* Hero strip */}
      <div className="lex-hero">
        <img src={avatarUrl} alt="" className="lex-hero-avatar" />
        <div className="lex-hero-text">
          <h1 className="lex-hero-title">
            Welcome back, <span>{user?.username}</span>
          </h1>
          <p className="lex-hero-sub">Lexicon Media Center</p>
        </div>
        <div className="lex-hero-actions">
          <Link to="/profile" className="lex-hero-link">👤 Profile</Link>
          <Link to="/app-selector" className="lex-hero-link">← Apps</Link>
        </div>
      </div>

      {/* Storage bar */}
      {storageInfo && (
        <div className="storage-bar-section">
          {storageInfo.volumes.map((v, idx) => {
            const pct = (v.usedBytes / v.totalBytes) * 100;
            const colorClass = pct > 90 ? 'fill-red' : pct > 70 ? 'fill-yellow' : 'fill-green';
            return (
              <div key={idx} className="storage-bar-row">
                <span className="storage-label">{v.label}</span>
                <div className="storage-bar-track">
                  <div className={`storage-bar-fill ${colorClass}`} style={{ width: `${Math.min(100, pct).toFixed(1)}%` }} />
                </div>
                <span className="storage-text">{toGB(v.usedBytes)} / {toGB(v.totalBytes)} GB</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature sections */}
      <div className="lex-content">
        {SECTIONS.map((section) => (
          <section key={section.id} className="lex-section">
            <div className="lex-section-header">
              <span className={`lex-section-badge ${section.theme}`}>{section.badge}</span>
              <h2 className="lex-section-title">{section.title}</h2>
              <div className={`lex-section-divider ${section.theme}`} />
            </div>
            <div className={`lex-grid${section.cards.length === 2 ? ' two-col' : ''}`}>
              {section.cards.map((card) => (
                <FeatureCard key={card.to} {...card} theme={section.theme} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer nav */}
        <div className="lex-footer">
          <Link to="/app-selector" className="lex-hero-link">← App Selector</Link>
          <Link to="/" className="lex-hero-link">🏠 Home</Link>
        </div>
      </div>
    </div>
  );
};

export default LexiconDashboard;
