import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/lexicon_room.jpg';

const LexiconDashboard = () => {
  const { user } = useContext(UserContext);
  const [hover, setHover] = useState({});

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

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '3rem',
  };

  const cardStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
    maxWidth: '800px',
  };

  const buttonStyle = {
    margin: '1rem',
    padding: '2rem 3rem',
    fontSize: '1.3rem',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.6)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    width: '300px',
    color: '#fff',
  };

  const uploadButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#9b59b6',
  };

  const videoPlayerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3498db',
  };

  const audioPlayerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2ecc71',
  };

  const playlistButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f39c12',
  };

  const streamButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
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
    marginRight: '0.5rem',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.08)',
    boxShadow: '5px 5px 20px rgba(0, 0, 0, 0.8)',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Lexicon Media Dashboard</h1>
          <p style={{ fontSize: '1.2rem', color: '#9b59b6' }}>Welcome, {user?.username}!</p>
          <p style={{ fontSize: '1rem', color: '#aaa', marginTop: '1rem' }}>
            Choose a feature to get started
          </p>
        </div>

        <div>
          <Link to="/media-upload">
            <button
              style={{
                ...uploadButtonStyle,
                ...(hover.upload ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, upload: true })}
              onMouseLeave={() => setHover({ ...hover, upload: false })}
            >
              Upload & Download
            </button>
          </Link>
          <br />
          <Link to="/video-player">
            <button
              style={{
                ...videoPlayerButtonStyle,
                ...(hover.videoPlayer ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, videoPlayer: true })}
              onMouseLeave={() => setHover({ ...hover, videoPlayer: false })}
            >
              🎬 Video Player
            </button>
          </Link>
          <br />
          <Link to="/audio-player">
            <button
              style={{
                ...audioPlayerButtonStyle,
                ...(hover.audioPlayer ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, audioPlayer: true })}
              onMouseLeave={() => setHover({ ...hover, audioPlayer: false })}
            >
              🎵 Audio Player
            </button>
          </Link>
          <br />
          <Link to="/playlist-manager">
            <button
              style={{
                ...playlistButtonStyle,
                ...(hover.playlist ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, playlist: true })}
              onMouseLeave={() => setHover({ ...hover, playlist: false })}
            >
              📋 Playlist Manager
            </button>
          </Link>
          <br />
          <Link to="/media-stream">
            <button
              style={{
                ...streamButtonStyle,
                ...(hover.stream ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, stream: true })}
              onMouseLeave={() => setHover({ ...hover, stream: false })}
            >
              Live Stream
            </button>
          </Link>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link to="/app-selector">
            <button
              style={backButtonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#777')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#555')}
            >
              ← Back to App Selector
            </button>
          </Link>
          <Link to="/">
            <button
              style={{ ...backButtonStyle, backgroundColor: '#777' }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#999')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#777')}
            >
              🏠 Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LexiconDashboard;
