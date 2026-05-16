import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import background from '../assets/images/lexicon_room.jpg';

const LexiconDashboard = () => {
  const { user } = useContext(UserContext);
  const [hover, setHover] = useState({});
  const { avatarUrl } = useAvatar(user?.username);

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

  const profileButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#8e44ad',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
            <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #9b59b6' }} />
            <p style={{ fontSize: '1.2rem', color: '#9b59b6', margin: 0 }}>Welcome, {user?.username}!</p>
          </div>
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
          <Link to="/audiobooks">
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#e67e22',
                color: '#fff',
                ...(hover.audiobooks ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, audiobooks: true })}
              onMouseLeave={() => setHover({ ...hover, audiobooks: false })}
            >
              📚 Audiobooks
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

          <Link to="/music-stream">
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#7c3aed',
                ...(hover.musicStream ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, musicStream: true })}
              onMouseLeave={() => setHover({ ...hover, musicStream: false })}
            >
              🎵 Music Stream
            </button>
          </Link>
          <br />
          <Link to="/video-stream">
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#e74c3c',
                ...(hover.videoStream ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, videoStream: true })}
              onMouseLeave={() => setHover({ ...hover, videoStream: false })}
            >
              🎬 Video Stream
            </button>
          </Link>
          <br />
          <Link to="/queue-manager">
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                ...(hover.queueManager ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, queueManager: true })}
              onMouseLeave={() => setHover({ ...hover, queueManager: false })}
            >
              🎵 Queue Manager
            </button>
          </Link>
          <br />
          <Link to="/profile">
            <button
              style={{
                ...profileButtonStyle,
                ...(hover.profile ? buttonHoverStyle : {}),
              }}
              onMouseEnter={() => setHover({ ...hover, profile: true })}
              onMouseLeave={() => setHover({ ...hover, profile: false })}
            >
              👤 Profile
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
