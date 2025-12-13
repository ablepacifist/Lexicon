import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/lexicon_room.jpg';

const MediaStream = () => {
  const { user } = useContext(UserContext);

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: '#fff',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
    maxWidth: '600px',
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
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#e74c3c' }}>Live Stream</h1>
        <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '2rem' }}>
          Streaming functionality coming soon!
        </p>
        <p style={{ fontSize: '1rem', color: '#666' }}>
          This page will keep a constant stream of video and/or audio content from all public sources.
        </p>
        <Link to="/lexicon-dashboard">
          <button
            style={backButtonStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#777')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#555')}
          >
            ← Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
};

export default MediaStream;
