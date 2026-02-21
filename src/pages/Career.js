import React from 'react';
import Navbar from '../components/Navbar';
import mmcd1 from '../assets/images/extra_photos/mmcd_1.JPG';
import mmcd3 from '../assets/images/extra_photos/mmcd_3.JPG';
import swamp1 from '../assets/images/extra_photos/cool_in_swamp_1.jpg';
import cityImg from '../assets/images/extra_photos/city_landscape.JPG';
import './PageStyles.css';

const Career = () => {
  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero-bg" style={{ backgroundImage: `url(${cityImg})` }}></div>
        <div className="page-hero-overlay"></div>
        <div className="page-hero-content">
          <h1 className="page-hero-title">Career</h1>
          <p className="page-hero-subtitle">Professional journey & contributions</p>
        </div>
      </div>

      {/* Current Role */}
      <section className="page-section">
        <div className="page-container">
          <h2 className="page-section-title">Current Role</h2>
          <div className="page-section-divider"></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Field Operations Supervisor
              </h3>
              <p style={{ color: '#8b8bf5', fontWeight: 600, margin: '0 0 1rem', fontSize: '1rem' }}>
                Metropolitan Mosquito Control District (MMCD)
              </p>
              <p style={{ color: '#b0b0c0', lineHeight: 1.8, fontSize: '1rem', margin: '0 0 1rem' }}>
                As a FOS at MMCD, a government mosquito disease prevention agency, I supervise field work
                operations across assigned districts. My team conducts surveillance, applies treatments,
                and monitors mosquito populations to protect public health.
              </p>
              <p style={{ color: '#b0b0c0', lineHeight: 1.8, fontSize: '1rem', margin: '0 0 1.5rem' }}>
                Beyond field supervision, I actively help the district modernize through technology.
                I develop software tools and programs that improve day-to-day activities, with a major
                focus on building a comprehensive <strong style={{ color: '#fff' }}>metrics tracking system</strong> to
                help the organization measure and optimize its operations.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="tag">Field Operations</span>
                <span className="tag">Team Leadership</span>
                <span className="tag">Software Development</span>
                <span className="tag">Metrics & Analytics</span>
                <span className="tag">GIS / Mapping</span>
                <span className="tag">Public Health</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="image-card">
                <img src={mmcd1} alt="MMCD fieldwork" />
              </div>
              <div className="image-card">
                <img src={mmcd3} alt="MMCD fieldwork" />
              </div>
              <div className="image-card" style={{ gridColumn: 'span 2' }}>
                <img src={swamp1} alt="In the field" style={{ aspectRatio: '2/1' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Projects */}
      <section className="page-section alt">
        <div className="page-container">
          <h2 className="page-section-title">Key Tech Contributions</h2>
          <div className="page-section-divider"></div>

          <div className="grid-3">
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
              <h3>Metrics System</h3>
              <p>
                Major ongoing project — building a comprehensive metrics platform for the district to
                track field operations, productivity, and treatment effectiveness across all operational areas.
              </p>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗺️</div>
              <h3>Operational Tools</h3>
              <p>
                Custom programs to help field crews and supervisors with day-to-day activities —
                from scheduling and routing to data collection and reporting.
              </p>
            </div>
            <div className="content-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚡</div>
              <h3>Process Automation</h3>
              <p>
                Automating repetitive workflows and data processing tasks to save time and reduce
                manual data entry across the organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resume Link */}
      <section className="page-section">
        <div className="page-container" style={{ textAlign: 'center' }}>
          <h2 className="page-section-title" style={{ textAlign: 'center' }}>Full Resume</h2>
          <div className="page-section-divider" style={{ margin: '0.5rem auto 2rem' }}></div>
          <p style={{ color: '#888', fontSize: '1.05rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            For a complete look at my professional experience, education, and skills.
          </p>
          <a
            href="https://ablepacifist.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'inline-block',
              padding: '0.85rem 2.5rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.25s ease',
            }}
          >
            View Resume &rarr;
          </a>
        </div>
      </section>

      <footer className="page-footer">
        <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
      </footer>
    </div>
  );
};

export default Career;
