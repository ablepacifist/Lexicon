import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import background from '../assets/images/lexicon_room.jpg';

const Profile = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState({});

  const lexiconApiUrl = process.env.REACT_APP_LEXICON_API_URL || 'http://localhost:8081';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch player statistics
    const fetchPlayerStats = async () => {
      try {
        const response = await fetch(`${lexiconApiUrl}/api/players/${user.id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlayerStats(data);
        }
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [user, navigate, lexiconApiUrl]);

  const handleLogout = () => {
    // Clear user context
    setUser(null);
    
    // Clear any stored session data
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    // Navigate to home
    navigate('/');
  };

  const containerStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${background})`,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: '3rem 4rem',
    borderRadius: '12px',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
    maxWidth: '600px',
    width: '100%',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
    borderBottom: '2px solid #9b59b6',
    paddingBottom: '1rem',
  };

  const infoRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid rgba(155, 89, 182, 0.3)',
    fontSize: '1.1rem',
  };

  const labelStyle = {
    color: '#9b59b6',
    fontWeight: 'bold',
  };

  const valueStyle = {
    color: '#fff',
  };

  const buttonStyle = {
    margin: '0.5rem',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '3px 3px 10px rgba(0, 0, 0, 0.6)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  const logoutButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
    color: '#fff',
    width: '100%',
    marginTop: '2rem',
  };

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#555',
    color: '#fff',
    width: '100%',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.05)',
    boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.8)',
  };

  if (!user) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#9b59b6' }}>
            Profile
          </h1>
          <p style={{ fontSize: '1rem', color: '#aaa' }}>Account Information</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading profile...</p>
          </div>
        ) : (
          <div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>Username:</span>
              <span style={valueStyle}>{user.username}</span>
            </div>

            <div style={infoRowStyle}>
              <span style={labelStyle}>User ID:</span>
              <span style={valueStyle}>{user.id}</span>
            </div>

            {playerStats?.email && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Email:</span>
                <span style={valueStyle}>{playerStats.email}</span>
              </div>
            )}

            {playerStats?.displayName && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Display Name:</span>
                <span style={valueStyle}>{playerStats.displayName}</span>
              </div>
            )}

            {playerStats?.createdAt && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Account Created:</span>
                <span style={valueStyle}>
                  {new Date(playerStats.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {playerStats?.lastLogin && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Last Login:</span>
                <span style={valueStyle}>
                  {new Date(playerStats.lastLogin).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <button
                style={{
                  ...logoutButtonStyle,
                  ...(hover.logout ? buttonHoverStyle : {}),
                }}
                onMouseEnter={() => setHover({ ...hover, logout: true })}
                onMouseLeave={() => setHover({ ...hover, logout: false })}
                onClick={handleLogout}
              >
                🚪 Logout
              </button>

              <Link to="/lexicon-dashboard">
                <button
                  style={{
                    ...backButtonStyle,
                    ...(hover.back ? buttonHoverStyle : {}),
                  }}
                  onMouseEnter={() => setHover({ ...hover, back: true })}
                  onMouseLeave={() => setHover({ ...hover, back: false })}
                >
                  ← Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
