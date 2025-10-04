import React from 'react';
import { Link } from 'react-router-dom';
import aboutBackground from '../assets/images/profile.jpg'; // Replace with an appropriate image file name

const About = () => {
  const containerStyle = {
    backgroundImage: `url(${aboutBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    fontFamily: 'Arial, sans-serif',
    color: '#fff',
    overflowY: 'auto'
  };

  const sectionStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  };

  const headingStyle = {
    borderBottom: '1px solid #61dafb',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
  };

  const linkStyle = { color: '#61dafb', textDecoration: 'none' };

  return (
    <div style={containerStyle}>
      <Link to="/" style={linkStyle}>← Back to Home</Link>

      <div style={sectionStyle}>
        <h1 style={headingStyle}>About Alchemy</h1>
        <p>
          Alchemy is an interactive web application specially designed for Dungeons & Dragons enthusiasts.
          With this app, you can create an account using any login credentials and start your journey with a default set of magical ingredients.
          Then, you can forage for more exotic ingredients and brew powerful potions to aid you on your adventures.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>How to Get Started</h2>
        <p>
          Simply register and log in to gain immediate access to your potion inventory. Your account starts with a preloaded set of ingredients,
          and as you explore, you can gather even more ingredients to craft unique potions.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={headingStyle}>About the Developer</h2>
        <p>
          I am Alexander Dyakin, a Computer Scientist based in Winnipeg, MB. With a solid background in programming, database management, and machine learning,
          I blend technical expertise with creative problem-solving to build innovative applications.
        </p>
        <p>
          If you enjoy what you see, please consider hiring me! You can check out my detailed resume and portfolio at{" "}
          <a href="https://ablepacifist.github.io/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            my online resume
          </a>
          , or email me directly at <a href="mailto:alexpdyak32@gmail.com" style={linkStyle}>alexpdyak32@gmail.com</a>.
        </p>
      </div>
    </div>
  );
};

export default About;
