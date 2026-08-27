import React from 'react';
import Navbar from '../components/Navbar';
import { navigateToVoice } from '../utils/voiceNavigation';
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
              Developer &bull; Baker &bull; Dungeon Master &bull; Explorer
            </p>
            <div className="hero-cta-row">
              <a href="#my-world" className="btn btn-primary">
                My World
              </a>
              <a href="#about" className="btn btn-outline">
                About Me
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
                Hi, I'm Alex — a software developer, enthusiastic baker, dedicated dungeon master, and outdoor
                explorer. I build software because I love creating things, I bake elaborate
                cakes because I love feeding people, and I run D&amp;D campaigns because I love collaborative
                storytelling.
              </p>
              <p className="about-text">
                This site is my personal hub — a place to share recipes, log D&amp;D adventures, showcase
                software projects, and document life along the way. Pull up a chair.
              </p>
              <div className="about-stats">
                <div className="stat-item">
                  <span className="stat-number">MN</span>
                  <span className="stat-label">Explorer</span>
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

      {/* My World — Featured Apps Section */}
      <section id="my-world" className="section featured-section">
        <div className="section-container">
          <h2 className="section-title center">My World</h2>
          <div className="section-divider center"></div>
          <div className="feature-grid">
            <a href="/lexicon-dashboard" className="feature-card lexicon">
              <div className="feature-tag">Knowledge</div>
              <div className="feature-icon">📖</div>
              <h3>Lexicon</h3>
              <p>My personal knowledge base and wiki — a living library of notes, lore, and everything worth remembering.</p>
              <span className="feature-enter">Enter →</span>
            </a>
            <a href="/dnd" className="feature-card dnd">
              <div className="feature-tag">Adventure</div>
              <div className="feature-icon">🐉</div>
              <h3>D&amp;D Campaigns</h3>
              <p>Campaign worlds, homebrew lore, session logs, and maps from the tabletop adventures I dungeon master.</p>
              <span className="feature-enter">Enter →</span>
            </a>
            <a href="/pokemon" className="feature-card pokemon">
              <div className="feature-tag">Gaming</div>
              <div className="feature-icon">⚡</div>
              <h3>PokéWorld</h3>
              <p>A custom Pokémon-style game — catch Pokémon on a live map, battle, shop, and build your collection.</p>
              <span className="feature-enter">Enter →</span>
            </a>
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
              to="/lexicon-dashboard"
              title="Lexicon"
              description="My personal knowledge base — notes, lore, and everything worth remembering."
              icon="📖"
            />
            <QuickLinkCard
              to="/dnd"
              title="D&D Campaigns"
              description="Campaign worlds, maps, and adventure logs."
              icon="🐉"
            />
            <QuickLinkCard
              to="/pokemon"
              title="PokéWorld"
              description="Catch Pokémon on a live map, battle, shop, and build your collection."
              icon="⚡"
            />
            <QuickLinkCard
              to="/alchemy-dashboard"
              title="Alchemy Lab"
              description="Brew potions, manage ingredients, and track crafting progress."
              icon="⚗️"
            />
            <QuickLinkCard
              to="/holdfast"
              title="Holdfast Manager"
              description="Build your settlement, advance time, and defend against raiders."
              icon="🏰"
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
              to="https://voice.alex-dyakin.com"
              onClick={goToVoice}
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
            <a href="https://voice.alex-dyakin.com" onClick={goToVoice}>Voice Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Route voice through the SSO handoff instead of the bare public URL. On the
// website this means you arrive already logged in; in the Android app it is
// required — a plain link opens an external browser, outside the app and with
// no token, which is why voice login failed there.
const goToVoice = (e) => {
  e.preventDefault();
  navigateToVoice();
};

const QuickLinkCard = ({ to, title, description, icon, onClick }) => (
  <a href={to} className="quicklink-card" onClick={onClick}>
    <span className="quicklink-icon">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    <span className="quicklink-arrow">&rarr;</span>
  </a>
);

export default Landing;
