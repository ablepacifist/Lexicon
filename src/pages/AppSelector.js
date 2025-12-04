import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/background.jpg';

const AppSelector = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [hover, setHover] = useState({});

  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
    maxWidth: '700px',
  };

  const headingStyle = {
    color: '#fff',
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
    textShadow: '2px 2px 8px rgba(0, 0, 0, 0.9)',
  };

  const welcomeStyle = {
    color: '#61dafb',
    fontSize: '1.3rem',
    marginBottom: '2rem',
  };

  const buttonStyle = {
    margin: '1rem',
    padding: '1.5rem 3rem',
    fontSize: '1.3rem',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.6)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    width: '300px',
  };

  const alchemyButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#61dafb',
    color: '#000',
  };

  const lexiconButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#9b59b6',
    color: '#fff',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.08)',
    boxShadow: '5px 5px 20px rgba(0, 0, 0, 0.8)',
  };

  const backButtonStyle = {
    marginTop: '2rem',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#555',
    color: '#fff',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Choose Your App</h1>
        <p style={welcomeStyle}>Welcome back, {user.username}!</p>

        <div>
          <Link to="/alchemy-dashboard">
            <button
              style={{
                ...alchemyButtonStyle,
                ...(hover.alchemy ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, alchemy: true })}
              onMouseLeave={() => setHover({ ...hover, alchemy: false })}
            >
              Alchemy Game
            </button>
          </Link>
          <br />
          <Link to="/lexicon-dashboard">
            <button
              style={{
                ...lexiconButtonStyle,
                ...(hover.lexicon ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, lexicon: true })}
              onMouseLeave={() => setHover({ ...hover, lexicon: false })}
            >
              Lexicon Media
            </button>
          </Link>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/profile">
            <button
              style={{
                ...backButtonStyle,
                backgroundColor: '#8e44ad',
                ...(hover.profile ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, profile: true })}
              onMouseLeave={() => setHover({ ...hover, profile: false })}
            >
              👤 Profile
            </button>
          </Link>
        </div>

        <Link to="/">
          <button
            style={backButtonStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#777')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#555')}
          >
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default AppSelector;
