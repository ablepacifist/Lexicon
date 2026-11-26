import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { UserContext } from '../context/UserContext';
import mapImg from '../assets/images/extra_photos/map_of_dnd.webp';
import dndCake from '../assets/images/extra_photos/dnd_cake.webp';
import renfest from '../assets/images/extra_photos/ren_fest.webp';
import renfest2 from '../assets/images/extra_photos/me_and_friends_renfest_2.webp';
import './PageStyles.css';

const DndCampaigns = () => {
  const { user } = useContext(UserContext);

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

      {/* Game Tools — authenticated users only */}
      {user && (
        <section className="page-section">
          <div className="page-container">
            <h2 className="page-section-title">Game Tools</h2>
            <div className="page-section-divider"></div>
            <div className="grid-2">
              <Link to="/alchemy-dashboard" style={{ textDecoration: 'none' }}>
                <div className="content-card" style={{ cursor: 'pointer', height: '100%' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚗️</div>
                  <h3>Alchemy Lab</h3>
                  <p>Brew potions, manage ingredients, and track your crafting progress.</p>
                </div>
              </Link>
              <Link to="/holdfast" style={{ textDecoration: 'none' }}>
                <div className="content-card" style={{ cursor: 'pointer', height: '100%' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏰</div>
                  <h3>Holdfast Manager</h3>
                  <p>Build your settlement, advance time, manage resources, and defend against raiders.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

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
            <img loading="lazy" decoding="async"
              src={mapImg}
              alt="D&D Campaign World Map"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          <p style={{ color: '#a0a0b0', fontSize: '1rem', lineHeight: 1.7, textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            The campaign world — a hand-crafted map featuring kingdoms, dungeons, and wild frontiers.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="page-section">
        <div className="page-container">
          <h2 className="page-section-title">The Fellowship</h2>
          <div className="page-section-divider"></div>
          <div className="grid-3">
            <div className="image-card">
              <img loading="lazy" decoding="async" src={dndCake} alt="D&D themed cake" />
              <div className="image-card-body">
                <h3>Game Night Treats</h3>
                <p>Every great session deserves a great cake.</p>
              </div>
            </div>
            <div className="image-card">
              <img loading="lazy" decoding="async" src={renfest} alt="Renaissance Festival" />
              <div className="image-card-body">
                <h3>Ren Fest Adventures</h3>
                <p>Taking the fantasy spirit into the real world.</p>
              </div>
            </div>
            <div className="image-card">
              <img loading="lazy" decoding="async" src={renfest2} alt="Ren fest with friends" />
              <div className="image-card-body">
                <h3>The Party Assembles</h3>
                <p>When your D&D group hits the Renaissance Festival.</p>
              </div>
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
