import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/background.jpg';
import icon from '../assets/images/icon.jpg';

const Home = () => {
  const { user } = useContext(UserContext);

  // Container styling with a gradient overlay
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

  // A "card" style container to hold the content
  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: '2rem 3rem',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
  };

  // Heading style
  const headingStyle = {
    color: '#fff',
    fontSize: '2.5rem',
    marginBottom: '1rem',
    textShadow: '2px 2px 5px rgba(0, 0, 0, 0.8)',
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };

  // Button style
  const buttonStyle = {
    margin: '0.5rem',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#61dafb',
    color: '#000',
    fontWeight: 'bold',
    boxShadow: '1px 1px 5px rgba(0, 0, 0, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  // Hover effect style for buttons
  const buttonHoverStyle = {
    transform: 'scale(1.05)',
    boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.6)',
  };

  // Manage hover states for individual buttons
  const [hover, setHover] = useState({});

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img
          src={icon}
          alt="Alchemy Icon"
          style={{
            width: '150px',
            marginBottom: '1rem',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
          }}
        />
        <h1 style={headingStyle}>Welcome to Alchemy!</h1>
        {user ? (
          <p style={{ color: '#fff', fontSize: '1.2rem' }}>
            Logged in as: <strong>{user.username}</strong>
          </p>
        ) : (
          <div>
            <Link to="/login">
              <button
                style={{ ...buttonStyle, ...(hover.login ? buttonHoverStyle : {}) }}
                onMouseEnter={() => setHover({ ...hover, login: true })}
                onMouseLeave={() => setHover({ ...hover, login: false })}
              >
                Login
              </button>
            </Link>
            <Link to="/register">
              <button
                style={{ ...buttonStyle, marginLeft: '1rem', ...(hover.register ? buttonHoverStyle : {}) }}
                onMouseEnter={() => setHover({ ...hover, register: true })}
                onMouseLeave={() => setHover({ ...hover, register: false })}
              >
                Register
              </button>
            </Link>
            <Link to="/about">
              <button
                style={{ ...buttonStyle, marginLeft: '1rem', ...(hover.about ? buttonHoverStyle : {}) }}
                onMouseEnter={() => setHover({ ...hover, about: true })}
                onMouseLeave={() => setHover({ ...hover, about: false })}
              >
                About
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
