import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/background.jpg';
import icon from '../assets/images/icon.jpg';

const Landing = () => {
  const { user } = useContext(UserContext);

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.7)',
    maxWidth: '600px',
  };

  const headingStyle = {
    color: '#fff',
    fontSize: '3rem',
    marginBottom: '0.5rem',
    textShadow: '2px 2px 8px rgba(0, 0, 0, 0.9)',
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };

  const subheadingStyle = {
    color: '#aaa',
    fontSize: '1.2rem',
    marginBottom: '2rem',
  };

  const buttonStyle = {
    margin: '0.75rem',
    padding: '1rem 2.5rem',
    fontSize: '1.2rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '2px 2px 10px rgba(0, 0, 0, 0.5)',
    transition: 'transform 0.2s, box-shadow 0.2s',
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

  const authButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2ecc71',
    color: '#fff',
    fontSize: '1rem',
    padding: '0.75rem 2rem',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.05)',
    boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.7)',
  };

  const [hover, setHover] = useState({});

  const sectionDividerStyle = {
    width: '100%',
    height: '1px',
    backgroundColor: '#555',
    margin: '2rem 0',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img
          src={icon}
          alt="Platform Icon"
          style={{
            width: '120px',
            marginBottom: '1rem',
            borderRadius: '50%',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.7)',
          }}
        />
        <h1 style={headingStyle}>Welcome!</h1>
        <p style={subheadingStyle}>Choose your adventure</p>

        {/* App Selection Buttons */}
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/app-selector">
            <button
              style={{ 
                ...alchemyButtonStyle, 
                ...(hover.alchemy ? buttonHoverStyle : {}) 
              }}
              onMouseEnter={() => setHover({ ...hover, alchemy: true })}
              onMouseLeave={() => setHover({ ...hover, alchemy: false })}
            >
              Alchemy Game
            </button>
          </Link>
          <br />
          <Link to="/app-selector">
            <button
              style={{ 
                ...lexiconButtonStyle, 
                ...(hover.lexicon ? buttonHoverStyle : {}) 
              }}
              onMouseEnter={() => setHover({ ...hover, lexicon: true })}
              onMouseLeave={() => setHover({ ...hover, lexicon: false })}
            >
              Lexicon Media
            </button>
          </Link>
        </div>

        <div style={sectionDividerStyle}></div>

        {/* Auth Buttons */}
        {user ? (
          <div>
            <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>
              Logged in as: <strong>{user.username}</strong>
            </p>
            <Link to="/app-selector">
              <button
                style={{ 
                  ...authButtonStyle, 
                  ...(hover.dashboard ? buttonHoverStyle : {}) 
                }}
                onMouseEnter={() => setHover({ ...hover, dashboard: true })}
                onMouseLeave={() => setHover({ ...hover, dashboard: false })}
              >
                Go to Apps
              </button>
            </Link>
          </div>
        ) : (
          <div>
            <p style={{ color: '#ccc', fontSize: '1rem', marginBottom: '1rem' }}>
              Please login to access the apps
            </p>
            <Link to="/login">
              <button
                style={{ 
                  ...authButtonStyle, 
                  ...(hover.login ? buttonHoverStyle : {}) 
                }}
                onMouseEnter={() => setHover({ ...hover, login: true })}
                onMouseLeave={() => setHover({ ...hover, login: false })}
              >
                Login
              </button>
            </Link>
            <Link to="/register">
              <button
                style={{ 
                  ...authButtonStyle,
                  backgroundColor: '#e74c3c',
                  ...(hover.register ? buttonHoverStyle : {}) 
                }}
                onMouseEnter={() => setHover({ ...hover, register: true })}
                onMouseLeave={() => setHover({ ...hover, register: false })}
              >
                Register
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
