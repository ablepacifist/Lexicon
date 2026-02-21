import React from 'react';
import Navbar from '../components/Navbar';
import photoshopImg from '../assets/images/extra_photos/cool_photoshop.PNG';
import './PageStyles.css';

const Projects = () => {
  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero-bg" style={{ backgroundImage: `url(${photoshopImg})` }}></div>
        <div className="page-hero-overlay"></div>
        <div className="page-hero-content">
          <h1 className="page-hero-title">Projects</h1>
          <p className="page-hero-subtitle">Software, tools, and experiments</p>
        </div>
      </div>

      <section className="page-section">
        <div className="page-container">
          <div className="grid-3">
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🌐</div>
              <h3>This Website</h3>
              <p>
                A full-stack personal platform built with React, Java (Spring Boot / Gradle), and HSQLDB.
                Features media streaming, an alchemy game, and this personal portfolio — all self-hosted.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <span className="tag">React</span>
                <span className="tag">Java</span>
                <span className="tag">Spring Boot</span>
                <span className="tag">HSQLDB</span>
              </div>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚗️</div>
              <h3>Alchemy Game</h3>
              <p>
                A browser-based game with inventory management, potion brewing, and foraging mechanics.
                Built with a Java backend and React frontend.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <span className="tag">Game Dev</span>
                <span className="tag">React</span>
                <span className="tag">Java</span>
              </div>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎵</div>
              <h3>Lexicon Media</h3>
              <p>
                A personal media server for streaming video, audio, and audiobooks. Includes playlist
                management and a custom media player.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <span className="tag">Streaming</span>
                <span className="tag">Media</span>
                <span className="tag">Self-Hosted</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="page-section alt">
        <div className="page-container">
          <div className="empty-state">
            <div className="empty-state-icon">🚧</div>
            <h3>More Projects Coming Soon</h3>
            <p>
              I'm always building something new. Check back later for more projects,
              or head over to the blog for updates.
            </p>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
      </footer>
    </div>
  );
};

export default Projects;
