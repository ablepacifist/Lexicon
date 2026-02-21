import React from 'react';
import Navbar from '../components/Navbar';
import mapImg from '../assets/images/extra_photos/map_of_dnd.JPG';
import dndCake from '../assets/images/extra_photos/dnd_cake.JPG';
import renfest from '../assets/images/extra_photos/ren_fest.JPG';
import renfest2 from '../assets/images/extra_photos/me_and_friends_renfest_2.JPG';
import './PageStyles.css';

const DndCampaigns = () => {
  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero" style={{ height: '50vh' }}>
        <div className="page-hero-bg" style={{ backgroundImage: `url(${mapImg})` }}></div>
        <div className="page-hero-overlay"></div>
        <div className="page-hero-content">
          <h1 className="page-hero-title">D&D Campaigns</h1>
          <p className="page-hero-subtitle">Worlds, adventures, and epic tales</p>
        </div>
      </div>

      {/* World Map */}
      <section className="page-section">
        <div className="page-container">
          <h2 className="page-section-title">The World Map</h2>
          <div className="page-section-divider"></div>
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '2rem',
          }}>
            <img
              src={mapImg}
              alt="D&D Campaign World Map"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          <p style={{ color: '#888', fontSize: '1rem', lineHeight: 1.7, textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            The campaign world — a hand-crafted map featuring kingdoms, dungeons, and wild frontiers.
            Adventures are chronicled below as they unfold.
          </p>
        </div>
      </section>

      {/* Campaign Log */}
      <section className="page-section alt">
        <div className="page-container">
          <h2 className="page-section-title">Campaign Log</h2>
          <div className="page-section-divider"></div>

          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📜</div>
            <h3>Adventures Coming Soon</h3>
            <p>
              Campaign session recaps, character profiles, and story arcs will be documented here.
              The adventure is just beginning...
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="page-section">
        <div className="page-container">
          <h2 className="page-section-title">The Fellowship</h2>
          <div className="page-section-divider"></div>
          <div className="grid-3">
            <div className="image-card">
              <img src={dndCake} alt="D&D themed cake" />
              <div className="image-card-body">
                <h3>Game Night Treats</h3>
                <p>Every great session deserves a great cake.</p>
              </div>
            </div>
            <div className="image-card">
              <img src={renfest} alt="Renaissance Festival" />
              <div className="image-card-body">
                <h3>Ren Fest Adventures</h3>
                <p>Taking the fantasy spirit into the real world.</p>
              </div>
            </div>
            <div className="image-card">
              <img src={renfest2} alt="Ren fest with friends" />
              <div className="image-card-body">
                <h3>The Party Assembles</h3>
                <p>When your D&D group hits the Renaissance Festival.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Placeholder */}
      <section className="page-section alt">
        <div className="page-container">
          <h2 className="page-section-title">Resources & Lore</h2>
          <div className="page-section-divider"></div>
          <div className="grid-2">
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗡️</div>
              <h3>Character Sheets</h3>
              <p>Player characters, NPCs, and their backstories will be added here.</p>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏰</div>
              <h3>World Lore</h3>
              <p>History, factions, locations, and the mythology of the campaign world.</p>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚔️</div>
              <h3>Homebrew Rules</h3>
              <p>Custom rules, items, and mechanics used in our campaigns.</p>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎲</div>
              <h3>Session Notes</h3>
              <p>Detailed session recaps and decision logs — coming soon.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
      </footer>
    </div>
  );
};

export default DndCampaigns;
