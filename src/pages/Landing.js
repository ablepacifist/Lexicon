import React from 'react';
import Navbar from '../components/Navbar';
import heroImg from '../assets/images/extra_photos/wide_me_landing.JPG';
import natureImg from '../assets/images/extra_photos/me_nature_great_landing.JPG';
import suitImg from '../assets/images/extra_photos/suit.JPEG';
import friendsImg from '../assets/images/extra_photos/Me_and_friends.PNG';
import mountainImg from '../assets/images/extra_photos/me_top_of_mountain.JPEG';
import campingImg from '../assets/images/extra_photos/camping_trip.JPEG';
import renfestImg from '../assets/images/extra_photos/me_and_frens_renfest.JPEG';
import bakingImg from '../assets/images/extra_photos/byteMe_cake.JPEG';
import cityImg from '../assets/images/extra_photos/real_landscape_city.JPG';
import smilingImg from '../assets/images/extra_photos/smiling_image.JPEG';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg" style={{ backgroundImage: `url(${heroImg})` }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-intro">
            <h1 className="hero-name">Alex Dyakin</h1>
            <p className="hero-tagline">
              Field Operations Supervisor &bull; Developer &bull; Baker &bull; Adventurer
            </p>
            <div className="hero-cta-row">
              <a href="https://ablepacifist.github.io/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                View Resume
              </a>
              <a href="#about" className="btn btn-outline">
                Learn More
              </a>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <span className="scroll-arrow">&#8595;</span>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section about-section">
        <div className="section-container">
          <div className="about-grid">
            <div className="about-image-col">
              <div className="about-image-wrapper">
                <img src={smilingImg} alt="Alex Dyakin" className="about-portrait" />
              </div>
            </div>
            <div className="about-text-col">
              <h2 className="section-title">About Me</h2>
              <div className="section-divider"></div>
              <p className="about-text">
                Hi, I'm Alex — a Field Operations Supervisor at the Metropolitan Mosquito Control District (MMCD),
                a government agency dedicated to mosquito disease prevention in Minnesota. My day-to-day involves
                supervising field operations, but I also spend a significant amount of time helping the district
                leverage technology — writing programs to streamline day-to-day activities and building tools for
                metrics tracking.
              </p>
              <p className="about-text">
                Outside of work, I'm deeply passionate about software development, baking and cooking,
                tabletop gaming (D&D), and exploring the outdoors. I built this site as a personal hub
                to showcase my projects, share recipes, and document adventures.
              </p>
              <div className="about-stats">
                <div className="stat-item">
                  <span className="stat-number">FOS</span>
                  <span className="stat-label">at MMCD</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">Dev</span>
                  <span className="stat-label">Full-Stack</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">Baker</span>
                  <span className="stat-label">& Chef</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">DM</span>
                  <span className="stat-label">D&D Campaigns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Mosaic Section */}
      <section className="section mosaic-section">
        <div className="section-container">
          <h2 className="section-title center">Life in Pictures</h2>
          <div className="section-divider center"></div>
          <div className="photo-mosaic">
            <div className="mosaic-item tall">
              <img src={natureImg} alt="In nature" />
              <div className="mosaic-overlay"><span>Exploring Nature</span></div>
            </div>
            <div className="mosaic-item">
              <img src={suitImg} alt="Professional" />
              <div className="mosaic-overlay"><span>Professional Life</span></div>
            </div>
            <div className="mosaic-item">
              <img src={bakingImg} alt="Baking" />
              <div className="mosaic-overlay"><span>Baking Creations</span></div>
            </div>
            <div className="mosaic-item wide">
              <img src={friendsImg} alt="Friends" />
              <div className="mosaic-overlay"><span>Good Times with Friends</span></div>
            </div>
            <div className="mosaic-item">
              <img src={mountainImg} alt="Mountain summit" />
              <div className="mosaic-overlay"><span>Summit Views</span></div>
            </div>
            <div className="mosaic-item">
              <img src={campingImg} alt="Camping" />
              <div className="mosaic-overlay"><span>Camping Adventures</span></div>
            </div>
            <div className="mosaic-item wide">
              <img src={cityImg} alt="City" />
              <div className="mosaic-overlay"><span>City Life</span></div>
            </div>
            <div className="mosaic-item">
              <img src={renfestImg} alt="Renaissance festival" />
              <div className="mosaic-overlay"><span>Renaissance Festival</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="section quicklinks-section">
        <div className="section-container">
          <h2 className="section-title center">Explore</h2>
          <div className="section-divider center"></div>
          <div className="quicklinks-grid">
            <QuickLinkCard
              to="/career"
              title="Career"
              description="My work at MMCD, tech projects, and professional journey."
              icon="💼"
            />
            <QuickLinkCard
              to="/recipes"
              title="Recipes"
              description="Cakes, cookies, meals — things I love to cook and bake."
              icon="🍰"
            />
            <QuickLinkCard
              to="/blog"
              title="Blog"
              description="Thoughts, stories, and updates on what I'm up to."
              icon="✍️"
            />
            <QuickLinkCard
              to="/projects"
              title="Projects"
              description="Software projects, tools, and experiments."
              icon="🛠️"
            />
            <QuickLinkCard
              to="/dnd"
              title="D&D Campaigns"
              description="Campaign worlds, maps, and adventure logs."
              icon="🐉"
            />
            <QuickLinkCard
              to="/login"
              title="Alchemy & Lexicon"
              description="Log in to access the Alchemy game and Lexicon media apps."
              icon="⚗️"
            />
            <QuickLinkCard
              to="https://voice.alex-dyakin.com"
              title="Voice Bridge"
              description="Real-time voice communication powered by Mumble."
              icon="🎙️"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="section-container footer-inner">
          <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
          <div className="footer-links">
            <a href="https://ablepacifist.github.io/" target="_blank" rel="noopener noreferrer">Resume</a>
            <a href="https://voice.alex-dyakin.com" target="_blank" rel="noopener noreferrer">Voice Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const QuickLinkCard = ({ to, title, description, icon }) => (
  <a href={to} className="quicklink-card">
    <span className="quicklink-icon">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    <span className="quicklink-arrow">&rarr;</span>
  </a>
);

export default Landing;
